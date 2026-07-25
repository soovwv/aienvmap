import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { commandOutput, commandVersion, commandVersionResult, firstVersion, portableCommandResult } from "./shell.js";
import { exists } from "./fsutil.js";
import { parseNpmGlobal } from "./inventory.js";
import { analyzeCommonRuntimes, analyzeJavaBuildTools, inspectCommonRuntimes } from "./runtime-discovery.js";
import { buildAiDecisionEnvelope } from "./ai-decision-envelope.js";
import { analyzeCondaRouting, analyzeNodePackageManagers, analyzePythonToolEntryPoints } from "./tool-routing.js";
import { classifyScope, classifySource, displayPath, namedFilesBelow, pathEntries } from "./path-evidence.js";
import { findCondaCandidates, findPythonToolCandidates, inspectCondaCandidates, inspectPythonToolCandidates, parseCondaEnvironmentInfo } from "./python-tool-discovery.js";
import { loadPolicy } from "./policy.js";
import { parsePackageManager, projectExpectationFindings, readProjectExpectations } from "./project-expectations.js";
import { analyzeRuntimeLinks, linkNodeNpmRuntimes, linkPythonPipRuntimes } from "./runtime-links.js";
import { compareNpmGlobalPackages, comparePythonPackages, summarizePythonPackages } from "./package-comparison.js";
import { applyIntentionalRuntimePolicy } from "./environment-decision.js";
import { analyzeNodeInstallations, analyzeNpmInstallations, analyzePythonInstallations } from "./runtime-findings.js";
import { buildAiDecision } from "./environment-assessment.js";
import {
  attachFnmManagerEvidence, attachMiseNodeEvidence, attachMisePythonEvidence, attachNvmManagerEvidence,
  attachVoltaManagerEvidence, miseInventoryForRuntime, parseFnmNodeList, parseMiseRuntimeInventory, parseVoltaNodeList
} from "./runtime-manager-evidence.js";

export { analyzeCondaRouting, analyzeNodePackageManagers, analyzePythonToolEntryPoints } from "./tool-routing.js";
export { parsePackageManager } from "./project-expectations.js";
export { analyzeRuntimeLinks, linkNodeNpmRuntimes, linkPythonPipRuntimes } from "./runtime-links.js";
export { compareNpmGlobalPackages, comparePythonPackages, summarizePythonPackages } from "./package-comparison.js";
export { findCondaCandidates, findPythonToolCandidates, inspectCondaCandidates, inspectPythonToolCandidates, parseCondaEnvironmentInfo } from "./python-tool-discovery.js";
export { applyIntentionalRuntimePolicy, buildConsolidationPlan, buildEnvironmentClarification } from "./environment-decision.js";
export { analyzeNodeInstallations, analyzeNpmInstallations, analyzePythonInstallations } from "./runtime-findings.js";
export { buildAiDecision } from "./environment-assessment.js";
export {
  attachFnmManagerEvidence, attachMiseNodeEvidence, attachMisePythonEvidence, attachNvmManagerEvidence,
  attachVoltaManagerEvidence, miseInventoryForRuntime, parseFnmNodeList, parseMiseRuntimeInventory, parseVoltaNodeList
} from "./runtime-manager-evidence.js";

const npmNames = process.platform === "win32" ? ["npm.cmd", "npm.exe"] : ["npm"];
const nodeNames = process.platform === "win32" ? ["node.exe"] : ["node"];
const pythonNames = process.platform === "win32" ? ["python.exe", "python3.exe"] : ["python3", "python"];
const pipNames = process.platform === "win32" ? ["pip.exe", "pip3.exe"] : ["pip3", "pip"];
const nodePackageManagerNames = process.platform === "win32"
  ? { pnpm: ["pnpm.cmd", "pnpm.exe"], yarn: ["yarn.cmd", "yarn.exe"], corepack: ["corepack.cmd", "corepack.exe"] }
  : { pnpm: ["pnpm"], yarn: ["yarn"], corepack: ["corepack"] };

