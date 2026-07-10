import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { commandOutput, commandVersion, firstVersion } from "./shell.js";
import { exists } from "./fsutil.js";
import { parseNpmGlobal } from "./inventory.js";
import { analyzeCommonRuntimes, inspectCommonRuntimes } from "./runtime-discovery.js";

const npmNames = process.platform === "win32" ? ["npm.cmd", "npm.exe"] : ["npm"];
const nodeNames = process.platform === "win32" ? ["node.exe"] : ["node"];
const pythonNames = process.platform === "win32" ? ["python.exe", "python3.exe"] : ["python3", "python"];
const pipNames = process.platform === "win32" ? ["pip.exe", "pip3.exe"] : ["pip3", "pip"];

export async function inspectPackageManagers(dir, options = {}) {
  const [candidates, nodeCandidates, pythonCandidates, pipCandidates, commonRuntimes, project, uvPythonManager] = await Promise.all([
    findNpmCandidates(options),
    findNodeCandidates(options),
    findPythonCandidates({ ...options, projectDir: dir }),
    findPipCandidates({ ...options, projectDir: dir }),
    inspectCommonRuntimes({ ...options, projectDir: dir }),
    readProjectExpectation(dir),
    inspectUvPythonManager(options)
  ]);
  const inspected = await Promise.all(candidates.map(async (candidate, index) => {
    const version = await npmCandidateVersion(candidate.path);
    if (!version) return null;
    const [prefix, globalRoot, globalRaw] = await Promise.all([
      npmCandidateOutput(candidate.path, ["config", "get", "prefix"]),
      npmCandidateOutput(candidate.path, ["root", "-g"]),
      options.quick ? "" : npmCandidateOutput(candidate.path, ["list", "-g", "--depth=0", "--json"])
    ]);
    return {
      manager: "npm",
      version,
      path: displayPath(candidate.path, options),
      source: candidate.source,
      scope: candidate.scope,
      candidateOrder: index,
      prefix: displayPath(prefix, options),
      globalRoot: displayPath(globalRoot, options),
      globalPackages: parseNpmGlobal(globalRaw),
      packageCollection: options.quick ? "skipped-quick" : "collected"
    };
  }));
  const installations = inspected.filter(Boolean).map((item, index) => ({
    ...item,
    active: index === 0
  })).map(({ candidateOrder: _candidateOrder, ...item }) => item);
  const inspectedPythonInstallations = await inspectPythonCandidates(pythonCandidates, options);
  const pythonInstallations = attachUvManagerEvidence(inspectedPythonInstallations, uvPythonManager);
  const pipCommands = await inspectPipCandidates(pipCandidates, options);
  const nodeInstallations = await inspectNodeCandidates(nodeCandidates, options);
  const npmRuntimeLinks = linkNodeNpmRuntimes(nodeInstallations, installations);
  const pipRuntimeLinks = linkPythonPipRuntimes(pythonInstallations, pipCommands);
  const findings = [
    ...analyzeNodeInstallations(nodeInstallations, project),
    ...analyzeNpmInstallations(installations, project),
    ...analyzePythonInstallations(pythonInstallations, project),
    ...analyzePythonCommandRouting(pythonInstallations, pipCommands),
    ...analyzeRuntimeLinks(npmRuntimeLinks, pipRuntimeLinks, nodeInstallations, pythonInstallations),
    ...analyzeCommonRuntimes(commonRuntimes)
  ];
  const aiDecision = buildAiDecision({ node: nodeInstallations, npm: installations, python: pythonInstallations, project, findings, runtimeLinks: { npm: npmRuntimeLinks, pip: pipRuntimeLinks } });
  const publicPythonInstallations = pythonInstallations.map((item) => summarizePythonPackages(item, options.fullPackages));
  return {
    schemaName: "aienvmap.reconcile",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    scanMode: options.quick ? "quick" : options.fullPackages ? "full-packages" : "standard",
    scope: "project+current-user+visible-host",
    limitations: [
      "Only the current user's readable paths and visible host installations are inspected.",
      "Other users' home directories are not scanned.",
      "No runtime, package manager, prefix, lockfile, or configuration is changed."
    ],
    project,
    node: {
      installations: nodeInstallations,
      active: nodeInstallations.find((item) => item.active) || null,
      distinctVersions: [...new Set(nodeInstallations.map((item) => item.version))]
    },
    npm: {
      installations,
      active: installations.find((item) => item.active) || null,
      distinctVersions: [...new Set(installations.map((item) => item.version))],
      distinctGlobalRoots: [...new Set(installations.map((item) => item.globalRoot).filter(Boolean))],
      globalPackageComparisons: compareNpmGlobalPackages(installations),
      runtimeLinks: npmRuntimeLinks
    },
    python: {
      packageDetail: options.quick ? "not collected in quick mode; rerun without --quick or use --full-packages" : options.fullPackages ? "full" : "summary; rerun with --full-packages when package-level comparison is required",
      installations: publicPythonInstallations,
      active: publicPythonInstallations.find((item) => item.active) || null,
      distinctVersions: [...new Set(pythonInstallations.map((item) => item.version))],
      packageLocations: [...new Set(pythonInstallations.flatMap((item) => item.packageLocations || []).filter(Boolean))],
      pipCommands,
      runtimeLinks: pipRuntimeLinks,
      packageComparisons: comparePythonPackages(pythonInstallations),
      managerEvidence: uvPythonManager
    },
    otherRuntimes: commonRuntimes,
    findings,
    decision: findings.some((item) => item.severity === "review") ? "review" : "clear",
    aiDecision
  };
}

