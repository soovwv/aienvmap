import path from "node:path";

export function analyzeNodePackageManagers(managers = {}, project = {}) {
  const findings = [];
  for (const manager of ["pnpm", "yarn"]) {
    const inventory = managers[manager] || {};
    const installations = inventory.installations || [];
    if (installations.length > 1) findings.push({ code: `multiple-${manager}-installations`, severity: (inventory.distinctVersions || []).length > 1 ? "review" : "info", message: `${installations.length} ${manager} executables were detected${(inventory.distinctVersions || []).length > 1 ? ` with versions ${inventory.distinctVersions.join(", ")}` : ""}.`, action: `Review PATH and the project packageManager declaration before choosing or removing any ${manager} entry point.` });
    const expected = project.packageManager?.name === manager ? project.packageManager.version : "";
    if (expected && !installations.length) findings.push({ code: `${manager}-not-detected`, severity: "review", message: `Project declares ${manager}@${expected}, but no readable ${manager} executable was detected.`, action: `Review the project's Node/Corepack setup; aienvmap will not install or enable ${manager}.` });
    if (expected && inventory.active && !versionMatches(expected, inventory.active.version)) findings.push({ code: `active-${manager}-project-mismatch`, severity: "review", message: `Project declares ${manager}@${expected}, but active ${manager} is ${inventory.active.version}.`, action: "Review Corepack or PATH routing before dependency changes; do not switch versions automatically." });
  }
  return findings;
}

export function analyzePythonToolEntryPoints(pipCommands = [], tools = {}) {
  const findings = [];
  const inventories = { pip: { installations: pipCommands, distinctVersions: [...new Set(pipCommands.map((item) => item.version))] }, ...tools };
  for (const tool of ["pip", "uv", "pipx"]) {
    const inventory = inventories[tool] || {};
    const installations = inventory.installations || [];
    if (installations.length < 2) continue;
    const versions = inventory.distinctVersions || [];
    findings.push({ code: `multiple-${tool}-entry-points`, severity: versions.length > 1 ? "review" : "info", message: `${installations.length} ${tool} entry points were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`, action: `Review Python/tool ownership and PATH ordering before using or removing a ${tool} entry point.` });
  }
  return findings;
}

export function analyzeCondaRouting(conda = {}, pythonInstallations = [], env = process.env) {
  const findings = [];
  if ((conda.installations || []).length > 1) findings.push({ code: "multiple-conda-installations", severity: (conda.distinctVersions || []).length > 1 ? "review" : "info", message: `${conda.installations.length} Conda entry points were detected.`, action: "Review the intended Conda base and PATH order; do not remove or initialize a base automatically." });
  if (!env.CONDA_PREFIX) return findings;
  const activePython = pythonInstallations.find((item) => item.active);
  if (activePython && !pathContains(env.CONDA_PREFIX, activePython.path) && !pathContains(env.CONDA_PREFIX, activePython.prefix)) findings.push({ code: "conda-active-python-routing-mismatch", severity: "review", message: "CONDA_PREFIX is active, but the active Python does not resolve inside that prefix.", action: "Review shell activation and Python routing before installing packages; prefer the explicitly selected interpreter." });
  return findings;
}

function versionMatches(expected, actual) {
  const clean = String(expected).replace(/^[=v]/, "");
  if (/^\d+(?:\.\d+){0,2}$/.test(clean)) return actual === clean || actual.startsWith(`${clean}.`);
  return true;
}

function pathContains(parent, child) {
  if (!parent || !child) return false;
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
