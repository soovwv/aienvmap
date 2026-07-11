import { createHash } from "node:crypto";
import { readJson } from "./fsutil.js";

export function buildPortableReconciliation(value = {}, runtime = {}) {
  const summarizeInstallations = (items = [], options = {}) => items.map((item) => ({
    version: item.version || (item.versions || []).join(","),
    active: item.active === true,
    source: item.source || "unknown",
    scope: item.scope || "unknown",
    ...(options.python ? { virtualEnvironment: item.virtualEnvironment === true, pipAvailable: item.pipAvailable === true } : {}),
    ...(options.java ? { vendor: item.vendor || "unknown", architecture: item.architecture || "unknown", runtimeKind: item.runtimeKind || "unknown", hasCompiler: item.hasCompiler === true } : {}),
    manager: {
      name: item.managerEvidence?.manager || "unknown",
      relationship: item.managerEvidence?.relationship || "unconfirmed",
      confidence: item.managerEvidence?.confidence || "none",
      ownershipProven: item.managerEvidence?.ownershipProven === true,
      removalAuthorized: false
    }
  }));
  const otherRuntimes = Object.fromEntries(Object.entries(value.otherRuntimes || {}).map(([name, item]) => [name, {
    count: item.installations?.length || 0,
    distinctVersions: [...new Set((item.installations || []).flatMap((entry) => entry.versions || [entry.version]).filter(Boolean))],
    installations: summarizeInstallations(item.installations, { java: name === "java" })
  }]));
  const nodePackageManagers = Object.fromEntries(["pnpm", "yarn", "corepack"].map((manager) => {
    const inventory = value.npm?.alternativeManagers?.[manager] || {};
    return [manager, {
      count: inventory.installations?.length || 0,
      distinctVersions: inventory.distinctVersions || [],
      installations: (inventory.installations || []).map((item) => ({ version: item.version, active: item.active === true, source: item.source, scope: item.scope, deliveryEvidence: item.deliveryEvidence, ownershipProven: false, removalAuthorized: false }))
    }];
  }));
  const pythonTools = Object.fromEntries(["uv", "pipx"].map((tool) => {
    const inventory = value.python?.toolEntryPoints?.[tool] || {};
    return [tool, { count: inventory.installations?.length || 0, distinctVersions: inventory.distinctVersions || [], installations: (inventory.installations || []).map((item) => ({ version: item.version, active: item.active === true, source: item.source, scope: item.scope, routingEvidence: item.routingEvidence, ownershipProven: false, removalAuthorized: false })) }];
  }));
  const plan = value.aiDecision?.consolidationPlan || {};
  const report = {
    schemaName: "aienvmap.reconcile-portable",
    schemaVersion: 1,
    privacy: {
      mode: "portable-redacted",
      excluded: ["paths", "workspace and project names", "package names", "package digests", "timestamps", "raw manager inventories"],
      warning: "Review before sharing: runtime versions, platform, architecture, sources, and finding codes remain visible."
    },
    platform: value.platform || runtime.platform || process.platform,
    architecture: value.architecture || runtime.arch || process.arch,
    source: { mode: runtime.sourceMode || "in-memory", scanMode: value.scanMode || "unknown", platformEvidence: value.platform && value.architecture ? "embedded" : runtime.platform && runtime.arch ? "provided" : "current-host-fallback", artifactPathIncluded: false },
    scanMode: value.scanMode || "unknown",
    projectSignals: {
      packageManager: value.project?.packageManager ? { name: value.project.packageManager.name, version: value.project.packageManager.version } : null,
      lockManagers: value.project?.lockManagers || [],
      nodeVersion: value.project?.node?.versionFile || "",
      pythonVersion: value.project?.python?.versionFile || ""
    },
    inventory: {
      node: { count: value.node?.installations?.length || 0, distinctVersions: value.node?.distinctVersions || [], installations: summarizeInstallations(value.node?.installations) },
      npm: { count: value.npm?.installations?.length || 0, distinctVersions: value.npm?.distinctVersions || [], installations: summarizeInstallations(value.npm?.installations) },
      nodePackageManagers,
      python: { count: value.python?.installations?.length || 0, distinctVersions: value.python?.distinctVersions || [], installations: summarizeInstallations(value.python?.installations, { python: true }) },
      pythonTools,
      conda: { count: value.python?.conda?.installations?.length || 0, distinctVersions: value.python?.conda?.distinctVersions || [], environmentCounts: (value.python?.conda?.installations || []).map((item) => item.environmentEvidence?.count || 0).sort((a, b) => a - b), ownershipProven: false, removalAuthorized: false },
      otherRuntimes
    },
    findings: (value.findings || []).map((item) => ({ code: item.code, severity: item.severity })),
    decision: value.decision || "unknown",
    consolidation: {
      status: plan.status || "no-candidates",
      candidateKinds: [...new Set((plan.candidates || []).map((item) => item.kind).filter(Boolean))],
      candidateCount: plan.candidates?.length || 0,
      phases: (plan.phases || []).map((item) => ({ id: item.id, effect: item.effect })),
      requiresHumanApprovalBefore: plan.requiresHumanApprovalBefore || [],
      environmentChangesAuthorized: false,
      removalAuthorized: false
    },
    evidenceFingerprint: "",
    fingerprintSemantics: {
      algorithm: "sha256",
      prefix: "aerp1",
      stableAcross: ["path changes", "project-name changes", "package-name changes", "timestamp changes", "discovery ordering"],
      changesWith: ["platform or architecture", "scan depth", "runtime versions or activation", "manager ownership evidence", "finding or consolidation state"],
      machineIdentifier: false,
      linkabilityWarning: "Reports with identical retained facts share a fingerprint; treat it as a pseudonymous comparison token and review before publishing longitudinal data.",
      rule: "Use only to compare or deduplicate portable environment evidence; never use as a machine, user, or installation identifier."
    },
    nextSafeCommand: value.scanMode === "quick" ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
    rule: "Portable evidence is diagnostic context only; it omits local identifiers and never authorizes environment changes or removal."
  };
  report.evidenceFingerprint = portableEvidenceFingerprint(report);
  return report;
}

