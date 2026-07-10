import { createHash } from "node:crypto";

export function compareReconciliation(baseline = {}, current = {}, options = {}) {
  const before = reconciliationSnapshot(baseline);
  const after = reconciliationSnapshot(current);
  const changes = diffValue(before, after);
  const detected = changes.length > 0;
  return {
    schemaName: "aienvmap.reconcile-check",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    baseline: {
      artifact: options.baselineArtifact || ".aienvmap/reconcile.json",
      generatedAt: baseline.generatedAt || "",
      scanMode: baseline.scanMode || "unknown",
      fingerprint: snapshotFingerprint(before)
    },
    current: {
      generatedAt: current.generatedAt || "",
      scanMode: current.scanMode || "unknown",
      fingerprint: snapshotFingerprint(after)
    },
    drift: {
      detected,
      changeCount: changes.length,
      changedSections: [...new Set(changes.map((item) => item.section))],
      changes: changes.slice(0, 100),
      truncated: changes.length > 100
    },
    decision: detected ? "review" : "clear",
    exitCode: detected ? 2 : 0,
    aiDecision: {
      consumer: "AI agent or CI",
      safeToProceed: !detected,
      nextCommand: detected ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
      rule: detected
        ? "Review runtime and package-manager drift before environment-affecting work; this check does not authorize cleanup."
        : "No drift from the saved reconciliation baseline was detected."
    }
  };
}

export function reconciliationSnapshot(value = {}) {
  return {
    project: normalize(value.project || {}),
    node: runtimeSection(value.node),
    npm: npmSection(value.npm),
    python: pythonSection(value.python),
    otherRuntimes: Object.fromEntries(Object.entries(value.otherRuntimes || {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, section]) => [name, runtimeSection(section)]))
  };
}

function runtimeSection(section = {}) {
  return {
    installations: normalizeInstallations(section.installations),
    distinctVersions: sorted(section.distinctVersions || [])
  };
}

function npmSection(section = {}) {
  return {
    ...runtimeSection(section),
    distinctGlobalRoots: sorted(section.distinctGlobalRoots || []),
    installations: normalizeInstallations(section.installations, ["prefix", "globalRoot", "globalPackages", "packageCollection"]),
    runtimeLinks: normalizeRuntimeLinks(section.runtimeLinks)
  };
}

function pythonSection(section = {}) {
  return {
    ...runtimeSection(section),
    packageLocations: sorted(section.packageLocations || []),
    installations: normalizeInstallations(section.installations, ["virtualEnvironment", "prefix", "basePrefix", "packageLocations", "packageCount", "packageDigest", "packageCollection", "pipAvailable", "installerEvidence"]),
    pipCommands: normalizeInstallations(section.pipCommands, ["pythonVersion", "packageLocation"]),
    runtimeLinks: normalizeRuntimeLinks(section.runtimeLinks)
  };
}

function normalizeRuntimeLinks(items = []) {
  return items.map((item) => normalize(item)).sort((a, b) => `${a.managerPath || ""}:${a.runtimePath || ""}`.localeCompare(`${b.managerPath || ""}:${b.runtimePath || ""}`));
}

function normalizeInstallations(items = [], extra = []) {
  const fields = ["runtime", "manager", "path", "version", "versions", "active", "source", "scope", "discovery", ...extra];
  return items.map((item) => Object.fromEntries(fields.filter((key) => item?.[key] !== undefined).map((key) => [key, normalize(item[key])]))).sort((a, b) => `${a.path || ""}:${a.version || ""}`.localeCompare(`${b.path || ""}:${b.version || ""}`));
}

function diffValue(before, after, path = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!isObject(before) || !isObject(after) || Array.isArray(before) || Array.isArray(after)) {
    return [{
      section: path[0] || "root",
      field: path.join("."),
      kind: before === undefined ? "added" : after === undefined ? "removed" : "changed",
      before: before === undefined ? null : before,
      after: after === undefined ? null : after
    }];
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((key) => diffValue(before[key], after[key], [...path, key]));
}

function snapshotFingerprint(value) {
  return `rs1:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20)}`;
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
  return value;
}

function sorted(value) {
  return [...value].map(normalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function isObject(value) {
  return value !== null && typeof value === "object";
}
