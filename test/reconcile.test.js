import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeNodeInstallations, analyzeNpmInstallations, analyzePythonCommandRouting, analyzePythonInstallations, analyzeRuntimeLinks, attachFnmManagerEvidence, attachMiseNodeEvidence, attachMisePythonEvidence, attachNvmManagerEvidence, attachPyenvManagerEvidence, attachUvManagerEvidence, attachVoltaManagerEvidence, buildAiDecision, buildConsolidationPlan, compareNpmGlobalPackages, comparePythonPackages, findNodeCandidates, findPythonCandidates, inspectFnmNodeManager, inspectMiseRuntimeManager, inspectNvmNodeManager, inspectPyenvPythonManager, inspectVoltaNodeManager, linkNodeNpmRuntimes, linkPythonPipRuntimes, miseInventoryForRuntime, parseFnmNodeList, parseMiseRuntimeInventory, parsePackageManager, parsePipList, parsePipVersion, parsePyenvVersions, parseVoltaNodeList, summarizePipInspect, summarizePythonPackages } from "../src/package-managers.js";
import { buildPortableReconciliation, portableEvidenceFingerprint } from "../src/commands/reconcile.js";

test("parsePackageManager separates package manager and pinned version", () => {
  assert.deepEqual(parsePackageManager("npm@10.8.2"), { name: "npm", version: "10.8.2" });
  assert.deepEqual(parsePackageManager("@pnpm/exe@10.0.0"), { name: "@pnpm/exe", version: "10.0.0" });
  assert.equal(parsePackageManager(""), null);
});

test("analyzeNpmInstallations reports multiple versions and global roots", () => {
  const findings = analyzeNpmInstallations([
    { version: "11.0.0", active: true, globalRoot: "$HOME/npm-a" },
    { version: "10.8.2", active: false, globalRoot: "$HOME/npm-b" }
  ], { packageManager: { name: "npm", version: "10.8.2" }, lockManagers: ["npm"] });
  assert.deepEqual(findings.map((item) => item.code), [
    "multiple-npm-installations",
    "multiple-npm-global-roots",
    "active-npm-project-mismatch"
  ]);
  assert.ok(findings.every((item) => item.action));
});

test("analyzeNpmInstallations keeps same-version duplicates informational", () => {
  const findings = analyzeNpmInstallations([
    { version: "10.8.2", active: true, globalRoot: "/one" },
    { version: "10.8.2", active: false, globalRoot: "/one" }
  ], { packageManager: null, lockManagers: [] });
  assert.equal(findings[0].code, "multiple-npm-installations");
  assert.equal(findings[0].severity, "info");
});

test("analyzeNpmInstallations warns when npm lockfile has no visible npm", () => {
  const findings = analyzeNpmInstallations([], { packageManager: null, lockManagers: ["npm"] });
  assert.equal(findings[0].code, "npm-not-detected");
  assert.equal(findings[0].severity, "review");
});

test("analyzeNodeInstallations compares active Node with .nvmrc", () => {
  const findings = analyzeNodeInstallations([
    { version: "24.1.0", active: true },
    { version: "20.19.0", active: false }
  ], { node: { versionFile: "20" } });
  assert.deepEqual(findings.map((item) => item.code), ["multiple-node-installations", "active-node-project-mismatch"]);
});

test("Volta plain inventory parser preserves runtime state without project paths", () => {
  assert.deepEqual(parseVoltaNodeList([
    "runtime node@22.12.0 (default)",
    "runtime node@20.18.1 (current @ C:\\private\\project)",
    "runtime node@18.20.5",
    "package-manager npm@10.9.0 (default)",
    "runtime node@22.12.0 (default)"
  ].join("\n")), [
    { version: "22.12.0", state: "default" },
    { version: "20.18.1", state: "current-project" },
    { version: "18.20.5", state: "installed" }
  ]);
});

test("Volta ownership requires inventory and reported image path", () => {
  const root = path.join("home", ".volta", "tools", "image", "node");
  const inventory = { collection: "collected", version: "2.0.2", managedRoot: root, runtimes: [{ version: "22.12.0", state: "default" }] };
  const [managed, routed, inferred] = attachVoltaManagerEvidence([
    { version: "22.12.0", path: path.join("home", ".volta", "bin", "node"), reportedExecutable: path.join(root, "22.12.0", "bin", "node"), source: "volta" },
    { version: "22.12.0", path: path.join("home", ".volta", "bin", "node"), reportedExecutable: "", source: "volta" },
    { version: "20.18.1", path: path.join(root, "20.18.1", "bin", "node"), reportedExecutable: "", source: "volta" }
  ], inventory);
  assert.equal(managed.managerEvidence.relationship, "inventory-and-image-path-match");
  assert.equal(managed.managerEvidence.ownershipProven, true);
  assert.equal(managed.managerEvidence.removalAuthorized, false);
  assert.equal(routed.managerEvidence.relationship, "inventory-version-match");
  assert.equal(routed.managerEvidence.ownershipProven, false);
  assert.equal(inferred.managerEvidence.relationship, "managed-root-inference");
  assert.equal(inferred.managerEvidence.ownershipProven, false);
});

test("fnm list parser keeps installed versions and bounded aliases", () => {
  assert.deepEqual(parseFnmNodeList("* v22.14.0 default\n  v20.18.1 lts-iron\n* system\nnoise"), [
    { version: "22.14.0", state: "default", aliases: [] },
    { version: "20.18.1", state: "installed", aliases: ["lts-iron"] }
  ]);
});