export async function inspectPackageManagers(dir, options = {}) {
  const [candidates, nodePackageManagerCandidates, nodeCandidates, pythonCandidates, pipCandidates, pythonToolCandidates, condaCandidates, commonRuntimes, project, policy, uvPythonManager, pyenvPythonManager, voltaNodeManager, fnmNodeManager, nvmNodeManager, miseRuntimeManager] = await Promise.all([
    findNpmCandidates(options),
    findNodePackageManagerCandidates(options),
    findNodeCandidates(options),
    findPythonCandidates({ ...options, projectDir: dir }),
    findPipCandidates({ ...options, projectDir: dir }),
    findPythonToolCandidates(options),
    findCondaCandidates(options),
    inspectCommonRuntimes({ ...options, projectDir: dir }),
    readProjectExpectations(dir),
    loadPolicy(dir),
    inspectUvPythonManager(options),
    inspectPyenvPythonManager(options),
    inspectVoltaNodeManager({ ...options, projectDir: dir }),
    inspectFnmNodeManager({ ...options, projectDir: dir }),
    inspectNvmNodeManager({ ...options, projectDir: dir }),
    inspectMiseRuntimeManager({ ...options, projectDir: dir })
  ]);
  const inspected = await Promise.all(candidates.map(async (candidate, index) => {
    if (options.executeCandidates === false) return unverifiedInstallation("npm", candidate, options, index);
    const version = await npmCandidateVersion(candidate.path);
    if (!version) return failedProbeInstallation("npm", candidate, options, "version-not-recognized", {
      candidateOrder: index, prefix: "", globalRoot: "", globalPackages: [], packageCollection: "probe-failed"
    });
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
    active: options.executeCandidates === false ? false : index === 0
  })).map(({ candidateOrder: _candidateOrder, ...item }) => item);
  const alternativeManagers = await inspectNodePackageManagerCandidates(nodePackageManagerCandidates, options);
  const inspectedPythonInstallations = await inspectPythonCandidates(pythonCandidates, options);
  const pythonInstallations = attachMisePythonEvidence(attachPyenvManagerEvidence(attachUvManagerEvidence(inspectedPythonInstallations, uvPythonManager), pyenvPythonManager), miseRuntimeManager);
  const pipCommands = await inspectPipCandidates(pipCandidates, options);
  const toolEntryPoints = await inspectPythonToolCandidates(pythonToolCandidates, pipCommands, options);
  const conda = await inspectCondaCandidates(condaCandidates, options);
  const nodeInstallations = attachMiseNodeEvidence(attachNvmManagerEvidence(attachFnmManagerEvidence(attachVoltaManagerEvidence(await inspectNodeCandidates(nodeCandidates, options), voltaNodeManager), fnmNodeManager), nvmNodeManager), miseRuntimeManager);
  const npmRuntimeLinks = linkNodeNpmRuntimes(nodeInstallations, installations);
  const pipRuntimeLinks = linkPythonPipRuntimes(pythonInstallations, pipCommands);
  const findings = applyIntentionalRuntimePolicy([
    ...projectExpectationFindings(project),
    ...analyzeNodeInstallations(nodeInstallations, project),
    ...analyzeNpmInstallations(installations, project),
    ...analyzeNodePackageManagers(alternativeManagers, project),
    ...analyzePythonInstallations(pythonInstallations, project),
    ...analyzePythonCommandRouting(pythonInstallations, pipCommands),
    ...analyzePythonToolEntryPoints(pipCommands, toolEntryPoints),
    ...analyzeCondaRouting(conda, pythonInstallations, options.env || process.env),
    ...analyzeRuntimeLinks(npmRuntimeLinks, pipRuntimeLinks, nodeInstallations, pythonInstallations),
    ...analyzeCommonRuntimes(commonRuntimes),
    ...analyzeJavaBuildTools(commonRuntimes.java),
    ...unverifiedExecutableFindings({ nodeInstallations, installations, pythonInstallations, pipCommands, alternativeManagers, toolEntryPoints, conda, commonRuntimes }, options)
  ], { node: nodeInstallations, python: pythonInstallations }, policy);
  const aiDecision = buildAiDecision({ node: nodeInstallations, npm: installations, python: pythonInstallations, java: commonRuntimes.java, project, policy, findings, runtimeLinks: { npm: npmRuntimeLinks, pip: pipRuntimeLinks } });
  const aiDecisionEnvelope = buildAiDecisionEnvelope({
    decision: aiDecision.decision,
    reasonCodes: findings.map((item) => item.code),
    evidenceRefs: [".aienvmap/reconcile.json", ...(findings.length ? ["findings", "aiDecision.actionCandidates"] : [])],
    nextSafeCommand: aiDecision.decision === "review" ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json"
  });
  const publicPythonInstallations = pythonInstallations.map((item) => summarizePythonPackages(item, options.fullPackages));
  return {
    schemaName: "aienvmap.reconcile",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    mode: "read-only",
    scanMode: options.quick ? "quick" : options.fullPackages ? "full-packages" : "standard",
    scope: options.inspectedHome ? "project+explicit-user-home+visible-host" : "project+current-user+visible-host",
    limitations: [
      options.inspectedHome ? "Only bounded known roots under the explicit readable user home and visible host installations are inspected; the invoking session PATH is excluded." : "Only the current user's readable paths and visible host installations are inspected.",
      options.inspectedHome ? "User-specific environment variables from the invoking account are not attributed to the inspected home." : "Other users' home directories are not scanned.",
      options.executeCandidates === false ? "Discovered executables are not invoked; versions and runtime-derived package details remain unverified." : "Detected executables may be invoked with bounded read-only inspection arguments.",
      "No runtime, package manager, prefix, lockfile, or configuration is changed."
    ],
    project,
    node: {
      installations: nodeInstallations,
      active: nodeInstallations.find((item) => item.active) || null,
      distinctVersions: [...new Set(nodeInstallations.filter((item) => item.versionVerified !== false).map((item) => item.version))],
      managerInventories: { volta: voltaNodeManager, fnm: fnmNodeManager, nvm: nvmNodeManager, mise: miseInventoryForRuntime(miseRuntimeManager, "node") }
    },
    npm: {
      installations,
      active: installations.find((item) => item.active) || null,
      distinctVersions: [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => item.version))],
      distinctGlobalRoots: [...new Set(installations.map((item) => item.globalRoot).filter(Boolean))],
      globalPackageComparisons: compareNpmGlobalPackages(installations),
      runtimeLinks: npmRuntimeLinks,
      alternativeManagers
    },
    python: {
      packageDetail: options.quick ? "not collected in quick mode; rerun without --quick or use --full-packages" : options.fullPackages ? "full" : "summary; rerun with --full-packages when package-level comparison is required",
      installations: publicPythonInstallations,
      active: publicPythonInstallations.find((item) => item.active) || null,
      distinctVersions: [...new Set(pythonInstallations.filter((item) => item.versionVerified !== false).map((item) => item.version))],
      packageLocations: [...new Set(pythonInstallations.flatMap((item) => item.packageLocations || []).filter(Boolean))],
      pipCommands,
      toolEntryPoints,
      conda,
      runtimeLinks: pipRuntimeLinks,
      packageComparisons: comparePythonPackages(pythonInstallations),
      managerEvidence: uvPythonManager,
      managerInventories: { uv: uvPythonManager, pyenv: pyenvPythonManager, mise: miseInventoryForRuntime(miseRuntimeManager, "python") }
    },
    otherRuntimes: commonRuntimes,
    findings,
    decision: findings.some((item) => item.severity === "review") ? "review" : "clear",
    aiDecision,
    aiDecisionEnvelope
  };
}

