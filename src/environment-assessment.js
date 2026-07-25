import { buildConsolidationPlan, buildEnvironmentClarification } from "./environment-decision.js";
import { versionMatchesConstraint } from "./version-constraint.js";

export function buildAiDecision({ node = [], npm = [], python = [], java = {}, project = {}, policy = {}, findings = [], runtimeLinks = {} }) {
  const actionCandidates = [
    ...node.filter((item) => !item.active).map(nodeActionCandidate),
    ...npm.filter((item) => !item.active).map(npmActionCandidate),
    ...python.filter((item) => !item.active).map(pythonActionCandidate)
  ];
  const canonicalCandidates = {
    node: chooseCanonical(node, project.node?.versionFile || ""),
    npm: chooseCanonical(npm, project.packageManager?.name === "npm" ? project.packageManager.version : ""),
    python: chooseCanonical(python, project.python?.versionFile || "")
  };
  const clarification = buildEnvironmentClarification(actionCandidates, { node, python, java: java.installations || [] }, policy);
  const consolidationCandidates = actionCandidates.filter((item) => !clarification.policyMatchedKinds.includes(item.kind));
  return {
    consumer: "AI agent",
    decision: findings.some((item) => item.severity === "review") ? "review" : "clear",
    readFirst: ["project", "node.active", "node.managerInventories", "npm.active", "npm.runtimeLinks", "python.active", "python.managerInventories", "python.runtimeLinks", "findings", "aiDecision.actionCandidates"],
    canonicalCandidates,
    actionCandidates,
    clarification,
    consolidationPlan: buildConsolidationPlan({ actionCandidates: consolidationCandidates, canonicalCandidates }),
    runtimeLinkSummary: {
      npm: summarizeRuntimeLinkConfidence(runtimeLinks.npm),
      pip: summarizeRuntimeLinkConfidence(runtimeLinks.pip),
      rule: "Runtime links are routing evidence, not proof of installation ownership or permission to remove software."
    },
    pythonInstallerEvidence: summarizeInstallerEvidence(python),
    pythonManagerEvidence: summarizeManagerEvidence(python, "Python"),
    nodeManagerEvidence: summarizeManagerEvidence(node, "Node"),
    javaManagerEvidence: {
      managers: java.runtimeMetadata?.managers || [],
      managedInstalls: java.runtimeMetadata?.managedInstallCount || 0,
      routingManaged: java.runtimeMetadata?.routingManagedCount || 0,
      removalAuthorized: false,
      rule: "SDKMAN/mise canonical install roots may prove manager control; jenv and external registrations prove routing only, never removal permission."
    },
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

function nodeActionCandidate(item) {
  return {
    target: item.path,
    kind: "node-installation",
    recommendation: "review-candidate",
    confidence: "low",
    reasons: [`inactive Node ${item.version}`, `source=${item.source}`],
    safeNext: "Confirm its owning runtime manager and paired npm/global tools before selecting a canonical Node.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  };
}

function npmActionCandidate(item) {
  return {
    target: item.path,
    kind: "npm-installation",
    recommendation: "review-candidate",
    confidence: "low",
    reasons: [`inactive npm ${item.version}`, `source=${item.source}`, item.packageCollection === "skipped-quick" ? "globalPackages=not-collected" : `globalPackages=${item.globalPackages?.length || 0}`],
    safeNext: "Compare its global packages and owning Node manager with the active/project-preferred toolchain.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  };
}

function pythonActionCandidate(item) {
  return {
    target: item.path,
    kind: "python-installation",
    recommendation: item.virtualEnvironment ? "keep-until-project-owner-review" : "review-candidate",
    confidence: item.virtualEnvironment ? "high" : "low",
    reasons: [`inactive Python ${item.version}`, `source=${item.source}`, `virtualEnvironment=${item.virtualEnvironment}`, item.packageCollection === "skipped-quick" ? "packages=not-collected" : `packages=${item.packages?.length || item.packageCount || 0}`],
    safeNext: item.virtualEnvironment ? "Identify the owning project before any cleanup." : "Compare projects and packages before selecting a canonical runtime.",
    destructive: false,
    requiresHumanApprovalBeforeRemoval: true
  };
}

function summarizeInstallerEvidence(installations = []) {
  const evidence = installations.map((item) => item.installerEvidence || { collection: "not-requested" });
  const installerCounts = {};
  for (const item of evidence) {
    for (const [name, count] of Object.entries(item.installerCounts || {})) {
      installerCounts[name] = (installerCounts[name] || 0) + Number(count || 0);
    }
  }
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

function summarizeManagerEvidence(installations = [], runtime) {
  const evidence = installations.map((item) => item.managerEvidence || {});
  const rule = runtime === "Node"
    ? "Volta image-path or mise installed-path evidence may prove Node manager control, but never removal authorization."
    : "Manager-native ownership evidence may identify an interpreter owner, but aienvmap never turns it into removal authorization.";
  return {
    total: evidence.length,
    proven: evidence.filter((item) => item.ownershipProven === true).length,
    inferred: evidence.filter((item) => item.confidence === "medium").length,
    unconfirmed: evidence.filter((item) => item.confidence === "none" || !item.confidence).length,
    managers: [...new Set(evidence.map((item) => item.manager).filter((item) => item && item !== "unknown"))].sort(),
    removalAuthorized: false,
    rule
  };
}

function summarizeRuntimeLinkConfidence(links = []) {
  return {
    total: links?.length || 0,
    strong: links?.filter((item) => item.confidence === "strong").length || 0,
    inferred: links?.filter((item) => item.confidence === "medium").length || 0,
    unresolved: links?.filter((item) => item.confidence === "none").length || 0
  };
}

function chooseCanonical(installations = [], expected = "") {
  const verified = installations.filter((item) => item.versionVerified !== false);
  if (!verified.length) return null;
  const exact = expected ? verified.find((item) => versionMatchesConstraint(expected, item.version)) : null;
  const item = exact || verified.find((entry) => entry.active) || verified[0];
  return {
    path: item.path,
    version: item.version,
    basis: exact ? "project-version-match" : item.active ? "PATH-active-fallback" : "first-readable-fallback",
    confidence: exact ? "medium" : "low",
    requiresReview: true
  };
}