test("fnm ownership requires list and exact version installation path", () => {
  const inventory = { collection: "collected", manager: "fnm", version: "1.38.1", managedRoot: "/home/me/.local/share/fnm/node-versions", runtimes: [{ version: "22.14.0" }] };
  const [managed, routed, unrelated] = attachFnmManagerEvidence([
    { version: "22.14.0", path: "/home/me/.local/share/fnm/node-versions/v22.14.0/installation/bin/node", reportedExecutable: "/home/me/.local/share/fnm/node-versions/v22.14.0/installation/bin/node", managerEvidence: { confidence: "none", ownershipProven: false } },
    { version: "22.14.0", path: "/usr/bin/node", reportedExecutable: "/usr/bin/node", source: "fnm", managerEvidence: { confidence: "none", ownershipProven: false } },
    { version: "20.18.1", path: "/usr/bin/node", reportedExecutable: "/usr/bin/node", managerEvidence: { confidence: "none", ownershipProven: false } }
  ], inventory);
  assert.equal(managed.managerEvidence.ownershipProven, true);
  assert.equal(managed.managerEvidence.relationship, "list-and-version-path-match");
  assert.equal(managed.managerEvidence.removalAuthorized, false);
  assert.equal(routed.managerEvidence.ownershipProven, false);
  assert.equal(routed.managerEvidence.confidence, "medium");
  assert.equal(unrelated.managerEvidence.manager, undefined);
});