export async function inspectNvmNodeManager(options = {}) {
  const platform = options.platform || process.platform;
  if (!options.fullPackages) return { collection: "not-requested", manager: platform === "win32" ? "nvm-windows" : "nvm", reason: "Use --full-packages for nvm-managed Node evidence." };
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  const configuredRoot = platform === "win32"
    ? env.NVM_HOME || path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "nvm")
    : env.NVM_DIR || path.join(env.XDG_CONFIG_HOME || home, env.XDG_CONFIG_HOME ? "nvm" : ".nvm");
  const versionsRoot = platform === "win32" ? configuredRoot : path.join(configuredRoot, "versions", "node");
  let canonicalRoot;
  try { canonicalRoot = await fs.realpath(versionsRoot); } catch {
    return { collection: "unavailable", manager: platform === "win32" ? "nvm-windows" : "nvm", managedRoot: displayPath(versionsRoot, options), reason: "Configured nvm versions root was not readable." };
  }
  let entries = [];
  try { entries = await fs.readdir(canonicalRoot, { withFileTypes: true }); } catch {}
  const installations = [];
  for (const entry of entries.slice(0, 500)) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const match = entry.name.match(/^v?(\d+\.\d+\.\d+)$/);
    if (!match) continue;
    const installPath = path.join(canonicalRoot, entry.name);
    const executable = platform === "win32" ? path.join(installPath, "node.exe") : path.join(installPath, "bin", "node");
    if (!(await exists(executable))) continue;
    let canonicalExecutable = "";
    try { canonicalExecutable = await fs.realpath(executable); } catch {}
    const canonicalInsideRoot = Boolean(canonicalExecutable && pathContains(canonicalRoot, canonicalExecutable));
    installations.push({ version: match[1], installPath: displayPath(installPath, options), canonicalInsideRoot });
  }
  installations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
  return {
    collection: "collected", manager: platform === "win32" ? "nvm-windows" : "nvm", managedRoot: displayPath(canonicalRoot, options),
    installationCount: Math.min(installations.length, 100), installations: installations.slice(0, 100), truncated: installations.length > 100,
    semantics: "Read-only configured-root inventory; exact canonical version paths may prove manager control, never activation or removal authorization."
  };
}