export function portableEvidenceFingerprint(report = {}) {
  const evidence = portableComparisonFacts(report);
  return `aerp1:${createHash("sha256").update(JSON.stringify(evidence)).digest("hex").slice(0, 24)}`;
}

export function comparePortableReconciliations(before = {}, after = {}) {
  validatePortableReconciliation(before);
  validatePortableReconciliation(after);
  const allChanges = diffPortableFacts(portableComparisonFacts(before), portableComparisonFacts(after));
  const same = before.evidenceFingerprint === after.evidenceFingerprint && allChanges.length === 0;
  return {
    schemaName: "aienvmap.reconcile-portable-compare",
    schemaVersion: 1,
    mode: "offline-redacted-compare",
    before: { evidenceFingerprint: before.evidenceFingerprint, scanMode: before.scanMode || "unknown" },
    after: { evidenceFingerprint: after.evidenceFingerprint, scanMode: after.scanMode || "unknown" },
    same,
    decision: same ? "clear" : "review",
    changeCount: allChanges.length,
    changedSections: [...new Set(allChanges.map((item) => item.section))],
    changes: allChanges.slice(0, 100),
    truncated: allChanges.length > 100,
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    rule: "Compare redacted facts only; differences require review and never authorize environment changes, cleanup, or removal."
  };
}

export async function readPortableEvidence(file) {
  const value = await readJson(file, null);
  if (value?.schemaName === "aienvmap.reconcile-portable" && value?.schemaVersion === 1) {
    validatePortableReconciliation(value);
    return value;
  }
  if (value?.schemaName === "aienvmap.reconcile" && value?.schemaVersion === 1) {
    if (!value.platform || !value.architecture) throw new Error("raw reconciliation comparison inputs require embedded platform and architecture; regenerate them or convert each artifact to portable evidence on its source host");
    return buildPortableReconciliation(value, { sourceMode: "artifact" });
  }
  throw new Error("portable comparison inputs must be aienvmap.reconcile or aienvmap.reconcile-portable v1 JSON artifacts");
}

export function validatePortableReconciliation(value) {
  if (value?.schemaName !== "aienvmap.reconcile-portable" || value?.schemaVersion !== 1 || !value.evidenceFingerprint) throw new Error("expected an aienvmap.reconcile-portable v1 artifact with evidenceFingerprint");
  if (portableEvidenceFingerprint(value) !== value.evidenceFingerprint) throw new Error("portable evidence fingerprint does not match its retained facts");
}

function portableComparisonFacts(value) {
  return canonicalEvidence({ platform: value.platform, architecture: value.architecture, scanMode: value.scanMode, projectSignals: value.projectSignals, inventory: value.inventory, findings: value.findings, decision: value.decision, consolidation: value.consolidation });
}

function diffPortableFacts(before, after, keys = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return [{ section: keys[0] || "root", field: keys.join("."), kind: before === undefined ? "added" : after === undefined ? "removed" : "changed", before: before ?? null, after: after ?? null }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((key) => diffPortableFacts(before[key], after[key], [...keys, key]));
}

function canonicalEvidence(value) {
  if (Array.isArray(value)) return value.map(canonicalEvidence).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalEvidence(value[key])]));
  return value;
}
