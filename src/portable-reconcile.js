import { createHash } from "node:crypto";
import { readJson } from "./fsutil.js";

export function buildPortableReconciliation(value = {}, runtime = {}) {
  const administratorNoExec = String(runtime.sourceMode || "").startsWith("administrator-") || (value.findings || []).some((item) => item.code === "unverified-no-exec-evidence");
  const summarizeInstallations = (items = [], options = {}) => items.map((item) => ({
    version: item.version || (item.versions || []).join(","),
    versionVerified: item.versionVerified !== false,
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
      installations: (inventory.installations || []).map((item) => ({ version: item.version, versionVerified: item.versionVerified !== false, active: item.active === true, source: item.source, scope: item.scope, deliveryEvidence: item.deliveryEvidence, ownershipProven: false, removalAuthorized: false }))
    }];
  }));
  const pythonTools = Object.fromEntries(["uv", "pipx"].map((tool) => {
    const inventory = value.python?.toolEntryPoints?.[tool] || {};
    return [tool, { count: inventory.installations?.length || 0, distinctVersions: inventory.distinctVersions || [], installations: (inventory.installations || []).map((item) => ({ version: item.version, versionVerified: item.versionVerified !== false, active: item.active === true, source: item.source, scope: item.scope, routingEvidence: item.routingEvidence, ownershipProven: false, removalAuthorized: false })) }];
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
    source: { mode: runtime.sourceMode || "in-memory", evidenceRole: administratorNoExec ? "administrator-no-exec" : "current-or-owning-user", scanMode: value.scanMode || "unknown", platformEvidence: value.platform && value.architecture ? "embedded" : runtime.platform && runtime.arch ? "provided" : "current-host-fallback", artifactPathIncluded: false },
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
      conda: { count: value.python?.conda?.installations?.length || 0, distinctVersions: value.python?.conda?.distinctVersions || [], unverifiedCount: (value.python?.conda?.installations || []).filter((item) => item.versionVerified === false).length, environmentCounts: (value.python?.conda?.installations || []).map((item) => item.environmentEvidence?.count || 0).sort((a, b) => a - b), ownershipProven: false, removalAuthorized: false },
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
    nextSafeCommand: administratorNoExec ? "aienvmap reconcile --portable --json" : value.scanMode === "quick" ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
    nextSafeActor: administratorNoExec ? "owning-user" : "current-user",
    rule: "Portable evidence is diagnostic context only; it omits local identifiers and never authorizes environment changes or removal."
  };
  report.evidenceFingerprint = portableEvidenceFingerprint(report);
  return report;
}

export function portableEvidenceFingerprint(report = {}) {
  const evidence = portableComparisonFacts(report);
  return `aerp1:${createHash("sha256").update(JSON.stringify(evidence)).digest("hex").slice(0, 24)}`;
}

export function comparePortableReconciliations(before = {}, after = {}, options = {}) {
  validatePortableReconciliation(before);
  validatePortableReconciliation(after);
  const allChanges = diffPortableFacts(portableComparisonFacts(before), portableComparisonFacts(after));
  const same = before.evidenceFingerprint === after.evidenceFingerprint && allChanges.length === 0;
  const ownerVerification = options.ownerVerification ? buildOwnerVerification(before, after) : null;
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
    ...(ownerVerification ? { ownerVerification } : {}),
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    rule: "Compare redacted facts only; differences require review and never authorize environment changes, cleanup, or removal."
  };
}

export function buildOwnerVerification(admin = {}, owner = {}) {
  if (admin.platform !== owner.platform || admin.architecture !== owner.architecture) throw new Error("--owner-verification requires matching platform and architecture evidence");
  const adminCounts = verificationCounts(admin.inventory);
  const ownerCounts = verificationCounts(owner.inventory);
  const adminUnverified = Object.values(adminCounts).reduce((sum, item) => sum + item.unverified, 0);
  if (!adminUnverified) throw new Error("--owner-verification requires the before report to contain no-exec file-presence evidence");
  const coverage = Object.keys(adminCounts).sort().filter((key) => adminCounts[key].unverified > 0).map((key) => {
    const discovered = adminCounts[key].unverified;
    const verified = ownerCounts[key]?.verified || 0;
    return { runtime: key, administratorDiscovered: discovered, ownerVerified: verified, status: verified === 0 ? "owner-missing" : verified < discovered ? "owner-partial" : "owner-reported" };
  });
  return {
    mode: "user-asserted-redacted-pairing",
    status: coverage.every((item) => item.status === "owner-reported") ? "coverage-reported" : "coverage-incomplete",
    coverage,
    identityProven: false,
    installationMatchesProven: false,
    versionsAuthoritativeForAdministratorPaths: false,
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    limitations: ["The operator asserts that both redacted reports describe the intended account; portable evidence cannot prove user or machine identity.", "Counts by runtime category do not prove that owner-reported versions correspond to the administrator-discovered files."],
    nextSafeAction: "Review category coverage and the owning user's report; investigate missing categories without assuming path or installation identity."
  };
}