export async function inspectFnmNodeManager(options = {}) {
  if (!options.fullPackages) return {
    collection: "not-requested",
    manager: "fnm",
    reason: "Use --full-packages for fnm-managed Node evidence."
  };
  const platform = options.platform || process.platform;
  const command = options.fnmCommand || (platform === "win32" ? "fnm.exe" : "fnm");
  const versionResult = await portableCommandResult(command, ["--version"], { timeout: 3500, platform, cwd: options.projectDir });
  const managerVersion = firstVersion(`${versionResult.stdout}\n${versionResult.stderr}`);
  if (!versionResult.ok || !managerVersion) return { collection: "unavailable", manager: "fnm", reason: "fnm was not available." };
  const listResult = await portableCommandResult(command, ["list"], { timeout: 5000, maxBuffer: 1024 * 1024, platform, cwd: options.projectDir });
  if (!listResult.ok) return { collection: "unsupported-or-failed", manager: "fnm", version: managerVersion, reason: "fnm did not return its local Node inventory." };
  const all = parseFnmNodeList(listResult.stdout);
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  const fnmDir = env.FNM_DIR || defaultFnmDir(platform, env, home);
  return {
    collection: "collected",
    manager: "fnm",
    version: managerVersion,
    managedRoot: displayPath(path.join(fnmDir, "node-versions"), options),
    runtimeCount: Math.min(all.length, 100),
    runtimes: all.slice(0, 100),
    truncated: all.length > 100,
    semantics: "fnm local list plus exact version installation-path evidence; no shell activation, install, use, or uninstall command is run."
  };
}

function defaultFnmDir(platform, env, home) {
  if (platform === "win32") return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "fnm");
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "fnm");
  return path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), "fnm");
}

export async function inspectMiseRuntimeManager(options = {}) {
  if (!options.fullPackages) return {
    collection: "not-requested",
    reason: "Use --full-packages for mise-managed Node and Python evidence."
  };
  const platform = options.platform || process.platform;
  const command = options.miseCommand || (platform === "win32" ? "mise.exe" : "mise");
  const versionResult = await portableCommandResult(command, ["--version"], { timeout: 3500, platform, cwd: options.projectDir });
  const managerVersion = firstVersion(`${versionResult.stdout}\n${versionResult.stderr}`);
  if (!versionResult.ok || !managerVersion) return { collection: "unavailable", manager: "mise", reason: "mise was not available." };
  const listResult = await portableCommandResult(command, ["ls", "--installed", "--json", "node", "python"], {
    timeout: 6000, maxBuffer: 2 * 1024 * 1024, platform, cwd: options.projectDir
  });
  if (!listResult.ok) return {
    collection: "unsupported-or-failed", manager: "mise", version: managerVersion, reason: "mise did not return its installed JSON inventory."
  };
  const parsed = parseMiseRuntimeInventory(listResult.stdout, options);
  if (!parsed) return {
    collection: "unsupported-or-failed", manager: "mise", version: managerVersion, reason: "mise returned unsupported installed JSON."
  };
  return {
    collection: "collected",
    manager: "mise",
    version: managerVersion,
    runtimes: parsed.runtimes,
    runtimeCount: parsed.runtimes.length,
    truncated: parsed.truncated,
    semantics: "mise installed JSON inventory; exact version and install-path matches prove manager control, never removal authorization."
  };
}