export async function inspectUvPythonManager(options = {}) {
  if (!options.fullPackages) return {
    collection: "not-requested",
    reason: "Use --full-packages for uv-managed interpreter evidence."
  };
  const command = process.platform === "win32" ? "uv.exe" : "uv";
  const [version, managedRoot, raw] = await Promise.all([
    commandVersion(command),
    commandOutput(command, ["python", "dir", "--no-config"], { timeout: 5000 }),
    commandOutput(command, ["python", "list", "--only-installed", "--managed-python", "--output-format", "json", "--no-config"], { timeout: 8000, maxBuffer: 2 * 1024 * 1024 })
  ]);
  if (!version || !managedRoot) return {
    collection: "unavailable",
    reason: "uv was not available or did not report its managed Python directory."
  };
  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    return { collection: "unsupported-or-failed", manager: "uv", version, reason: "uv did not return its managed Python JSON list." };
  }
  const installations = Array.isArray(parsed) ? parsed.slice(0, 100).map((item) => ({
    key: String(item.key || ""),
    version: String(item.version || ""),
    path: displayPath(item.path || "", options),
    implementation: String(item.implementation || ""),
    arch: String(item.arch || ""),
    os: String(item.os || "")
  })).filter((item) => item.path) : [];
  return {
    collection: "collected",
    manager: "uv",
    version,
    managedRoot: displayPath(managedRoot, options),
    installationCount: installations.length,
    installations,
    semantics: "uv --managed-python inventory; proves uv reports the interpreter as managed, but does not authorize removal."
  };
}

export function attachUvManagerEvidence(pythonInstallations = [], uv = {}) {
  return pythonInstallations.map((python) => {
    const managed = uv.collection === "collected" && (uv.installations || []).find((item) =>
      item.version === python.version && (normalizeCompare(item.path) === normalizeCompare(python.path) || pathContains(uv.managedRoot, python.path))
    );
    const inferred = python.source === "uv" || (uv.managedRoot && pathContains(uv.managedRoot, python.path));
    return {
      ...python,
      managerEvidence: managed ? {
        manager: "uv",
        managerVersion: uv.version,
        relationship: "managed-python-list-match",
        confidence: "strong",
        ownershipProven: true,
        proofScope: "uv-managed-interpreter",
        matchedKey: managed.key,
        removalAuthorized: false
      } : inferred ? {
        manager: "uv",
        managerVersion: uv.version || "",
        relationship: "managed-root-inference",
        confidence: "medium",
        ownershipProven: false,
        proofScope: "path-only",
        matchedKey: "",
        removalAuthorized: false
      } : {
        manager: "unknown",
        managerVersion: "",
        relationship: "unconfirmed",
        confidence: "none",
        ownershipProven: false,
        proofScope: "none",
        matchedKey: "",
        removalAuthorized: false
      }
    };
  });
}

export function linkNodeNpmRuntimes(nodeInstallations = [], npmInstallations = []) {
  return npmInstallations.map((npm) => {
    const colocated = nodeInstallations.find((node) => sameDirectory(node.path, npm.path));
    const active = nodeInstallations.find((node) => node.active);
    const matched = colocated || (npm.active ? active : null);
    return {
      managerPath: npm.path,
      managerVersion: npm.version,
      runtimePath: matched?.path || "",
      runtimeVersion: matched?.version || "",
      relationship: colocated ? "co-located-executables" : matched ? "path-precedence-inference" : "unresolved",
      confidence: colocated ? "strong" : matched ? "medium" : "none",
      evidence: colocated
        ? "npm and Node executables are in the same directory"
        : matched ? "active npm is paired with the active PATH-precedence Node" : "no candidate Node runtime could be linked",
      ownershipProven: false
    };
  });
}

export function linkPythonPipRuntimes(pythonInstallations = [], pipCommands = []) {
  return pipCommands.map((pip) => {
    const locationMatches = pythonInstallations.filter((python) => (python.packageLocations || []).some((location) => pathContains(location, pip.packageLocation)));
    const versionMatches = pythonInstallations.filter((python) => majorMinor(python.version) && majorMinor(python.version) === majorMinor(pip.pythonVersion));
    const matched = locationMatches.length === 1 ? locationMatches[0] : versionMatches.length === 1 ? versionMatches[0] : null;
    return {
      managerPath: pip.path,
      managerVersion: pip.version,
      runtimePath: matched?.path || "",
      runtimeVersion: matched?.version || pip.pythonVersion || "",
      relationship: locationMatches.length === 1 ? "package-location-match" : versionMatches.length === 1 ? "unique-version-match" : versionMatches.length > 1 ? "ambiguous-version-match" : "unresolved",
      confidence: locationMatches.length === 1 ? "strong" : versionMatches.length === 1 ? "medium" : "none",
      evidence: locationMatches.length === 1
        ? "pip package location is inside a package location reported by this Python"
        : versionMatches.length === 1 ? "exactly one detected Python has pip's reported major/minor version"
          : versionMatches.length > 1 ? "multiple detected Python runtimes share pip's reported major/minor version" : "no detected Python matches pip's reported version or package location",
      ownershipProven: false
    };
  });
}