function verificationCounts(inventory = {}) {
  const entries = [
    ["node", inventory.node], ["npm", inventory.npm], ["python", inventory.python], ["conda", inventory.conda],
    ...Object.entries(inventory.nodePackageManagers || {}).map(([name, value]) => [`node-manager:${name}`, value]),
    ...Object.entries(inventory.pythonTools || {}).map(([name, value]) => [`python-tool:${name}`, value]),
    ...Object.entries(inventory.otherRuntimes || {}).map(([name, value]) => [`runtime:${name}`, value])
  ];
  return Object.fromEntries(entries.map(([name, value = {}]) => {
    const installations = value.installations || [];
    const unverified = name === "conda" ? value.unverifiedCount || 0 : installations.filter((item) => item.versionVerified === false || item.version === "unverified-no-exec").length;
    return [name, { unverified, verified: Math.max(0, (value.count || installations.length) - unverified) }];
  }));
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

export function buildPortableCaseSummary(report = {}, comparison = null) {
  validatePortableReconciliation(report);
  if (comparison && (comparison.schemaName !== "aienvmap.reconcile-portable-compare" || comparison.schemaVersion !== 1)) throw new Error("--comparison requires an aienvmap.reconcile-portable-compare v1 JSON artifact");
  const inventoryCounts = {
    node: safeCount(report.inventory?.node?.count), npm: safeCount(report.inventory?.npm?.count), python: safeCount(report.inventory?.python?.count), conda: safeCount(report.inventory?.conda?.count),
    nodePackageManagers: safeNamedCounts(report.inventory?.nodePackageManagers, ["pnpm", "yarn", "corepack"]),
    pythonTools: safeNamedCounts(report.inventory?.pythonTools, ["uv", "pipx"]),
    otherRuntimes: safeNamedCounts(report.inventory?.otherRuntimes, ["java", "dotnet", "ruby", "go", "rust"])
  };
  return {
    schemaName: "aienvmap.environment-case-summary", schemaVersion: 1, status: "draft-human-review-required",
    evidence: { platform: safeEnum(report.platform, ["win32", "darwin", "linux", "aix", "freebsd", "openbsd", "sunos", "android"]), architecture: safeEnum(report.architecture, ["x64", "arm64", "arm", "ia32", "ppc64", "s390x", "riscv64"]), scanMode: safeEnum(report.scanMode, ["quick", "standard", "full-packages", "unknown"]), evidenceRole: safeEnum(report.source?.evidenceRole, ["administrator-no-exec", "current-or-owning-user", "unknown"]), inventoryCounts, findingCodes: (report.findings || []).map((item) => String(item.code || "")).filter((code) => /^[a-z0-9-]{1,80}$/.test(code)).slice(0, 50), decision: safeEnum(report.decision, ["clear", "review", "unknown"]) },
    comparison: comparison ? { present: true, decision: safeEnum(comparison.decision, ["clear", "review", "unknown"]), changeCount: safeCount(comparison.changeCount), changedSections: (comparison.changedSections || []).filter((item) => ["platform", "architecture", "scanMode", "projectSignals", "inventory", "findings", "decision", "consolidation"].includes(item)), ownerVerification: comparison.ownerVerification ? { status: safeEnum(comparison.ownerVerification.status, ["coverage-reported", "coverage-incomplete"]), coverage: (comparison.ownerVerification.coverage || []).map((item) => ({ runtime: safeVerificationRuntime(item.runtime), status: safeEnum(item.status, ["owner-missing", "owner-partial", "owner-reported"]) })).filter((item) => item.runtime !== "unknown").slice(0, 20) } : null, structureValidatedOnly: true } : { present: false },
    humanVerification: { complete: false, requiredFields: ["problemObserved", "aiConsumer", "aiJudgment", "detectedProblemReal", "usefulnessRating", "falsePositivesOrNegatives", "outcome", "independenceConfirmation", "privacyConfirmation"] },
    marketEvidence: { eligible: false, reason: "A generated draft is not independent outcome-verified evidence; a human must review, complete, and submit it manually." },
    privacy: { excluded: ["paths", "usernames and hostnames", "project and package names", "runtime versions", "evidence fingerprints", "timestamps", "raw inventories"], reviewRequired: true },
    environmentChangesAuthorized: false, removalAuthorized: false,
    rule: "Use as a minimal public submission draft only; review prose and complete human verification before manual submission."
  };
}

function safeNamedCounts(value = {}, allowed = []) {
  return Object.fromEntries(allowed.filter((name) => value?.[name]).map((name) => [name, safeCount(value[name].count)]));
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 100000) : 0;
}

function safeEnum(value, allowed) {
  return allowed.includes(value) ? value : "unknown";
}

function safeVerificationRuntime(value) {
  return /^(node|npm|python|conda|node-manager:(pnpm|yarn|corepack)|python-tool:(uv|pipx)|runtime:(java|dotnet|ruby|go|rust))$/.test(String(value || "")) ? value : "unknown";
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