export async function inspectVoltaNodeManager(options = {}) {
  if (!options.fullPackages) return {
    collection: "not-requested",
    reason: "Use --full-packages for Volta-managed Node evidence."
  };
  const platform = options.platform || process.platform;
  const command = options.voltaCommand || (platform === "win32" ? "volta.exe" : "volta");
  const versionResult = await portableCommandResult(command, ["--version"], { timeout: 3500, platform, cwd: options.projectDir });
  const managerVersion = firstVersion(`${versionResult.stdout}\n${versionResult.stderr}`);
  if (!versionResult.ok || !managerVersion) return { collection: "unavailable", manager: "volta", reason: "Volta was not available." };
  const listResult = await portableCommandResult(command, ["list", "--format", "plain", "node"], {
    timeout: 5000, maxBuffer: 1024 * 1024, platform, cwd: options.projectDir
  });
  if (!listResult.ok) return {
    collection: "unsupported-or-failed", manager: "volta", version: managerVersion, reason: "Volta did not return its plain Node inventory."
  };
  const parsedRuntimes = parseVoltaNodeList(listResult.stdout);
  const runtimes = parsedRuntimes.slice(0, 100);
  const home = options.home || os.homedir();
  const env = options.env || process.env;
  const voltaHome = env.VOLTA_HOME || (platform === "win32"
    ? path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "Volta")
    : path.join(home, ".volta"));
  return {
    collection: "collected",
    manager: "volta",
    version: managerVersion,
    managedRoot: displayPath(path.join(voltaHome, "tools", "image", "node"), options),
    runtimeCount: runtimes.length,
    runtimes,
    truncated: parsedRuntimes.length > 100,
    semantics: "Volta plain Node inventory; exact version plus reported executable inside the image root proves management, never removal authorization."
  };
}

export async function inspectPyenvPythonManager(options = {}) {
  if (!options.fullPackages) return {
    collection: "not-requested",
    reason: "Use --full-packages for pyenv-managed interpreter evidence."
  };
  const platform = options.platform || process.platform;
  const commands = options.pyenvCommand
    ? [options.pyenvCommand]
    : platform === "win32" ? ["pyenv.bat", "pyenv.cmd", "pyenv.exe"] : ["pyenv"];
  let command = "";
  let managerVersion = "";
  for (const candidate of commands) {
    const result = await portableCommandResult(candidate, ["--version"], { timeout: 3500, platform });
    const version = firstVersion(`${result.stdout}\n${result.stderr}`);
    if (result.ok && version) {
      command = candidate;
      managerVersion = version;
      break;
    }
  }
  if (!command) return { collection: "unavailable", manager: "pyenv", reason: "pyenv was not available." };
  const [rootResult, preferredVersionsResult] = await Promise.all([
    portableCommandResult(command, ["root"], { timeout: 3500, platform }),
    portableCommandResult(command, ["versions", "--bare", "--skip-aliases"], { timeout: 5000, maxBuffer: 1024 * 1024, platform })
  ]);
  const root = rootResult.stdout.split(/\r?\n/)[0]?.trim() || "";
  if (!rootResult.ok || !path.isAbsolute(root)) return {
    collection: "unsupported-or-failed", manager: "pyenv", version: managerVersion, reason: "pyenv did not report its root."
  };
  const versionsResult = preferredVersionsResult.ok
    ? preferredVersionsResult
    : await portableCommandResult(command, ["versions", "--bare"], { timeout: 5000, maxBuffer: 1024 * 1024, platform });
  const names = versionsResult.ok ? parsePyenvVersions(versionsResult.stdout) : [];
  const managedRoot = path.join(root, "versions");
  const installations = names.slice(0, 100).map((name) => ({
    key: name,
    prefix: displayPath(path.join(managedRoot, name), options)
  }));
  return {
    collection: versionsResult.ok ? "collected" : "unsupported-or-failed",
    manager: "pyenv",
    version: managerVersion,
    managedRoot: displayPath(managedRoot, options),
    installationCount: installations.length,
    installations,
    truncated: names.length > 100,
    semantics: "pyenv root plus local version inventory; exact prefix matches prove pyenv management, never removal authorization."
  };
}

export function parsePyenvVersions(raw) {
  return [...new Set(String(raw || "").split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*\s*/, "").replace(/\s+\(set by .+\)$/, ""))
    .filter((line) => line && line !== "system" && !/[\\/]/.test(line)))];
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