export function analyzeRuntimeLinks(npmLinks = [], pipLinks = [], nodeInstallations = [], pythonInstallations = []) {
  const findings = [];
  const activeNpm = npmLinks[0];
  if (activeNpm && nodeInstallations.length > 1 && activeNpm.confidence !== "strong") findings.push({
    code: "npm-node-runtime-link-uncertain",
    severity: "review",
    message: "Active npm could not be strongly linked to one of the detected Node runtimes.",
    action: "Review npm.runtimeLinks and the runtime manager before changing Node, npm, PATH, or global packages."
  });
  const activePip = pipLinks[0];
  if (activePip && pythonInstallations.length > 1 && activePip.confidence !== "strong") findings.push({
    code: "pip-python-runtime-link-uncertain",
    severity: "review",
    message: "Active pip could not be strongly linked to one of the detected Python runtimes.",
    action: "Use the selected Python with `-m pip`; review python.runtimeLinks before changing or removing an interpreter."
  });
  return findings;
}

export async function findPipCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (file, source, scope, discovery) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: path.resolve(file), source, scope, discovery });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const name of pipNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir), "PATH");
  }
  for (const file of projectPipCandidates(options.projectDir)) await add(file, "project-venv", "project", "project-known-path");
  return found;
}

async function inspectPipCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    const raw = await commandOutput(candidate.path, ["--version"], { timeout: 5000 });
    const parsed = parsePipVersion(raw);
    return parsed ? {
      ...parsed,
      path: displayPath(candidate.path, options),
      packageLocation: displayPath(parsed.packageLocation, options),
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery
    } : null;
  }));
  return inspected.filter(Boolean).map((item, index) => ({ ...item, active: index === 0 }));
}

export function parsePipVersion(raw) {
  const match = String(raw || "").trim().match(/^pip\s+(\S+)\s+from\s+(.+?)\s+\(python\s+([^)]+)\)/i);
  return match ? { version: match[1], packageLocation: match[2], pythonVersion: match[3] } : null;
}

export function analyzePythonCommandRouting(pythonInstallations, pipCommands) {
  const python = pythonInstallations.find((item) => item.active);
  const pip = pipCommands.find((item) => item.active);
  if (!python || !pip) return [];
  const pythonMinor = majorMinor(python.version);
  const pipPythonMinor = majorMinor(pip.pythonVersion);
  if (!pythonMinor || !pipPythonMinor || pythonMinor === pipPythonMinor) return [];
  return [{
    code: "python-pip-routing-mismatch",
    severity: "review",
    message: `Active python is ${python.version}, but bare pip targets Python ${pip.pythonVersion}.`,
    action: `Use ${python.path} -m pip instead of bare pip, then review PATH ordering.`
  }];
}

export async function findNodeCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (file, source, scope, discovery) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: path.resolve(file), source, scope, discovery });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const name of nodeNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir), "PATH");
  }
  for (const root of knownNodeRoots(options.env || process.env, options.home || os.homedir())) {
    for (const file of await namedFilesBelow(root.path, root.depth, nodeNames)) await add(file, root.source, root.scope, "known-root");
  }
  return found;
}

async function inspectNodeCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    const version = await commandVersion(candidate.path);
    return version ? {
      runtime: "node",
      version,
      path: displayPath(candidate.path, options),
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery
    } : null;
  }));
  return inspected.filter(Boolean).map((item, index) => ({ ...item, active: index === 0 }));
}

export function analyzeNodeInstallations(installations, project = {}) {
  const findings = [];
  const versions = [...new Set(installations.map((item) => item.version))];
  if (installations.length > 1) findings.push({
    code: "multiple-node-installations",
    severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} Node executables were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    action: "Select the project-preferred Node runtime and its paired npm; do not remove manager-owned versions automatically."
  });
  const active = installations.find((item) => item.active);
  const expected = project.node?.versionFile;
  if (expected && active && !versionMatches(expected, active.version)) findings.push({
    code: "active-node-project-mismatch",
    severity: "review",
    message: `Project .nvmrc declares ${expected}, but active Node is ${active.version}.`,
    action: `Activate Node ${expected} with the project's runtime manager or explicitly review .nvmrc.`
  });
  return findings;
}

export async function findPythonCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (file, source, scope, discovery) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: path.resolve(file), source, scope, discovery });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const name of pythonNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir), "PATH");
  }
  for (const file of projectPythonCandidates(options.projectDir)) {
    await add(file, "project-venv", "project", "project-known-path");
  }
  for (const root of knownPythonRoots(options.env || process.env, options.home || os.homedir())) {
    for (const file of await namedFilesBelow(root.path, root.depth, pythonNames)) {
      await add(file, root.source, root.scope, "known-root");
    }
  }
  return found;
}