test("Windows fnm inventory is collected with read-only commands", { skip: process.platform !== "win32" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-fnm-"));
  const command = path.join(dir, "fnm.cmd");
  await fs.writeFile(command, "@echo off\r\nif \"%1\"==\"--version\" echo fnm 1.38.1\r\nif \"%1\"==\"list\" echo * v22.14.0 default\r\n", "utf8");
  try {
    const result = await inspectFnmNodeManager({ fullPackages: true, fnmCommand: command, platform: "win32", home: dir, env: {}, showPaths: true, projectDir: dir });
    assert.equal(result.collection, "collected");
    assert.equal(result.runtimeCount, 1);
    assert.equal(result.runtimes[0].version, "22.14.0");
    assert.match(result.managedRoot, /AppData[\\/]Roaming[\\/]fnm[\\/]node-versions$/);
    assert.match(result.semantics, /no shell activation, install, use, or uninstall/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("Node discovery includes inactive fnm installation paths", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-fnm-root-"));
  const binary = path.join(dir, "node-versions", "v22.14.0", "installation", process.platform === "win32" ? "node.exe" : "bin/node");
  await fs.mkdir(path.dirname(binary), { recursive: true });
  await fs.writeFile(binary, "");
  try {
    const candidates = await findNodeCandidates({ env: { FNM_DIR: dir }, home: dir, pathValue: "" });
    assert.equal(candidates.some((item) => item.path === path.resolve(binary) && item.source === "fnm" && item.discovery === "known-root"), true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("nvm filesystem inventory finds bounded canonical installations", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-nvm-root-"));
  const executable = path.join(dir, "versions", "node", "v20.18.1", "bin", "node");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "");
  try {
    const result = await inspectNvmNodeManager({ fullPackages: true, platform: "linux", env: { NVM_DIR: dir }, home: dir, showPaths: true });
    assert.equal(result.collection, "collected");
    assert.equal(result.manager, "nvm");
    assert.equal(result.installationCount, 1);
    assert.deepEqual(result.installations[0], { version: "20.18.1", installPath: await fs.realpath(path.dirname(path.dirname(executable))), canonicalInsideRoot: true });
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("nvm-windows filesystem inventory reads NVM_HOME without switching symlinks", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-nvm-win-"));
  const executable = path.join(dir, "v22.14.0", "node.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "");
  try {
    const result = await inspectNvmNodeManager({ fullPackages: true, platform: "win32", env: { NVM_HOME: dir }, home: dir, showPaths: true });
    assert.equal(result.manager, "nvm-windows");
    assert.equal(result.installations[0].version, "22.14.0");
    assert.equal(result.installations[0].canonicalInsideRoot, true);
    assert.match(result.semantics, /never activation or removal/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("nvm ownership requires canonical configured-root and version path", () => {
  const root = path.join("home", ".nvm", "versions", "node");
  const installPath = path.join(root, "v20.18.1");
  const inventory = { collection: "collected", manager: "nvm", managedRoot: root, installations: [{ version: "20.18.1", installPath, canonicalInsideRoot: true }] };
  const [managed, inferred] = attachNvmManagerEvidence([
    { version: "20.18.1", path: path.join(installPath, "bin", "node"), reportedExecutable: path.join(installPath, "bin", "node"), managerEvidence: { confidence: "none", ownershipProven: false } },
    { version: "20.18.1", path: "/usr/bin/node", reportedExecutable: "/usr/bin/node", source: "nvm", managerEvidence: { confidence: "none", ownershipProven: false } }
  ], inventory);
  assert.equal(managed.managerEvidence.relationship, "configured-root-version-path-match");
  assert.equal(managed.managerEvidence.ownershipProven, true);
  assert.equal(managed.managerEvidence.removalAuthorized, false);
  assert.equal(inferred.managerEvidence.ownershipProven, false);
});

test("nvm external version symlink never proves ownership", { skip: process.platform === "win32" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-nvm-link-"));
  const external = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-nvm-external-"));
  const versions = path.join(dir, "versions", "node");
  const executable = path.join(external, "bin", "node");
  await fs.mkdir(versions, { recursive: true });
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "");
  await fs.symlink(external, path.join(versions, "v20.18.1"), "dir");
  try {
    const inventory = await inspectNvmNodeManager({ fullPackages: true, platform: "linux", env: { NVM_DIR: dir }, home: dir, showPaths: true });
    assert.equal(inventory.installations[0].canonicalInsideRoot, false);
    const [node] = attachNvmManagerEvidence([{ version: "20.18.1", path: executable, reportedExecutable: executable, source: "nvm", managerEvidence: { confidence: "none", ownershipProven: false } }], inventory);
    assert.equal(node.managerEvidence.ownershipProven, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(external, { recursive: true, force: true });
  }
});

test("Windows Volta plain inventory is collected read-only", { skip: process.platform !== "win32" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap volta "));
  try {
    const command = path.join(dir, "volta.cmd");
    await fs.writeFile(command, [
      "@echo off",
      "if \"%1\"==\"--version\" echo 2.0.2",
      "if \"%1\"==\"list\" echo runtime node@22.12.0 (default)"
    ].join("\r\n"));
    const result = await inspectVoltaNodeManager({ fullPackages: true, voltaCommand: command, platform: "win32", home: dir, env: {}, showPaths: true, projectDir: dir });
    assert.equal(result.collection, "collected");
    assert.equal(result.version, "2.0.2");
    assert.deepEqual(result.runtimes, [{ version: "22.12.0", state: "default" }]);
    assert.equal(result.runtimeCount, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("mise JSON parser keeps Node and Python install facts without source paths", () => {
  const raw = JSON.stringify({
    node: [{ version: "22.12.0", install_path: "/home/test/.local/share/mise/installs/node/22.12.0", source: { type: "mise.toml", path: "/private/project/mise.toml" } }],
    python: [{ version: "3.12.4", install_path: "/home/test/.local/share/mise/installs/python/3.12.4" }],
    java: [{ version: "21", install_path: "/ignored/java" }]
  });
  assert.deepEqual(parseMiseRuntimeInventory(raw, { showPaths: true }), {
    runtimes: [
      { runtime: "node", version: "22.12.0", installPath: path.normalize("/home/test/.local/share/mise/installs/node/22.12.0"), configured: true, sourceType: "mise.toml" },
      { runtime: "python", version: "3.12.4", installPath: path.normalize("/home/test/.local/share/mise/installs/python/3.12.4"), configured: false, sourceType: "" }
    ],
    truncated: false
  });
  assert.equal(JSON.stringify(parseMiseRuntimeInventory(raw, { showPaths: true })).includes("/private/project"), false);
});

test("mise exact install paths prove Node and Python control", () => {
  const nodeRoot = path.join("home", "mise", "node", "22.12.0");
  const pythonRoot = path.join("home", "mise", "python", "3.12.4");
  const inventory = { collection: "collected", version: "2026.7.1", runtimes: [
    { runtime: "node", version: "22.12.0", installPath: nodeRoot },
    { runtime: "python", version: "3.12.4", installPath: pythonRoot }
  ] };
  const [node] = attachMiseNodeEvidence([{ version: "22.12.0", reportedExecutable: path.join(nodeRoot, "bin", "node"), source: "mise", managerEvidence: { ownershipProven: false } }], inventory);
  const [python] = attachMisePythonEvidence([{ version: "3.12.4", prefix: pythonRoot, basePrefix: pythonRoot, source: "mise", managerEvidence: { ownershipProven: false } }], inventory);
  assert.equal(node.managerEvidence.relationship, "installed-json-path-match");
  assert.equal(node.managerEvidence.ownershipProven, true);
  assert.equal(node.managerEvidence.matchedKey, "node@22.12.0");
  assert.equal(python.managerEvidence.relationship, "installed-json-path-match");
  assert.equal(python.managerEvidence.ownershipProven, true);
  assert.equal(python.managerEvidence.removalAuthorized, false);
});

test("mise inventory projection keeps runtime sections independent", () => {
  const inventory = { collection: "collected", runtimes: [
    { runtime: "node", version: "22" },
    { runtime: "python", version: "3.12" }
  ], runtimeCount: 2 };
  assert.deepEqual(miseInventoryForRuntime(inventory, "node").runtimes, [{ runtime: "node", version: "22" }]);
  assert.equal(miseInventoryForRuntime(inventory, "node").runtimeCount, 1);
  assert.deepEqual(miseInventoryForRuntime(inventory, "python").runtimes, [{ runtime: "python", version: "3.12" }]);
});

test("mise does not replace existing strong manager evidence", () => {
  const node = { managerEvidence: { manager: "volta", ownershipProven: true } };
  const python = { managerEvidence: { manager: "uv", ownershipProven: true } };
  assert.equal(attachMiseNodeEvidence([node], { collection: "collected", runtimes: [] })[0].managerEvidence.manager, "volta");
  assert.equal(attachMisePythonEvidence([python], { collection: "collected", runtimes: [] })[0].managerEvidence.manager, "uv");
});

test("Windows mise JSON inventory is collected read-only", { skip: process.platform !== "win32" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap mise "));
  try {
    const command = path.join(dir, "mise.cmd");
    const installPath = path.join(dir, "installs", "node", "22.12.0");
    const json = JSON.stringify({ node: [{ version: "22.12.0", install_path: installPath }], python: [] });
    await fs.writeFile(command, [
      "@echo off",
      "if \"%1\"==\"--version\" echo mise 2026.7.1",
      `if \"%1\"==\"ls\" echo ${json}`
    ].join("\r\n"));
    const result = await inspectMiseRuntimeManager({ fullPackages: true, miseCommand: command, platform: "win32", showPaths: true, projectDir: dir });
    assert.equal(result.collection, "collected");
    assert.equal(result.version, "2026.7.1");
    assert.equal(result.runtimeCount, 1);
    assert.equal(result.runtimes[0].installPath, installPath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("parsePipList normalizes Python package inventories", () => {
  assert.deepEqual(parsePipList('[{"name":"pip","version":"25.1"},{"name":"ruff","version":"0.9.1"}]'), [
    { name: "pip", version: "25.1" },
    { name: "ruff", version: "0.9.1" }
  ]);
  assert.deepEqual(parsePipList("not-json"), []);
});

test("pip inspect summary keeps installer evidence compact and redacted", () => {
  const raw = JSON.stringify({
    version: "1",
    pip_version: "26.0.1",
    installed: [
      { metadata: { name: "pip", version: "26.0.1" }, metadata_location: path.join(os.homedir(), "venv", "pip.dist-info"), installer: "pip", requested: true },
      { metadata: { name: "demo", version: "1.0" }, metadata_location: path.join(os.homedir(), "venv", "demo.dist-info"), installer: "uv", requested: false, direct_url: { dir_info: { editable: true } } }
    ]
  });
  const summary = summarizePipInspect(raw);
  assert.equal(summary.collection, "collected");
  assert.equal(summary.formatVersion, "1");
  assert.equal(summary.packageCount, 2);
  assert.deepEqual(summary.installerCounts, { pip: 1, uv: 1 });
  assert.equal(summary.requestedCount, 1);
  assert.equal(summary.editableCount, 1);
  assert.equal(summary.digest.length, 64);
  assert.ok(summary.metadataSample.every((item) => item.metadataLocation.startsWith("$HOME")));
  assert.equal(summary.metadataSample.some((item) => item.name === "demo" && item.editable), true);
  assert.match(summary.semantics, /not ownership of the Python runtime/);
});

test("pip inspect summary reports unsupported output without guessing", () => {
  assert.deepEqual(summarizePipInspect("not-json"), {
    collection: "unsupported-or-failed",
    reason: "pip inspect did not return its stable JSON report."
  });
});

test("parsePipVersion links a pip entry point to its Python version", () => {
  assert.deepEqual(parsePipVersion("pip 25.1 from /opt/python/lib/site-packages/pip (python 3.12)"), {
    version: "25.1",
    packageLocation: "/opt/python/lib/site-packages/pip",
    pythonVersion: "3.12"
  });
});

test("Python command routing warns when bare pip targets another interpreter", () => {
  const findings = analyzePythonCommandRouting(
    [{ version: "3.11.9", active: true, path: "/python311" }],
    [{ version: "25.1", pythonVersion: "3.12", active: true, path: "/pip" }]
  );
  assert.equal(findings[0].code, "python-pip-routing-mismatch");
  assert.match(findings[0].action, /-m pip/);
});

test("Node/npm runtime links distinguish co-location from PATH inference", () => {
  const links = linkNodeNpmRuntimes([
    { path: path.join("tools", "node24", "node"), version: "24.1.0", active: true },
    { path: path.join("tools", "node20", "node"), version: "20.19.0", active: false }
  ], [
    { path: path.join("tools", "node20", "npm"), version: "10.8.2", active: false },
    { path: path.join("other", "npm"), version: "11.0.0", active: true }
  ]);
  assert.equal(links[0].runtimeVersion, "20.19.0");
  assert.equal(links[0].relationship, "co-located-executables");
  assert.equal(links[0].confidence, "strong");
  assert.equal(links[0].ownershipProven, false);
  assert.equal(links[1].runtimeVersion, "24.1.0");
  assert.equal(links[1].relationship, "path-precedence-inference");
  assert.equal(links[1].confidence, "medium");
});

test("Python/pip runtime links prefer package-location evidence and expose ambiguity", () => {
  const py312Packages = path.join("opt", "python312", "lib", "site-packages");
  const links = linkPythonPipRuntimes([
    { path: path.join("opt", "python312", "python"), version: "3.12.1", packageLocations: [py312Packages] },
    { path: path.join("other", "python312", "python"), version: "3.12.2", packageLocations: [path.join("other", "site-packages")] }
  ], [
    { path: path.join("opt", "python312", "pip"), version: "25.1", pythonVersion: "3.12", packageLocation: path.join(py312Packages, "pip") },
    { path: path.join("unknown", "pip"), version: "25.1", pythonVersion: "3.12", packageLocation: path.join("unknown", "site-packages", "pip") }
  ]);
  assert.equal(links[0].relationship, "package-location-match");
  assert.equal(links[0].confidence, "strong");
  assert.equal(links[1].relationship, "ambiguous-version-match");
  assert.equal(links[1].confidence, "none");
});

test("uv manager evidence proves only managed-list matches and never authorizes removal", () => {
  const managedRoot = path.join("home", "uv", "python");
  const installations = attachUvManagerEvidence([
    { path: path.join(managedRoot, "cpython-3.12", "python"), version: "3.12.13", source: "uv" },
    { path: path.join("usr", "bin", "python"), version: "3.11.0", source: "system" }
  ], {
    collection: "collected",
    version: "0.11.13",
    managedRoot,
    installations: [{ key: "cpython-3.12.13", version: "3.12.13", path: path.join(managedRoot, "cpython-3.12", "python") }]
  });
  assert.equal(installations[0].managerEvidence.relationship, "managed-python-list-match");
  assert.equal(installations[0].managerEvidence.ownershipProven, true);
  assert.equal(installations[0].managerEvidence.proofScope, "uv-managed-interpreter");
  assert.equal(installations[0].managerEvidence.removalAuthorized, false);
  assert.equal(installations[1].managerEvidence.relationship, "unconfirmed");
  assert.equal(installations[1].managerEvidence.ownershipProven, false);
});

test("uv known-root evidence remains an inference when deep collection was not requested", () => {
  const [python] = attachUvManagerEvidence([{ path: path.join("home", "uv", "python", "cpython", "python"), version: "3.12", source: "uv" }], { collection: "not-requested" });
  assert.equal(python.managerEvidence.relationship, "managed-root-inference");
  assert.equal(python.managerEvidence.confidence, "medium");
  assert.equal(python.managerEvidence.ownershipProven, false);
});

test("pyenv inventory parser keeps bounded version keys only", () => {
  assert.deepEqual(parsePyenvVersions("system\n* 3.12.4 (set by /repo/.python-version)\n3.11.9\n3.12.4\n3.12/envs/app\n"), ["3.12.4", "3.11.9"]);
});

test("pyenv exact prefix evidence proves management without removal permission", () => {
  const root = path.join("home", ".pyenv", "versions");
  const inventory = {
    collection: "collected",
    manager: "pyenv",
    version: "2.5.3",
    managedRoot: root,
    installations: [{ key: "3.12.4", prefix: path.join(root, "3.12.4") }]
  };
  const [managed, inferred] = attachPyenvManagerEvidence([
    { path: path.join(root, "3.12.4", "bin", "python"), prefix: path.join(root, "3.12.4"), basePrefix: path.join(root, "3.12.4"), source: "pyenv", managerEvidence: { ownershipProven: false } },
    { path: path.join(root, "3.11.9", "bin", "python"), prefix: path.join(root, "3.11.9"), basePrefix: path.join(root, "3.11.9"), source: "pyenv", managerEvidence: { ownershipProven: false } }
  ], inventory);
  assert.equal(managed.managerEvidence.relationship, "managed-prefix-list-match");
  assert.equal(managed.managerEvidence.ownershipProven, true);
  assert.equal(managed.managerEvidence.matchedKey, "3.12.4");
  assert.equal(managed.managerEvidence.removalAuthorized, false);
  assert.equal(inferred.managerEvidence.relationship, "managed-root-inference");
  assert.equal(inferred.managerEvidence.ownershipProven, false);
});

test("pyenv evidence does not replace stronger uv ownership proof", () => {
  const python = { prefix: "/pyenv/3.12", managerEvidence: { manager: "uv", ownershipProven: true, confidence: "strong" } };
  assert.equal(attachPyenvManagerEvidence([python], { collection: "collected", installations: [{ key: "3.12", prefix: "/pyenv/3.12" }] })[0].managerEvidence.manager, "uv");
});

test("Windows pyenv batch inventory is collected read-only", { skip: process.platform !== "win32" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap pyenv "));
  try {
    const command = path.join(dir, "pyenv.bat");
    await fs.writeFile(command, [
      "@echo off",
      "if \"%1\"==\"--version\" echo pyenv 3.1.1",
      `if \"%1\"==\"root\" echo ${dir}`,
      "if \"%1\"==\"versions\" echo 3.12.4"
    ].join("\r\n"));
    const result = await inspectPyenvPythonManager({ fullPackages: true, pyenvCommand: command, platform: "win32", showPaths: true });
    assert.equal(result.collection, "collected");
    assert.equal(result.version, "3.1.1");
    assert.equal(result.installationCount, 1);
    assert.equal(result.installations[0].key, "3.12.4");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("uncertain active runtime links create review findings only with multiple runtimes", () => {
  const findings = analyzeRuntimeLinks(
    [{ confidence: "medium" }],
    [{ confidence: "none" }],
    [{}, {}],
    [{}, {}]
  );
  assert.deepEqual(findings.map((item) => item.code), ["npm-node-runtime-link-uncertain", "pip-python-runtime-link-uncertain"]);
  assert.ok(findings.every((item) => item.severity === "review"));
});

test("Python package summaries are compact unless full evidence is requested", () => {
  const item = { packages: [{ name: "ruff", version: "0.9.1" }, { name: "pip", version: "25.1" }] };
  const compact = summarizePythonPackages(item, false);
  const full = summarizePythonPackages(item, true);
  assert.equal(compact.packageCount, 2);
  assert.equal(compact.packages, undefined);
  assert.equal(compact.packageDigest.length, 64);
  assert.equal(full.packages.length, 2);
});

test("Python package comparisons expose overlap without dumping full inventories", () => {
  const comparisons = comparePythonPackages([
    { path: "/py311", packages: [{ name: "pip", version: "25" }, { name: "ruff", version: "1" }] },
    { path: "/py312", packages: [{ name: "pip", version: "26" }, { name: "pytest", version: "9" }] }
  ]);
  assert.equal(comparisons[0].sharedCount, 1);
  assert.equal(comparisons[0].versionConflictCount, 1);
  assert.equal(comparisons[0].onlyLeftCount, 1);
  assert.equal(comparisons[0].onlyRightCount, 1);
  assert.deepEqual(comparisons[0].onlyLeftSample, ["ruff"]);
});

test("npm global package comparisons show tools unique to each prefix", () => {
  const comparisons = compareNpmGlobalPackages([
    { globalRoot: "/npm-a", globalPackages: [{ name: "typescript", version: "5" }] },
    { globalRoot: "/npm-b", globalPackages: [{ name: "pnpm", version: "10" }] }
  ]);
  assert.deepEqual(comparisons[0].onlyLeftSample, ["typescript"]);
  assert.deepEqual(comparisons[0].onlyRightSample, ["pnpm"]);
});

test("Python discovery includes a project venv even when it is outside PATH", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-python-venv-"));
  const rel = process.platform === "win32" ? path.join(".venv", "Scripts", "python.exe") : path.join(".venv", "bin", "python");
  await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
  await fs.writeFile(path.join(dir, rel), "", "utf8");
  const found = await findPythonCandidates({ projectDir: dir, pathValue: "", env: {}, home: dir });
  assert.equal(found.some((item) => item.source === "project-venv" && item.scope === "project"), true);
});

test("analyzePythonInstallations compares active Python with project version", () => {
  const findings = analyzePythonInstallations([
    { version: "3.13.1", active: true },
    { version: "3.11.9", active: false }
  ], { python: { versionFile: "3.11", signals: [".python-version"] } });
  assert.deepEqual(findings.map((item) => item.code), ["multiple-python-installations", "active-python-project-mismatch"]);
});

test("AI decisions keep inactive virtual environments and require approval", () => {
  const result = buildAiDecision({
    npm: [],
    python: [
      { path: "/active/python", version: "3.12.1", active: true, virtualEnvironment: false, packages: [] },
      { path: "/project/.venv/python", version: "3.12.1", active: false, virtualEnvironment: true, source: "path", packages: [{ name: "django", version: "5" }] }
    ],
    project: { python: { versionFile: "3.12" } },
    findings: []
  });
  assert.equal(result.actionCandidates[0].recommendation, "keep-until-project-owner-review");
  assert.equal(result.actionCandidates[0].requiresHumanApprovalBeforeRemoval, true);
  assert.equal(result.actionCandidates[0].destructive, false);
  assert.match(result.rules.join(" "), /Do not delete/);
  assert.match(result.rules.join(" "), /routing evidence only/);
  assert.equal(result.consolidationPlan.mode, "proposal-only");
  assert.equal(result.consolidationPlan.applyCommand, null);
  assert.equal(result.consolidationPlan.removalAuthorized, false);
  assert.equal(result.consolidationPlan.candidates[0].requiresHumanApproval, true);
  assert.match(result.consolidationPlan.rule, /never authorizes or executes/);
});

test("consolidation plan is evidence-only and has explicit stop conditions", () => {
  const result = buildConsolidationPlan({
    actionCandidates: [{ target: "/old/node", kind: "node-installation", recommendation: "review-candidate", confidence: "low" }],
    canonicalCandidates: { node: { path: "/active/node", version: "22" } }
  });
  assert.equal(result.status, "review");
  assert.deepEqual(result.phases.map((item) => item.effect), ["read-only", "read-only", "read-only", "human-gate"]);
  assert.ok(result.candidates[0].stopWhen.includes("ownership is unconfirmed"));
  assert.ok(result.requiresHumanApprovalBefore.includes("PATH-edit"));
  assert.equal(result.environmentChangesAuthorized, false);
});

test("consolidation plan stays clear when no inactive installation exists", () => {
  const result = buildConsolidationPlan();
  assert.equal(result.status, "no-candidates");
  assert.deepEqual(result.candidates, []);
  assert.equal(result.nextSafeCommand, "aienvmap status --json");
});

test("portable reconciliation keeps diagnostic facts and strips local identifiers", () => {
  const result = buildPortableReconciliation({
    generatedAt: "2026-07-12T01:02:03Z",
    project: { name: "secret-project", path: "C:/Users/alice/secret", packageManager: { name: "npm", version: "10" }, lockManagers: ["npm"], node: { versionFile: "22" }, python: { versionFile: "3.12" } },
    node: { distinctVersions: ["22.1.0", "20.9.0"], installations: [{ version: "22.1.0", active: true, path: "C:/Users/alice/node.exe", source: "path", scope: "user", managerEvidence: { manager: "fnm", relationship: "inventory-version-match", confidence: "medium" } }] },
    npm: { distinctVersions: ["10"], installations: [{ version: "10", active: true, path: "C:/secret/npm.cmd", globalPackages: [{ name: "private-tool", version: "1" }] }] },
    python: { distinctVersions: ["3.12"], installations: [{ version: "3.12", path: "C:/Users/alice/python.exe", virtualEnvironment: true, packages: [{ name: "private-package" }], packageDigest: "secret-digest" }] },
    otherRuntimes: { java: { installations: [{ version: "21", path: "C:/Users/alice/jdk/bin/java.exe", vendor: "Temurin", architecture: "x64", runtimeKind: "jdk", hasCompiler: true }] } },
    findings: [{ code: "multiple-node-installations", severity: "review", message: "secret path" }],
    decision: "review",
    aiDecision: { consolidationPlan: { status: "review", candidates: [{ kind: "node-installation", target: "C:/Users/alice/node.exe" }], phases: [{ id: "confirm-ownership", effect: "read-only", result: "secret" }], requiresHumanApprovalBefore: ["removal"] } }
  }, { platform: "win32", arch: "x64" });
  const serialized = JSON.stringify(result);
  assert.equal(result.schemaName, "aienvmap.reconcile-portable");
  assert.deepEqual(result.inventory.node.distinctVersions, ["22.1.0", "20.9.0"]);
  assert.equal(result.inventory.node.installations[0].manager.name, "fnm");
  assert.equal(result.inventory.otherRuntimes.java.installations[0].vendor, "Temurin");
  assert.deepEqual(result.findings, [{ code: "multiple-node-installations", severity: "review" }]);
  assert.equal(result.consolidation.candidateCount, 1);
  for (const secret of ["alice", "secret-project", "private-tool", "private-package", "secret-digest", "node.exe", "java.exe", "2026-07-12"]) assert.equal(serialized.includes(secret), false);
  assert.equal(result.consolidation.removalAuthorized, false);
  assert.match(result.evidenceFingerprint, /^aerp1:[a-f0-9]{24}$/);
  assert.equal(result.fingerprintSemantics.machineIdentifier, false);
  assert.match(result.fingerprintSemantics.linkabilityWarning, /pseudonymous/);
});

test("portable evidence fingerprint ignores identifiers and ordering but changes with runtime facts", () => {
  const base = {
    scanMode: "quick",
    project: { name: "alpha", path: "/home/alice/project", packageManager: null, lockManagers: [] },
    node: { distinctVersions: ["20", "22"], installations: [{ version: "22", active: true, path: "/home/alice/node22" }, { version: "20", path: "/home/alice/node20" }] },
    npm: { distinctVersions: [], installations: [] }, python: { distinctVersions: [], installations: [] }, otherRuntimes: {},
    findings: [{ code: "multiple-node-installations", severity: "review" }], decision: "review",
    aiDecision: { consolidationPlan: { status: "review", candidates: [{ kind: "node-installation" }], phases: [], requiresHumanApprovalBefore: ["removal"] } }
  };
  const first = buildPortableReconciliation(base, { platform: "linux", arch: "x64" });
  const reordered = buildPortableReconciliation({ ...base, project: { ...base.project, name: "beta", path: "/Users/bob/project" }, node: { distinctVersions: ["22", "20"], installations: [...base.node.installations].reverse() } }, { platform: "linux", arch: "x64" });
  const changed = buildPortableReconciliation({ ...base, node: { distinctVersions: ["20", "24"], installations: [{ version: "24", active: true }, { version: "20" }] } }, { platform: "linux", arch: "x64" });
  assert.equal(first.evidenceFingerprint, reordered.evidenceFingerprint);
  assert.notEqual(first.evidenceFingerprint, changed.evidenceFingerprint);
  assert.equal(portableEvidenceFingerprint(first), first.evidenceFingerprint);
});

test("AI decision summarizes strong, inferred, and unresolved runtime links", () => {
  const result = buildAiDecision({
    node: [
      { managerEvidence: { manager: "volta", confidence: "strong", ownershipProven: true } },
      { managerEvidence: { manager: "volta", confidence: "medium", ownershipProven: false } }
    ],
    java: { runtimeMetadata: { managers: ["jenv", "mise"], managedInstallCount: 1, routingManagedCount: 2 } },
    python: [
      { installerEvidence: { collection: "collected", installerCounts: { pip: 4, uv: 2 }, requestedCount: 2, editableCount: 1 }, managerEvidence: { manager: "uv", confidence: "strong", ownershipProven: true } },
      { installerEvidence: { collection: "unsupported-or-failed" }, managerEvidence: { manager: "uv", confidence: "medium", ownershipProven: false } }
    ],
    runtimeLinks: {
      npm: [{ confidence: "strong" }, { confidence: "medium" }],
      pip: [{ confidence: "none" }]
    }
  });
  assert.deepEqual(result.runtimeLinkSummary.npm, { total: 2, strong: 1, inferred: 1, unresolved: 0 });
  assert.deepEqual(result.runtimeLinkSummary.pip, { total: 1, strong: 0, inferred: 0, unresolved: 1 });
  assert.match(result.runtimeLinkSummary.rule, /not proof/);
  assert.ok(result.readFirst.includes("npm.runtimeLinks"));
  assert.ok(result.readFirst.includes("node.managerInventories"));
  assert.ok(result.readFirst.includes("python.managerInventories"));
  assert.deepEqual(result.pythonInstallerEvidence.installerCounts, { pip: 4, uv: 2 });
  assert.equal(result.pythonInstallerEvidence.collectedRuntimes, 1);
  assert.equal(result.pythonInstallerEvidence.failedRuntimes, 1);
  assert.equal(result.pythonInstallerEvidence.requestedPackages, 2);
  assert.equal(result.pythonInstallerEvidence.editablePackages, 1);
  assert.match(result.pythonInstallerEvidence.rule, /does not prove/);
  assert.equal(result.pythonManagerEvidence.proven, 1);
  assert.equal(result.pythonManagerEvidence.inferred, 1);
  assert.deepEqual(result.pythonManagerEvidence.managers, ["uv"]);
  assert.equal(result.pythonManagerEvidence.removalAuthorized, false);
  assert.match(result.pythonManagerEvidence.rule, /never turns it into removal authorization/);
  assert.equal(result.nodeManagerEvidence.proven, 1);
  assert.equal(result.nodeManagerEvidence.inferred, 1);
  assert.deepEqual(result.nodeManagerEvidence.managers, ["volta"]);
  assert.equal(result.nodeManagerEvidence.removalAuthorized, false);
  assert.match(result.nodeManagerEvidence.rule, /never removal authorization/);
  assert.deepEqual(result.javaManagerEvidence.managers, ["jenv", "mise"]);
  assert.equal(result.javaManagerEvidence.managedInstalls, 1);
  assert.equal(result.javaManagerEvidence.routingManaged, 2);
  assert.equal(result.javaManagerEvidence.removalAuthorized, false);
  assert.match(result.javaManagerEvidence.rule, /routing only/);
});

test("reconcile CLI is read-only and returns machine-readable package-manager state", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconcile-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ packageManager: "npm@10.8.2" }), "utf8");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--json", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  assert.equal(json.mode, "read-only");
  assert.equal(json.schemaName, "aienvmap.reconcile");
  assert.equal(json.schemaVersion, 1);
  assert.equal(json.project.packageManager.name, "npm");
  assert.equal(json.project.packageManager.version, "10.8.2");
  assert.ok(Array.isArray(json.python.installations));
  assert.ok(Array.isArray(json.node.installations));
  assert.equal(json.node.managerInventories.volta.collection, "not-requested");
  assert.equal(json.node.managerInventories.fnm.collection, "not-requested");
  assert.equal(json.node.managerInventories.nvm.collection, "not-requested");
  assert.equal(json.node.managerInventories.mise.collection, "not-requested");
  assert.equal(json.aiDecisionEnvelope.decision, json.decision);
  assert.equal(json.aiDecisionEnvelope.removalAuthorized, false);
  assert.ok(json.aiDecisionEnvelope.evidenceRefs.includes(".aienvmap/reconcile.json"));
  assert.ok(json.node.installations.every((item) => item.managerEvidence));
  assert.ok(Array.isArray(json.npm.runtimeLinks));
  assert.ok(Array.isArray(json.python.runtimeLinks));
  assert.equal(json.python.managerEvidence.collection, "not-requested");
  assert.equal(json.python.managerInventories.uv.collection, "not-requested");
  assert.equal(json.python.managerInventories.pyenv.collection, "not-requested");
  assert.equal(json.python.managerInventories.mise.collection, "not-requested");
  assert.ok(json.python.installations.every((item) => item.managerEvidence));
  assert.ok(json.otherRuntimes.java);
  assert.ok(json.otherRuntimes.dotnet);
  assert.equal(json.aiDecision.consumer, "AI agent");
  assert.ok(json.aiDecision.runtimeLinkSummary);
  assert.equal(json.python.packageDetail.startsWith("summary"), true);
  assert.ok(json.python.installations.every((item) => item.packages === undefined));
  assert.ok(json.python.installations.every((item) => item.installerEvidence.collection === "not-requested"));
  assert.ok(json.python.installations.every((item) => typeof item.packageDigest === "string"));
  assert.ok(["clear", "review"].includes(json.decision));
  assert.equal((await fs.readdir(dir)).sort().join(","), "package.json");
});

test("reconcile --portable emits a quick redacted shareable report", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-portable-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "private-project", packageManager: "npm@10.0.0" }), "utf8");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--portable", "--json", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  const serialized = JSON.stringify(json);
  assert.equal(json.schemaName, "aienvmap.reconcile-portable");
  assert.equal(json.scanMode, "quick");
  assert.equal(json.privacy.mode, "portable-redacted");
  assert.equal(serialized.includes(dir), false);
  assert.equal(serialized.includes("private-project"), false);
  assert.equal(json.consolidation.environmentChangesAuthorized, false);
  assert.deepEqual(json.source, { mode: "live-quick", scanMode: "quick", artifactPathIncluded: false });
});

test("reconcile --portable-from redacts a reviewed full artifact without rescanning", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-portable-from-"));
  const artifact = path.join(dir, "private-reconcile.json");
  await fs.writeFile(artifact, JSON.stringify({
    schemaName: "aienvmap.reconcile",
    schemaVersion: 1,
    generatedAt: "private-time",
    scanMode: "full-packages",
    project: { name: "private-project", path: dir, packageManager: null, lockManagers: [] },
    node: { distinctVersions: [], installations: [] },
    npm: { distinctVersions: [], installations: [] },
    python: { distinctVersions: ["3.12.13"], installations: [{ version: "3.12.13", active: true, path: `${dir}/python`, packages: [{ name: "private-package" }], managerEvidence: { manager: "uv", relationship: "managed-python-list-match", confidence: "strong", ownershipProven: true } }] },
    otherRuntimes: {}, findings: [], decision: "clear",
    aiDecision: { consolidationPlan: { status: "no-candidates", candidates: [], phases: [], requiresHumanApprovalBefore: ["removal"] } }
  }), "utf8");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--portable-from", artifact, "--json", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  const serialized = JSON.stringify(json);
  assert.deepEqual(json.source, { mode: "artifact", scanMode: "full-packages", artifactPathIncluded: false });
  assert.equal(json.inventory.python.installations[0].manager.ownershipProven, true);
  assert.equal(json.nextSafeCommand, "aienvmap status --json");
  for (const secret of [dir, "private-reconcile", "private-project", "private-package", "private-time"]) assert.equal(serialized.includes(secret), false);
});

test("reconcile --full-packages exposes package-level evidence on demand", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconcile-full-"));
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--json", "--full-packages", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  assert.equal(json.python.packageDetail, "full");
  assert.ok(["collected", "unavailable", "unsupported-or-failed"].includes(json.python.managerEvidence.collection));
  assert.ok(["collected", "unavailable", "unsupported-or-failed"].includes(json.node.managerInventories.volta.collection));
  assert.ok(["collected", "unavailable", "unsupported-or-failed"].includes(json.node.managerInventories.mise.collection));
  assert.ok(["collected", "unavailable", "unsupported-or-failed"].includes(json.python.managerInventories.pyenv.collection));
  assert.ok(json.python.installations.every((item) => Array.isArray(item.packages)));
  assert.ok(json.python.installations.every((item) => ["collected", "unsupported-or-failed"].includes(item.installerEvidence.collection)));
  assert.equal(json.aiDecision.pythonInstallerEvidence.notRequestedRuntimes, 0);
});

test("reconcile --quick keeps startup evidence compact", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconcile-quick-"));
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--json", "--quick", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  assert.equal(json.scanMode, "quick");
  assert.match(json.python.packageDetail, /not collected/);
  assert.ok(json.python.installations.every((item) => item.packageCount === null));
  assert.ok(json.python.installations.every((item) => item.packageCollection === "skipped-quick"));
});

test("reconcile --write saves only an aienvmap report", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconcile-write-"));
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)(process.execPath, [path.resolve("bin/aienvmap.js"), "reconcile", "--json", "--write", "--dir", dir], { cwd: path.resolve(".") });
  const json = JSON.parse(result.stdout);
  const saved = JSON.parse(await fs.readFile(path.join(dir, ".aienvmap", "reconcile.json"), "utf8"));
  assert.equal(saved.schemaName, "aienvmap.reconcile");
  assert.equal(saved.mode, "read-only");
  assert.equal(saved.written, json.written);
  assert.deepEqual((await fs.readdir(path.join(dir, ".aienvmap"))).sort(), ["reconcile.json"]);
});

test("reconcile --check reports project drift with stable exit code 2", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconcile-check-"));
  const packageFile = path.join(dir, "package.json");
  const cli = path.resolve("bin/aienvmap.js");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await fs.writeFile(packageFile, JSON.stringify({ packageManager: "npm@11" }), "utf8");
  await run(process.execPath, [cli, "reconcile", "--json", "--write", "--quick", "--dir", dir], { cwd: path.resolve(".") });
  await fs.writeFile(packageFile, JSON.stringify({ packageManager: "pnpm@10" }), "utf8");
  await assert.rejects(
    run(process.execPath, [cli, "reconcile", "--json", "--check", "--dir", dir], { cwd: path.resolve(".") }),
    (error) => {
      const json = JSON.parse(error.stdout);
      assert.equal(error.code, 2);
      assert.equal(json.schemaName, "aienvmap.reconcile-check");
      assert.equal(json.decision, "review");
      assert.ok(json.drift.changedSections.includes("project"));
      assert.equal(json.aiDecision.safeToProceed, false);
      return true;
    }
  );
});