export function attachPyenvManagerEvidence(pythonInstallations = [], pyenv = {}) {
  return pythonInstallations.map((python) => {
    if (python.managerEvidence?.ownershipProven === true) return python;
    const matched = pyenv.collection === "collected" && (pyenv.installations || []).find((item) =>
      normalizeCompare(item.prefix) === normalizeCompare(python.prefix) || normalizeCompare(item.prefix) === normalizeCompare(python.basePrefix)
    );
    const inferred = python.source === "pyenv" || (pyenv.managedRoot && (pathContains(pyenv.managedRoot, python.prefix) || pathContains(pyenv.managedRoot, python.basePrefix)));
    if (!matched && !inferred) return python;
    return {
      ...python,
      managerEvidence: matched ? {
        manager: "pyenv",
        managerVersion: pyenv.version,
        relationship: "managed-prefix-list-match",
        confidence: "strong",
        ownershipProven: true,
        proofScope: "pyenv-managed-interpreter",
        matchedKey: matched.key,
        removalAuthorized: false
      } : {
        manager: "pyenv",
        managerVersion: pyenv.version || "",
        relationship: "managed-root-inference",
        confidence: "medium",
        ownershipProven: false,
        proofScope: "path-only",
        matchedKey: "",
        removalAuthorized: false
      }
    };
  });
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
    for (const name of pipNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir, options.home || os.homedir()), "PATH");
  }
  for (const file of projectPipCandidates(options.projectDir)) await add(file, "project-venv", "project", "project-known-path");
  return found;
}

async function inspectPipCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    if (options.executeCandidates === false) return { ...unverifiedInstallation("pip", candidate, options), packageLocation: "", pythonVersion: "" };
    const raw = await commandOutput(candidate.path, ["--version"], { timeout: 5000 });
    const parsed = parsePipVersion(raw);
    return parsed ? {
      ...parsed,
      path: displayPath(candidate.path, options),
      packageLocation: displayPath(parsed.packageLocation, options),
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery
    } : failedProbeInstallation("pip", candidate, options, "version-not-recognized", { packageLocation: "", pythonVersion: "" });
  }));
  return inspected.filter(Boolean).map((item, index) => ({ ...item, active: options.executeCandidates === false ? false : index === 0 }));
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
    for (const name of nodeNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir, options.home || os.homedir()), "PATH");
  }
  for (const root of knownNodeRoots(options.env || process.env, options.home || os.homedir())) {
    for (const file of await namedFilesBelow(root.path, root.depth, nodeNames)) await add(file, root.source, root.scope, "known-root");
  }
  return found;
}

export async function inspectNodeCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    if (options.executeCandidates === false) return unverifiedInstallation("node", candidate, options);
    const [versionProbe, reportedExecutable] = await Promise.all([
      commandVersionResult(candidate.path),
      commandOutput(candidate.path, ["-p", "process.execPath"], { timeout: 3500 })
    ]);
    return versionProbe.version ? {
      runtime: "node",
      version: versionProbe.version,
      path: displayPath(candidate.path, options),
      reportedExecutable: displayPath(reportedExecutable, options),
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery
    } : failedProbeInstallation("node", candidate, options, versionProbe.failure);
  }));
  return inspected.filter(Boolean).map((item, index) => ({ ...item, active: options.executeCandidates === false ? false : index === 0 }));
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
    for (const name of pythonNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir, options.home || os.homedir()), "PATH");
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

export async function inspectPythonCandidates(candidates, options) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    if (options.executeCandidates === false) return {
      ...unverifiedInstallation("python", candidate, options), prefix: "", basePrefix: "", virtualEnvironment: false,
      packageLocations: [], packages: [], installerEvidence: { collection: "not-requested", reason: "Executable invocation is disabled for explicit-home inspection." },
      packageSemantics: "not collected without executing the interpreter", packageCollection: "skipped-no-exec", pipAvailable: false
    };
    const versionProbe = await commandVersionResult(candidate.path);
    const version = versionProbe.version;
    if (!version) return failedProbeInstallation("python", candidate, options, versionProbe.failure, {
      prefix: "", basePrefix: "", virtualEnvironment: false, packageLocations: [], packages: [],
      installerEvidence: { collection: "probe-failed", reason: "Interpreter version probe failed." },
      packageSemantics: "not collected because the interpreter probe failed", packageCollection: "probe-failed", pipAvailable: false
    });
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
  return groupPythonInstallations(inspected.filter(Boolean), { executed: options.executeCandidates !== false });
}