async function inspectPythonCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    const version = await commandVersion(candidate.path);
    if (!version) return null;
    const probe = await commandOutput(candidate.path, ["-c", "import json,site,sys;print(json.dumps({'executable':sys.executable,'prefix':sys.prefix,'basePrefix':getattr(sys,'base_prefix',sys.prefix),'packages':site.getsitepackages() if hasattr(site,'getsitepackages') else [],'userSite':site.getusersitepackages()}))"], { timeout: 5000 });
    let details = {};
    try { details = JSON.parse(probe); } catch {}
    const pipRaw = options.quick
      ? await commandOutput(candidate.path, ["-m", "pip", "--version"], { timeout: 5000 })
      : await commandOutput(candidate.path, ["-m", "pip", "list", "--format=json", "--disable-pip-version-check"], { timeout: 8000, maxBuffer: 2 * 1024 * 1024 });
    const packages = options.quick ? [] : parsePipList(pipRaw);
    const pipInspectRaw = options.fullPackages
      ? await commandOutput(candidate.path, ["-m", "pip", "inspect", "--local", "--disable-pip-version-check"], {
        timeout: 12000,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" }
      })
      : "";
    return {
      runtime: "python",
      version,
      path: displayPath(details.executable || candidate.path, options),
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery,
      prefix: displayPath(details.prefix, options),
      basePrefix: displayPath(details.basePrefix, options),
      virtualEnvironment: Boolean(details.prefix && details.basePrefix && normalizeCompare(details.prefix) !== normalizeCompare(details.basePrefix)),
      packageLocations: [...(details.packages || []), details.userSite].filter(Boolean).map((item) => displayPath(item, options)),
      packages,
      installerEvidence: options.fullPackages
        ? summarizePipInspect(pipInspectRaw, options)
        : { collection: "not-requested", reason: "Use --full-packages for installer metadata evidence." },
      packageSemantics: "packages visible to this interpreter; not proof of installation ownership",
      packageCollection: options.quick ? "skipped-quick" : "collected",
      pipAvailable: options.quick ? /^pip\s+/i.test(pipRaw) : packages.length > 0
    };
  }));
  return inspected.filter(Boolean).map((item, index) => ({ ...item, active: index === 0 }));
}

export function analyzePythonInstallations(installations, project = {}) {
  const findings = [];
  const versions = [...new Set(installations.map((item) => item.version))];
  if (installations.length > 1) findings.push({
    code: "multiple-python-installations",
    severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} Python executables were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    action: "Select a project-preferred Python runtime; preserve virtual environments and manager-owned runtimes until reviewed."
  });
  const active = installations.find((item) => item.active);
  const expected = project.python?.versionFile;
  if (expected && active && !versionMatches(expected, active.version)) findings.push({
    code: "active-python-project-mismatch",
    severity: "review",
    message: `Project .python-version declares ${expected}, but active Python is ${active.version}.`,
    action: `Activate Python ${expected} with the project's runtime manager or explicitly review the project declaration.`
  });
  if (!installations.length && project.python?.signals?.length) findings.push({
    code: "python-not-detected",
    severity: "review",
    message: `Python project signals exist (${project.python.signals.join(", ")}), but no readable Python executable was detected.`,
    action: "Review the project runtime declaration; aienvmap will not install Python automatically."
  });
  return findings;
}

