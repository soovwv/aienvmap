import path from "node:path";
import { displayPath } from "./path-evidence.js";

export function attachNvmManagerEvidence(nodeInstallations = [], nvm = {}) {
  return nodeInstallations.map((node) => {
    if (node.managerEvidence?.ownershipProven === true) return node;
    const listed = nvm.collection === "collected" && (nvm.installations || []).find((item) => item.version === node.version);
    const exact = listed?.canonicalInsideRoot && (pathContains(listed.installPath, node.reportedExecutable) || pathContains(listed.installPath, node.path));
    const inferred = node.source === "nvm" || Boolean(nvm.managedRoot && (pathContains(nvm.managedRoot, node.path) || pathContains(nvm.managedRoot, node.reportedExecutable)));
    if (exact) return { ...node, managerEvidence: {
      manager: nvm.manager || "nvm", managerVersion: "", relationship: "configured-root-version-path-match", confidence: "strong", ownershipProven: true,
      proofScope: "nvm-managed-runtime", matchedKey: listed.version, removalAuthorized: false
    } };
    if ((!listed && !inferred) || node.managerEvidence?.confidence === "medium") return node;
    return { ...node, managerEvidence: {
      manager: nvm.manager || "nvm", managerVersion: "", relationship: listed ? "inventory-version-match" : "managed-root-inference", confidence: "medium",
      ownershipProven: false, proofScope: listed ? "version-and-routing-only" : "path-only", matchedKey: listed?.version || "", removalAuthorized: false
    } };
  });
}

export function parseFnmNodeList(raw) {
  const runtimes = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    const match = line.trim().match(/^\*?\s*v(\d+\.\d+\.\d+)(?:\s+(.+))?$/i);
    if (!match) continue;
    const labels = String(match[2] || "").trim().split(/\s+/).filter(Boolean).slice(0, 10);
    runtimes.push({ version: match[1], state: labels.includes("default") ? "default" : "installed", aliases: labels.filter((item) => item !== "default") });
  }
  return runtimes.filter((item, index) => runtimes.findIndex((other) => other.version === item.version) === index);
}

export function attachFnmManagerEvidence(nodeInstallations = [], fnm = {}) {
  return nodeInstallations.map((node) => {
    if (node.managerEvidence?.ownershipProven === true) return node;
    const listed = fnm.collection === "collected" && (fnm.runtimes || []).find((item) => item.version === node.version);
    const versionRoot = listed && fnm.managedRoot ? path.join(fnm.managedRoot, `v${listed.version}`, "installation") : "";
    const exact = Boolean(versionRoot && pathContains(versionRoot, node.reportedExecutable));
    const inferred = node.source === "fnm" || Boolean(fnm.managedRoot && (pathContains(fnm.managedRoot, node.path) || pathContains(fnm.managedRoot, node.reportedExecutable)));
    if (exact) return { ...node, managerEvidence: {
      manager: "fnm", managerVersion: fnm.version, relationship: "list-and-version-path-match", confidence: "strong", ownershipProven: true,
      proofScope: "fnm-managed-runtime", matchedKey: listed.version, removalAuthorized: false
    } };
    if ((!listed && !inferred) || node.managerEvidence?.confidence === "medium") return node;
    return { ...node, managerEvidence: {
      manager: "fnm", managerVersion: fnm.version || "", relationship: listed ? "inventory-version-match" : "managed-root-inference",
      confidence: "medium", ownershipProven: false, proofScope: listed ? "version-and-routing-only" : "path-only", matchedKey: listed?.version || "", removalAuthorized: false
    } };
  });
}

