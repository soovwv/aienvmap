import path from "node:path";

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

function sameDirectory(left, right) {
  return Boolean(left && right && normalizeCompare(path.dirname(left)) === normalizeCompare(path.dirname(right)));
}

function pathContains(parent, child) {
  if (!parent || !child) return false;
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeCompare(value) {
  const normalized = path.normalize(String(value || ""));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function majorMinor(value) {
  return String(value || "").match(/(\d+)\.(\d+)/)?.slice(1, 3).join(".") || "";
}