export function buildAiDecision({ node = [], npm = [], python = [], project = {}, findings = [], runtimeLinks = {} }) {
  const actionCandidates = [];
  for (const item of node.filter((entry) => !entry.active)) actionCandidates.push({
    target: item.path,
    kind: "node-installation",
    recommendation: "review-candidate",
    confidence: "low",
    reasons: [`inactive Node ${item.version}`, `source=${item.source}`],
    safeNext: "Confirm its owning runtime manager and paired npm/global tools before selecting a canonical Node.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  });
  for (const item of npm.filter((entry) => !entry.active)) actionCandidates.push({
    target: item.path,
    kind: "npm-installation",
    recommendation: "review-candidate",
    confidence: "low",
    reasons: [`inactive npm ${item.version}`, `source=${item.source}`, item.packageCollection === "skipped-quick" ? "globalPackages=not-collected" : `globalPackages=${item.globalPackages?.length || 0}`],
    safeNext: "Compare its global packages and owning Node manager with the active/project-preferred toolchain.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  });
  for (const item of python.filter((entry) => !entry.active)) actionCandidates.push({
    target: item.path,
    kind: "python-installation",
    recommendation: item.virtualEnvironment ? "keep-until-project-owner-review" : "review-candidate",
    confidence: item.virtualEnvironment ? "high" : "low",
    reasons: [`inactive Python ${item.version}`, `source=${item.source}`, `virtualEnvironment=${item.virtualEnvironment}`, item.packageCollection === "skipped-quick" ? "packages=not-collected" : `packages=${item.packages?.length || item.packageCount || 0}`],
    safeNext: item.virtualEnvironment ? "Identify the owning project before any cleanup." : "Compare projects and packages before selecting a canonical runtime.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  });
  return {
    consumer: "AI agent",
    decision: findings.some((item) => item.severity === "review") ? "review" : "clear",
    readFirst: ["project", "node.active", "npm.active", "npm.runtimeLinks", "python.active", "python.runtimeLinks", "findings", "aiDecision.actionCandidates"],
    canonicalCandidates: {
      node: chooseCanonical(node, project.node?.versionFile || ""),
      npm: chooseCanonical(npm, project.packageManager?.name === "npm" ? project.packageManager.version : ""),
      python: chooseCanonical(python, project.python?.versionFile || "")
    },
    actionCandidates,
    runtimeLinkSummary: {
      npm: summarizeRuntimeLinkConfidence(runtimeLinks.npm),
      pip: summarizeRuntimeLinkConfidence(runtimeLinks.pip),
      rule: "Runtime links are routing evidence, not proof of installation ownership or permission to remove software."
    },
    pythonInstallerEvidence: summarizeInstallerEvidence(python),
    pythonManagerEvidence: summarizePythonManagerEvidence(python),
    safeCommands: {
      pythonPackageCheck: "<selected-python> -m pip list --format=json",
      pythonInstallRule: "Use <selected-python> -m pip instead of bare pip so the target interpreter is explicit.",
      npmPackageCheck: "<selected-npm> list -g --depth=0 --json",
      applyChanges: "No automatic apply command is provided; prepare a reviewed plan first."
    },
    rules: [
      "Treat active as PATH precedence, not proof that it is canonical.",
      "Treat runtimeLinks as routing evidence only; ownershipProven remains false until an external manager confirms ownership.",
      "Do not delete, uninstall, rewrite PATH, change prefixes, or remove environments automatically.",
      "A removal candidate requires project ownership checks, package comparison, a rollback plan, and explicit human approval.",
      "If package digests differ and package-level evidence is needed, rerun `aienvmap reconcile --json --full-packages` before deciding."
    ]
  };
}

function summarizeInstallerEvidence(installations = []) {
  const evidence = installations.map((item) => item.installerEvidence || { collection: "not-requested" });
  const installerCounts = {};
  for (const item of evidence) for (const [name, count] of Object.entries(item.installerCounts || {})) installerCounts[name] = (installerCounts[name] || 0) + Number(count || 0);
  return {
    collectedRuntimes: evidence.filter((item) => item.collection === "collected").length,
    notRequestedRuntimes: evidence.filter((item) => item.collection === "not-requested").length,
    failedRuntimes: evidence.filter((item) => item.collection === "unsupported-or-failed").length,
    installerCounts: Object.fromEntries(Object.entries(installerCounts).sort(([a], [b]) => a.localeCompare(b))),
    requestedPackages: evidence.reduce((sum, item) => sum + Number(item.requestedCount || 0), 0),
    editablePackages: evidence.reduce((sum, item) => sum + Number(item.editableCount || 0), 0),
    rule: "Installer evidence describes Python distributions only; it does not prove who owns or may remove the interpreter."
  };
}

function summarizePythonManagerEvidence(installations = []) {
  const evidence = installations.map((item) => item.managerEvidence || {});
  return {
    total: evidence.length,
    proven: evidence.filter((item) => item.ownershipProven === true).length,
    inferred: evidence.filter((item) => item.confidence === "medium").length,
    unconfirmed: evidence.filter((item) => item.confidence === "none" || !item.confidence).length,
    managers: [...new Set(evidence.map((item) => item.manager).filter((item) => item && item !== "unknown"))].sort(),
    removalAuthorized: false,
    rule: "Manager-native ownership evidence may identify an interpreter owner, but aienvmap never turns it into removal authorization."
  };
}

function summarizeRuntimeLinkConfidence(links = []) {
  return {
    total: links.length,
    strong: links.filter((item) => item.confidence === "strong").length,
    inferred: links.filter((item) => item.confidence === "medium").length,
    unresolved: links.filter((item) => item.confidence === "none").length
  };
}

export async function findNpmCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (file, source, scope) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: path.resolve(file), source, scope });
  };

  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const name of npmNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir));
  }

  for (const root of knownNodeRoots(options.env || process.env, options.home || os.homedir())) {
    for (const file of await npmFilesBelow(root.path, root.depth)) await add(file, root.source, root.scope);
  }
  return found;
}