export function parseMiseRuntimeInventory(raw, options = {}) {
  let value;
  try { value = JSON.parse(String(raw || "")); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const all = [];
  for (const runtime of ["node", "python"]) {
    const entries = Array.isArray(value[runtime]) ? value[runtime] : [];
    for (const item of entries) {
      const version = String(item?.version || "").replace(/^v/, "");
      const installPath = String(item?.install_path || "");
      if (!version || !path.isAbsolute(installPath)) continue;
      all.push({
        runtime,
        version,
        installPath: displayPath(installPath, options),
        configured: Boolean(item?.source),
        sourceType: String(item?.source?.type || "")
      });
    }
  }
  return { runtimes: all.slice(0, 100), truncated: all.length > 100 };
}

export function miseInventoryForRuntime(mise = {}, runtime) {
  if (mise.collection !== "collected") return { ...mise };
  const runtimes = (mise.runtimes || []).filter((item) => item.runtime === runtime);
  return { ...mise, runtimes, runtimeCount: runtimes.length };
}

export function attachMiseNodeEvidence(nodeInstallations = [], mise = {}) {
  return attachMiseEvidence(nodeInstallations, mise, "node", (item) => [item.reportedExecutable], (item) => [item.path, item.reportedExecutable]);
}

export function attachMisePythonEvidence(pythonInstallations = [], mise = {}) {
  return attachMiseEvidence(
    pythonInstallations,
    mise,
    "python",
    (item) => [item.prefix, item.basePrefix],
    (item) => [item.prefix, item.basePrefix]
  );
}

function attachMiseEvidence(installations, mise, runtime, exactPath, inferredPaths) {
  return installations.map((installation) => {
    if (installation.managerEvidence?.ownershipProven === true) return installation;
    const matched = mise.collection === "collected" && (mise.runtimes || []).find((item) =>
      item.runtime === runtime && item.version === installation.version && exactPath(installation).some((candidate) => exactMisePath(item.installPath, candidate, runtime))
    );
    const inferred = installation.source === "mise" || (mise.runtimes || []).some((item) =>
      item.runtime === runtime && inferredPaths(installation).some((candidate) => pathContains(item.installPath, candidate))
    );
    if (!matched && !inferred) return installation;
    return {
      ...installation,
      managerEvidence: matched ? miseManagerEvidence(mise, matched, runtime) : miseInferenceEvidence(mise)
    };
  });
}

function exactMisePath(installPath, candidate, runtime) {
  if (runtime === "node") return pathContains(installPath, candidate);
  return normalizeCompare(installPath) === normalizeCompare(candidate);
}

function miseManagerEvidence(mise, matched, runtime) {
  return {
    manager: "mise", managerVersion: mise.version, relationship: "installed-json-path-match", confidence: "strong", ownershipProven: true,
    proofScope: `mise-managed-${runtime}`, matchedKey: `${runtime}@${matched.version}`, removalAuthorized: false
  };
}

function miseInferenceEvidence(mise) {
  return {
    manager: "mise", managerVersion: mise.version || "", relationship: "managed-root-inference", confidence: "medium",
    ownershipProven: false, proofScope: "path-only", matchedKey: "", removalAuthorized: false
  };
}

export function parseVoltaNodeList(raw) {
  const runtimes = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    const match = line.trim().match(/^runtime\s+node@([^\s]+)(?:\s+\((default|current\s+@\s+.+)\))?$/i);
    if (!match) continue;
    const state = !match[2] ? "installed" : match[2] === "default" ? "default" : "current-project";
    runtimes.push({ version: match[1].replace(/^v/, ""), state });
  }
  return runtimes.filter((item, index) => runtimes.findIndex((other) => other.version === item.version && other.state === item.state) === index);
}

export function attachVoltaManagerEvidence(nodeInstallations = [], volta = {}) {
  return nodeInstallations.map((node) => {
    const listed = volta.collection === "collected" && (volta.runtimes || []).find((item) => item.version === node.version);
    const exactRoot = listed && volta.managedRoot && pathContains(volta.managedRoot, node.reportedExecutable);
    const inferred = node.source === "volta" || (volta.managedRoot && (pathContains(volta.managedRoot, node.path) || pathContains(volta.managedRoot, node.reportedExecutable)));
    return {
      ...node,
      managerEvidence: managerEvidenceForVolta(volta, listed, exactRoot, inferred)
    };
  });
}

function managerEvidenceForVolta(volta, listed, exactRoot, inferred) {
  if (exactRoot) return {
    manager: "volta", managerVersion: volta.version, relationship: "inventory-and-image-path-match", confidence: "strong",
    ownershipProven: true, proofScope: "volta-managed-runtime", matchedKey: listed.version, removalAuthorized: false
  };
  if (listed && inferred) return {
    manager: "volta", managerVersion: volta.version, relationship: "inventory-version-match", confidence: "medium",
    ownershipProven: false, proofScope: "version-and-routing-only", matchedKey: listed.version, removalAuthorized: false
  };
  if (inferred) return {
    manager: "volta", managerVersion: volta.version || "", relationship: "managed-root-inference", confidence: "medium",
    ownershipProven: false, proofScope: "path-only", matchedKey: "", removalAuthorized: false
  };
  return {
    manager: "unknown", managerVersion: "", relationship: "unconfirmed", confidence: "none",
    ownershipProven: false, proofScope: "none", matchedKey: "", removalAuthorized: false
  };
}

function normalizeCompare(value) {
  return path.normalize(String(value || "")).toLowerCase();
}

function pathContains(parent, child) {
  if (!parent || !child) return false;
  const base = normalizeCompare(parent).replace(/[\\/]+$/, "");
  const target = normalizeCompare(child);
  return target === base || target.startsWith(`${base}${path.sep}`);
}