export function groupPythonInstallations(installations = [], options = {}) {
  const groups = new Map();
  for (const item of installations) {
    const verified = item.versionVerified !== false;
    const prefix = normalizeCompare(item.prefix || "");
    const basePrefix = normalizeCompare(item.basePrefix || "");
    const key = verified && (prefix || basePrefix)
      ? [item.version || "unknown", prefix, basePrefix, item.virtualEnvironment ? "venv" : "base"].join("|")
      : `path:${normalizeCompare(item.path || "unknown")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()].map((items, index) => {
    const primary = items.find((item) => item.active) || items[0];
    const aliases = [...new Set(items.map((item) => item.path).filter((value) => value && value !== primary.path))];
    const verified = primary.versionVerified !== false;
    return {
      ...primary,
      active: options.executed === false ? false : items.some((item) => item.active) || index === 0,
      aliases,
      commandEntryPointCount: items.length,
      classification: !verified ? "needs-review" : aliases.length ? "likely-duplicate" : "confirmed",
      identityEvidence: verified && (primary.prefix || primary.basePrefix)
        ? "version and interpreter prefix"
        : verified ? "resolved executable path" : "unverified executable path"
    };
  });
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
    for (const name of npmNames) await add(path.join(dir, name), classifySource(dir), classifyScope(dir, options.home || os.homedir()));
  }

  for (const root of knownNodeRoots(options.env || process.env, options.home || os.homedir())) {
    for (const file of await npmFilesBelow(root.path, root.depth)) await add(file, root.source, root.scope);
  }
  return found;
}

export async function findNodePackageManagerCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (manager, file) => {
    if (!(await exists(file))) return;
    let key = `${manager}:${path.resolve(file).toLowerCase()}`;
    try { key = `${manager}:${(await fs.realpath(file)).toLowerCase()}`; } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    const dir = path.dirname(file);
    found.push({ manager, path: path.resolve(file), source: classifySource(dir), scope: classifyScope(dir, options.home || os.homedir()) });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const [manager, names] of Object.entries(nodePackageManagerNames)) {
      for (const name of names) await add(manager, path.join(dir, name));
    }
  }
  for (const root of knownNodeRoots(options.env || process.env, options.home || os.homedir())) {
    for (const npmFile of await npmFilesBelow(root.path, root.depth)) {
      const dir = path.dirname(npmFile);
      for (const [manager, names] of Object.entries(nodePackageManagerNames)) {
        for (const name of names) await add(manager, path.join(dir, name));
      }
    }
  }
  return found;
}

export async function inspectNodePackageManagerCandidates(candidates = [], options = {}) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    if (options.executeCandidates === false) return { ...unverifiedInstallation(candidate.manager, candidate, options), manager: candidate.manager, ownershipProven: false, removalAuthorized: false };
    const result = await portableCommandResult(candidate.path, ["--version"], { timeout: 3500, platform: options.platform || process.platform });
    const version = result.ok ? firstVersion(`${result.stdout}\n${result.stderr}`) : null;
    if (!version) return failedProbeInstallation(candidate.manager, candidate, options, "version-not-recognized", {
      manager: candidate.manager,
      ownershipProven: false,
      removalAuthorized: false
    });
    return { manager: candidate.manager, version, path: displayPath(candidate.path, options), source: candidate.source, scope: candidate.scope };
  }));
  const byManager = new Map();
  for (const item of inspected.filter(Boolean)) {
    const list = byManager.get(item.manager) || [];
    list.push({ ...item, active: options.executeCandidates === false ? false : list.length === 0 });
    byManager.set(item.manager, list);
  }
  const corepackDirs = new Set((byManager.get("corepack") || []).map((item) => path.dirname(item.path).toLowerCase()));
  return Object.fromEntries(["pnpm", "yarn", "corepack"].map((manager) => {
    const installations = (byManager.get(manager) || []).map((item) => ({
      ...item,
      deliveryEvidence: manager === "corepack" ? "corepack-command" : corepackDirs.has(path.dirname(item.path).toLowerCase()) ? "co-located-with-corepack" : "standalone-or-unknown",
      ownershipProven: false,
      removalAuthorized: false
    }));
    return [manager, { installations, active: installations[0] || null, distinctVersions: [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => item.version))] }];
  }));
}

function unverifiedInstallation(runtime, candidate, options, candidateOrder) {
  return {
    ...(runtime === "npm" ? { manager: runtime } : { runtime }),
    version: "unverified-no-exec",
    versionVerified: false,
    path: displayPath(candidate.path, options),
    source: candidate.source,
    scope: candidate.scope,
    discovery: candidate.discovery,
    ...(candidateOrder === undefined ? {} : { candidateOrder }),
    evidence: "file-presence-only"
  };
}

function failedProbeInstallation(runtime, candidate, options, reason = "execution-failed", extra = {}) {
  return {
    ...unverifiedInstallation(runtime, candidate, options),
    version: "unverified-probe-failed",
    evidence: "probe-failed",
    probe: { status: "failed", reason },
    ...extra
  };
}

function unverifiedExecutableFindings(groups, options) {
  const direct = [groups.nodeInstallations, groups.installations, groups.pythonInstallations, groups.pipCommands, groups.conda?.installations];
  const nested = [groups.alternativeManagers, groups.toolEntryPoints, groups.commonRuntimes]
    .flatMap((group) => Object.values(group || {}).flatMap((item) => item?.installations || []));
  const unverified = [...direct.flatMap((items) => items || []), ...nested].filter((item) => item.versionVerified === false);
  const failed = unverified.filter((item) => item.evidence === "probe-failed");
  if (failed.length) return [{
    code: "executable-probe-failed",
    severity: "review",
    message: `${failed.length} executable files were discovered but could not be verified; PATH routing and inventory completeness require review.`,
    action: "Inspect probe reasons and the first PATH candidate before selecting a runtime; do not promote a later verified candidate automatically."
  }];
  return unverified.length ? [{
    code: "unverified-no-exec-evidence",
    severity: "review",
    message: `${unverified.length} executable files were discovered without invocation; versions and active routing are unverified.`,
    action: "Have the owning user run a normal reconciliation or provide reviewed portable evidence before any consolidation decision."
  }] : [];
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
  const result = await portableCommandResult(file, args, { timeout: 5000, platform: "win32" });
  return result.ok ? result.stdout : "";
}

function knownNodeRoots(env, home) {
  const roots = [];
  const fnmInstalls = path.join(env.FNM_DIR || defaultFnmDir(process.platform, env, home), "node-versions");
  const miseInstalls = env.MISE_INSTALLS_DIR || (process.platform === "win32"
    ? path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "mise", "installs")
    : path.join(home, ".local", "share", "mise", "installs"));
  if (env.NVM_HOME) roots.push({ path: env.NVM_HOME, depth: 3, source: "nvm", scope: "user" });
  if (env.NVM_SYMLINK) roots.push({ path: env.NVM_SYMLINK, depth: 1, source: "nvm", scope: "user" });
  roots.push({ path: fnmInstalls, depth: 5, source: "fnm", scope: "user" });
  if (process.platform === "win32") {
    roots.push({ path: path.join(home, "AppData", "Local", "Volta", "tools", "image", "node"), depth: 4, source: "volta", scope: "user" });
    roots.push({ path: path.join(miseInstalls, "node"), depth: 4, source: "mise", scope: "user" });
  } else {
    roots.push({ path: env.NVM_DIR || path.join(home, ".nvm", "versions", "node"), depth: 4, source: "nvm", scope: "user" });
    roots.push({ path: path.join(home, ".volta", "tools", "image", "node"), depth: 4, source: "volta", scope: "user" });
    roots.push({ path: path.join(miseInstalls, "node"), depth: 4, source: "mise", scope: "user" });
  }
  return roots;
}

function knownPythonRoots(env, home) {
  const roots = [];
  const miseInstalls = env.MISE_INSTALLS_DIR || (process.platform === "win32"
    ? path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "mise", "installs")
    : path.join(home, ".local", "share", "mise", "installs"));
  if (process.platform === "win32") {
    roots.push({ path: path.join(home, "AppData", "Local", "Programs", "Python"), depth: 3, source: "python-org", scope: "user" });
    roots.push({ path: path.join(home, ".pyenv", "pyenv-win", "versions"), depth: 4, source: "pyenv", scope: "user" });
    roots.push({ path: path.join(miseInstalls, "python"), depth: 4, source: "mise", scope: "user" });
    roots.push({ path: path.join(home, "AppData", "Roaming", "uv", "python"), depth: 5, source: "uv", scope: "user" });
  } else {
    roots.push({ path: env.PYENV_ROOT || path.join(home, ".pyenv", "versions"), depth: 4, source: "pyenv", scope: "user" });
    roots.push({ path: path.join(miseInstalls, "python"), depth: 4, source: "mise", scope: "user" });
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

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item));
}