export function analyzeNpmInstallations(installations, project = {}) {
  const findings = [];
  const versions = [...new Set(installations.map((item) => item.version))];
  const roots = [...new Set(installations.map((item) => item.globalRoot).filter(Boolean))];
  if (installations.length > 1) findings.push({
    code: "multiple-npm-installations",
    severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} npm executables were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    action: "Choose a project-preferred Node/npm toolchain; do not remove inactive installations automatically."
  });
  if (roots.length > 1) findings.push({
    code: "multiple-npm-global-roots",
    severity: "review",
    message: `${roots.length} npm global package roots were detected.`,
    action: "Review global tools per prefix before changing PATH or removing an installation."
  });
  if ((project.lockManagers || []).length > 1) findings.push({
    code: "mixed-project-lockfiles",
    severity: "review",
    message: `Project lockfiles for ${project.lockManagers.join(", ")} coexist.`,
    action: "Confirm the canonical package manager before regenerating or deleting any lockfile."
  });
  const expected = project.packageManager?.name === "npm" ? project.packageManager.version : "";
  const active = installations.find((item) => item.active);
  if (expected && active && !versionMatches(expected, active.version)) findings.push({
    code: "active-npm-project-mismatch",
    severity: "review",
    message: `Project declares npm@${expected}, but active npm is ${active.version}.`,
    action: `Activate a Node toolchain that provides npm ${expected}, or explicitly update package.json after review.`
  });
  if (project.packageManager?.name && project.packageManager.name !== "npm" && active) findings.push({
    code: "active-manager-differs-from-project",
    severity: "info",
    message: `Project declares ${project.packageManager.name}, while npm ${active.version} is also available.`,
    action: `Use ${project.packageManager.name} for project dependency changes unless project policy says otherwise.`
  });
  if (!installations.length) findings.push({
    code: "npm-not-detected",
    severity: project.lockManagers?.includes("npm") ? "review" : "info",
    message: "No readable npm executable was detected for the current user.",
    action: "Review the project's Node toolchain declaration; aienvmap will not install npm automatically."
  });
  return findings;
}

async function readProjectExpectation(dir) {
  let pkg = {};
  try { pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8")); } catch {}
  const packageManager = parsePackageManager(pkg.packageManager);
  const lockManagers = [];
  if (await exists(path.join(dir, "package-lock.json"))) lockManagers.push("npm");
  if (await exists(path.join(dir, "pnpm-lock.yaml"))) lockManagers.push("pnpm");
  if (await exists(path.join(dir, "yarn.lock"))) lockManagers.push("yarn");
  let pyproject = "";
  try { pyproject = await fs.readFile(path.join(dir, "pyproject.toml"), "utf8"); } catch {}
  let pythonVersion = "";
  try { pythonVersion = (await fs.readFile(path.join(dir, ".python-version"), "utf8")).trim(); } catch {}
  let nodeVersion = "";
  try { nodeVersion = (await fs.readFile(path.join(dir, ".nvmrc"), "utf8")).trim(); } catch {}
  const pythonSignals = [];
  if (pyproject) pythonSignals.push("pyproject.toml");
  if (await exists(path.join(dir, "requirements.txt"))) pythonSignals.push("requirements.txt");
  if (pythonVersion) pythonSignals.push(".python-version");
  return {
    packageManager,
    engines: compact({ node: pkg.engines?.node, npm: pkg.engines?.npm }),
    lockManagers,
    node: {
      versionFile: nodeVersion,
      signals: [nodeVersion ? ".nvmrc" : "", pkg.engines?.node ? "package.json#engines.node" : ""].filter(Boolean)
    },
    python: {
      versionFile: pythonVersion,
      requiresPython: pyproject.match(/requires-python\s*=\s*["']([^"']+)/)?.[1] || "",
      signals: pythonSignals
    }
  };
}

export function parsePackageManager(value) {
  const match = String(value || "").trim().match(/^(@?[^@]+)@(.+)$/);
  return match ? { name: match[1], version: match[2] } : null;
}

function versionMatches(expected, actual) {
  const clean = String(expected).replace(/^[=v]/, "");
  if (/^\d+(?:\.\d+){0,2}$/.test(clean)) return actual === clean || actual.startsWith(`${clean}.`);
  return true;
}

async function npmCandidateVersion(file) {
  if (process.platform !== "win32" || path.extname(file).toLowerCase() !== ".cmd") {
    return commandVersion(file);
  }
  return firstVersion(await npmCandidateOutput(file, ["--version"]));
}

async function npmCandidateOutput(file, args) {
  if (process.platform !== "win32" || path.extname(file).toLowerCase() !== ".cmd") {
    return commandOutput(file, args, { timeout: 5000 });
  }
  const siblingNode = path.join(path.dirname(file), "node.exe");
  const npmCli = path.join(path.dirname(file), "node_modules", "npm", "bin", "npm-cli.js");
  if (await exists(siblingNode) && await exists(npmCli)) {
    return commandOutput(siblingNode, [npmCli, ...args], { timeout: 5000 });
  }
  const comspec = process.env.ComSpec || "cmd.exe";
  const commandLine = `""${file.replaceAll('"', '""')}" ${args.map(quoteCmdArg).join(" ")}"`;
  return commandOutput(comspec, ["/d", "/s", "/c", commandLine], { timeout: 5000 });
}

function quoteCmdArg(value) {
  const text = String(value);
  return /^[A-Za-z0-9._@:/=-]+$/.test(text) ? text : `"${text.replaceAll('"', '""')}"`;
}

function pathEntries(value) {
  return String(value || "").split(path.delimiter).map((item) => item.trim()).filter(Boolean);
}

function knownNodeRoots(env, home) {
  const roots = [];
  if (env.NVM_HOME) roots.push({ path: env.NVM_HOME, depth: 3, source: "nvm", scope: "user" });
  if (env.NVM_SYMLINK) roots.push({ path: env.NVM_SYMLINK, depth: 1, source: "nvm", scope: "user" });
  if (process.platform === "win32") {
    roots.push({ path: path.join(home, "AppData", "Local", "Volta", "tools", "image", "node"), depth: 4, source: "volta", scope: "user" });
    roots.push({ path: path.join(home, "AppData", "Local", "mise", "installs", "node"), depth: 4, source: "mise", scope: "user" });
  } else {
    roots.push({ path: env.NVM_DIR || path.join(home, ".nvm", "versions", "node"), depth: 4, source: "nvm", scope: "user" });
    roots.push({ path: path.join(home, ".volta", "tools", "image", "node"), depth: 4, source: "volta", scope: "user" });
    roots.push({ path: path.join(home, ".local", "share", "mise", "installs", "node"), depth: 4, source: "mise", scope: "user" });
  }
  return roots;
}

function knownPythonRoots(env, home) {
  const roots = [];
  if (process.platform === "win32") {
    roots.push({ path: path.join(home, "AppData", "Local", "Programs", "Python"), depth: 3, source: "python-org", scope: "user" });
    roots.push({ path: path.join(home, ".pyenv", "pyenv-win", "versions"), depth: 4, source: "pyenv", scope: "user" });
    roots.push({ path: path.join(home, "AppData", "Local", "mise", "installs", "python"), depth: 4, source: "mise", scope: "user" });
    roots.push({ path: path.join(home, "AppData", "Roaming", "uv", "python"), depth: 5, source: "uv", scope: "user" });
  } else {
    roots.push({ path: env.PYENV_ROOT || path.join(home, ".pyenv", "versions"), depth: 4, source: "pyenv", scope: "user" });
    roots.push({ path: path.join(home, ".local", "share", "mise", "installs", "python"), depth: 4, source: "mise", scope: "user" });
    roots.push({ path: path.join(home, ".local", "share", "uv", "python"), depth: 5, source: "uv", scope: "user" });
    roots.push({ path: "/opt/homebrew/bin", depth: 1, source: "homebrew", scope: "host" });
    roots.push({ path: "/usr/local/bin", depth: 1, source: "system", scope: "host" });
    roots.push({ path: "/usr/bin", depth: 1, source: "system", scope: "host" });
    if (process.platform === "darwin") roots.push({ path: "/Library/Frameworks/Python.framework/Versions", depth: 4, source: "python-org", scope: "host" });
  }
  return roots;
}

function projectPythonCandidates(dir) {
  if (!dir) return [];
  return process.platform === "win32"
    ? [path.join(dir, ".venv", "Scripts", "python.exe"), path.join(dir, "venv", "Scripts", "python.exe")]
    : [path.join(dir, ".venv", "bin", "python"), path.join(dir, "venv", "bin", "python")];
}

function projectPipCandidates(dir) {
  if (!dir) return [];
  return process.platform === "win32"
    ? [path.join(dir, ".venv", "Scripts", "pip.exe"), path.join(dir, "venv", "Scripts", "pip.exe")]
    : [path.join(dir, ".venv", "bin", "pip"), path.join(dir, "venv", "bin", "pip")];
}

async function npmFilesBelow(root, depth) {
  if (!root || depth < 0 || !(await exists(root))) return [];
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await npmFilesBelow(full, depth - 1));
    else if (npmNames.includes(entry.name.toLowerCase())) out.push(full);
  }
  return out;
}

async function namedFilesBelow(root, depth, names) {
  if (!root || depth < 0 || !(await exists(root))) return [];
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await namedFilesBelow(full, depth - 1, names));
    else if (names.includes(entry.name.toLowerCase())) out.push(full);
  }
  return out;
}

