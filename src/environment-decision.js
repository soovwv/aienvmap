import { runtimeVersionsMatchIntentionalPolicy } from "./policy.js";

export function buildEnvironmentClarification(actionCandidates = [], installations = {}, policy = {}) {
  const acknowledged = new Set([
    ...(runtimeVersionsMatchIntentionalPolicy(installations.node, policy, "node") ? ["node-installation"] : []),
    ...(runtimeVersionsMatchIntentionalPolicy(installations.python, policy, "python") ? ["python-installation"] : []),
    ...(runtimeVersionsMatchIntentionalPolicy(installations.java, policy, "java") ? ["java-installation"] : [])
  ]);
  const allKinds = [...new Set([
    ...actionCandidates.map((item) => item.kind).filter(Boolean),
    ...((installations.java || []).length > 1 ? ["java-installation"] : [])
  ])].sort();
  const kinds = allKinds.filter((kind) => !acknowledged.has(kind));
  const required = kinds.length > 0;
  return {
    required,
    status: required ? "ask-user-before-consolidation" : acknowledged.size ? "intentional-versions-recorded" : "not-needed",
    reason: required ? "Multiple or inactive installations are evidence of complexity, not proof that consolidation is wanted." : acknowledged.size ? "Every detected multi-version runtime is covered by an explicit project-local intentional-version policy." : "No inactive runtime or package-manager candidate requires an intent question.",
    question: required ? "Are these installations intentionally retained for different projects or workflows, or should the AI prepare a reviewed consolidation proposal?" : "",
    choices: required ? ["keep-intentional", "review-consolidation", "need-more-evidence"] : [],
    defaultChoice: required ? "need-more-evidence" : "none",
    affectedKinds: kinds,
    policyMatchedKinds: [...acknowledged].sort(),
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    rule: "Do not infer cleanup intent from duplicate or inactive installations; ask the user and gather ownership, consumer, and rollback evidence before proposing a change."
  };
}

export function applyIntentionalRuntimePolicy(findings = [], installations = {}, policy = {}) {
  const matched = new Set([
    ...(runtimeVersionsMatchIntentionalPolicy(installations.node, policy, "node") ? ["multiple-node-installations"] : []),
    ...(runtimeVersionsMatchIntentionalPolicy(installations.python, policy, "python") ? ["multiple-python-installations"] : [])
  ]);
  return findings.map((finding) => matched.has(finding.code) ? { ...finding, severity: "info", action: "Keep the explicitly listed intentional versions; review again if a new version or routing mismatch appears.", intentionalPolicyMatched: true } : finding);
}

export function buildConsolidationPlan({ actionCandidates = [], canonicalCandidates = {} } = {}) {
  const candidates = actionCandidates.map((item, index) => ({
    id: `${item.kind || "installation"}:${index + 1}`,
    target: item.target,
    kind: item.kind,
    recommendation: item.recommendation,
    confidence: item.confidence,
    evidenceRequired: [
      "runtime-manager ownership or explicit unmanaged status",
      "project references and active-process usage",
      item.kind === "npm-installation" ? "global package inventory" : item.kind === "python-installation" ? "installed package inventory and virtual-environment owner" : "paired package-manager and global-tool inventory"
    ],
    stopWhen: ["ownership is unconfirmed", "an owning project is found", "rollback evidence is incomplete", "a human has not approved the exact target"],
    proposedChange: "none; prepare a target-specific reviewed change outside aienvmap",
    requiresHumanApproval: true,
    removalAuthorized: false
  }));
  return {
    schemaName: "aienvmap.consolidation-plan",
    schemaVersion: 1,
    mode: "proposal-only",
    status: candidates.length ? "review" : "no-candidates",
    canonicalCandidates,
    phases: [
      { id: "confirm-ownership", effect: "read-only", result: "manager ownership or unmanaged status for every target" },
      { id: "confirm-consumers", effect: "read-only", result: "projects, services, shells, and CI jobs that reference each target" },
      { id: "capture-rollback", effect: "read-only", result: "path, version, package inventory, manager metadata, and restoration procedure" },
      { id: "request-approval", effect: "human-gate", result: "approval names the exact target and proposed environment change" }
    ],
    candidates,
    applyCommand: null,
    rollbackRequirements: ["exact original path and version", "owning manager and reinstall source", "package/global-tool inventory", "affected project and service references", "post-change verification commands"],
    requiresHumanApprovalBefore: ["removal", "PATH-edit", "runtime-switch", "global-package-migration"],
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    nextSafeCommand: candidates.length ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
    rule: "This plan collects evidence and defines gates only; it never authorizes or executes uninstall, deletion, PATH edits, runtime switching, or global package migration."
  };
}