function classifySource(value) {
  const lower = String(value).toLowerCase();
  if (lower.includes("nvm")) return "nvm";
  if (lower.includes("volta")) return "volta";
  if (lower.includes("mise")) return "mise";
  if (lower.includes("pyenv")) return "pyenv";
  if (lower.includes("uv")) return "uv";
  if (lower.includes("homebrew")) return "homebrew";
  if (lower.includes("programs\\python")) return "python-org";
  if (lower.includes("program files") || lower.startsWith("/usr/") || lower.startsWith("/opt/")) return "system";
  return "path";
}

export function parsePipList(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.slice(0, 200).map((item) => ({ name: String(item.name || ""), version: String(item.version || "unknown") })).filter((item) => item.name)
      : [];
  } catch {
    return [];
  }
}

export function summarizePipInspect(raw, options = {}) {
  let report;
  try { report = JSON.parse(String(raw || "")); } catch {
    return { collection: "unsupported-or-failed", reason: "pip inspect did not return its stable JSON report." };
  }
  if (!report || !Array.isArray(report.installed)) {
    return { collection: "unsupported-or-failed", reason: "pip inspect JSON did not contain an installed array." };
  }
  const items = report.installed.map((item) => ({
    name: String(item.metadata?.name || ""),
    version: String(item.metadata?.version || "unknown"),
    installer: String(item.installer || "unknown"),
    requested: item.requested === true,
    editable: item.direct_url?.dir_info?.editable === true,
    metadataLocation: displayPath(item.metadata_location || "", options)
  })).filter((item) => item.name).sort((a, b) => a.name.localeCompare(b.name));
  const installerCounts = {};
  for (const item of items) installerCounts[item.installer] = (installerCounts[item.installer] || 0) + 1;
  const digestLines = items.map((item) => `${item.name.toLowerCase()}@${item.version}|${item.installer}|${item.requested}|${item.editable}|${item.metadataLocation}`);
  return {
    collection: "collected",
    formatVersion: String(report.version || "unknown"),
    pipVersion: String(report.pip_version || "unknown"),
    packageCount: items.length,
    installerCounts: Object.fromEntries(Object.entries(installerCounts).sort(([a], [b]) => a.localeCompare(b))),
    requestedCount: items.filter((item) => item.requested).length,
    editableCount: items.filter((item) => item.editable).length,
    digest: createHash("sha256").update(digestLines.join("\n")).digest("hex"),
    metadataSample: items.slice(0, 12),
    semantics: "Installer metadata reported by pip inspect; it describes distributions, not ownership of the Python runtime."
  };
}

export function summarizePythonPackages(item, full) {
  const packages = item.packages || [];
  if (item.packageCollection === "skipped-quick") return {
    ...item,
    packageCount: null,
    packageDigest: "",
    packageSample: [],
    packages: undefined
  };
  const normalized = packages.map((entry) => `${entry.name.toLowerCase()}@${entry.version}`).sort();
  const summary = {
    packageCount: packages.length,
    packageDigest: createHash("sha256").update(normalized.join("\n")).digest("hex"),
    packageSample: packages.slice(0, 12)
  };
  return full ? { ...item, ...summary } : { ...item, ...summary, packages: undefined };
}

export function comparePythonPackages(installations) {
  return comparePackageCollections(installations, "packages", "path");
}

export function compareNpmGlobalPackages(installations) {
  return comparePackageCollections(installations, "globalPackages", "globalRoot");
}

function comparePackageCollections(installations, field, identityField) {
  const comparisons = [];
  for (let leftIndex = 0; leftIndex < installations.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < installations.length; rightIndex++) {
      const left = installations[leftIndex];
      const right = installations[rightIndex];
      const leftMap = new Map((left[field] || []).map((item) => [item.name.toLowerCase(), item.version]));
      const rightMap = new Map((right[field] || []).map((item) => [item.name.toLowerCase(), item.version]));
      const shared = [...leftMap.keys()].filter((name) => rightMap.has(name));
      const versionConflicts = shared.filter((name) => leftMap.get(name) !== rightMap.get(name));
      const onlyLeft = [...leftMap.keys()].filter((name) => !rightMap.has(name));
      const onlyRight = [...rightMap.keys()].filter((name) => !leftMap.has(name));
      comparisons.push({
        left: left[identityField] || left.path,
        right: right[identityField] || right.path,
        sharedCount: shared.length,
        versionConflictCount: versionConflicts.length,
        onlyLeftCount: onlyLeft.length,
        onlyRightCount: onlyRight.length,
        versionConflictSample: versionConflicts.slice(0, 10).map((name) => ({ name, left: leftMap.get(name), right: rightMap.get(name) })),
        onlyLeftSample: onlyLeft.slice(0, 10),
        onlyRightSample: onlyRight.slice(0, 10),
        interpretation: "Package comparison only; confirm runtime ownership before consolidation or removal."
      });
    }
  }
  return comparisons;
}

function chooseCanonical(installations, expected) {
  if (!installations.length) return null;
  const exact = expected ? installations.find((item) => versionMatches(expected, item.version)) : null;
  const item = exact || installations.find((entry) => entry.active) || installations[0];
  return {
    path: item.path,
    version: item.version,
    basis: exact ? "project-version-match" : item.active ? "PATH-active-fallback" : "first-readable-fallback",
    confidence: exact ? "medium" : "low",
    requiresReview: true
  };
}

function normalizeCompare(value) {
  return path.normalize(String(value || "")).toLowerCase();
}

function sameDirectory(left, right) {
  return Boolean(left && right && normalizeCompare(path.dirname(left)) === normalizeCompare(path.dirname(right)));
}

function pathContains(parent, child) {
  if (!parent || !child) return false;
  const base = normalizeCompare(parent).replace(/[\\/]+$/, "");
  const target = normalizeCompare(child);
  return target === base || target.startsWith(`${base}${path.sep}`);
}

function majorMinor(value) {
  return String(value || "").match(/(\d+)\.(\d+)/)?.slice(1).join(".") || "";
}

function classifyScope(value) {
  const home = os.homedir().toLowerCase();
  return String(value).toLowerCase().startsWith(home) ? "user" : "host";
}

function displayPath(value, options) {
  if (!value) return "";
  if (options.showPaths) return path.normalize(value);
  const home = os.homedir();
  const normalized = path.normalize(value);
  return normalized.toLowerCase().startsWith(path.normalize(home).toLowerCase())
    ? `$HOME${normalized.slice(home.length)}`
    : normalized;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item));
}
