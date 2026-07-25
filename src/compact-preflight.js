import { explainReasonCodes } from "./reason-explanations.js";

export function compactStatusPreflight(status = {}) {
  return compactPreflight({
    source: "status",
    state: status.state,
    summary: status.summary,
    counts: status.counts,
    envelope: status.aiDecisionEnvelope,
    nextCommand: status.nextCommand,
    setupCommand: status.agentPointers?.nextSetupCommand,
    detailCommand: status.quickstart?.detailCommand,
    startHere: status.artifacts?.startHere,
    readOrder: status.aiSession?.start,
    coordinationRevision: status.coordinationRevision,
    dependencyQuickCheck: status.dependencyQuickCheck,
    reconciliation: status.reconciliation,
    externalSbom: status.externalSbom
  });
}

export function compactStartPreflight(start = {}, status = {}) {
  return compactPreflight({
    source: "start",
    state: start.decision,
    mode: start.mode,
    summary: start.summary,
    counts: status.counts,
    envelope: start.aiDecisionEnvelope,
    nextCommand: start.nextCommand,
    setupCommand: start.nextSetupCommand,
    detailCommand: "aienvmap context --json",
    startHere: start.startHere,
    readOrder: start.readOrder,
    coordinationRevision: status.coordinationRevision,
    dependencyQuickCheck: status.dependencyQuickCheck,
    reconciliation: start.reconciliation,
    externalSbom: start.externalSbom,
    discoveryDecision: start.discoveryDecision,
    discoveryProofCommand: start.sessionUse?.proofCommand,
    copyPastePrompt: start.copyPastePrompt
  });
}

function compactPreflight(input) {
  const envelope = input.envelope || {};
  const reasonCodes = boundedArray(envelope.reasonCodes, 8);
  const counts = input.counts || {};
  const dependency = input.dependencyQuickCheck || {};
  const reconciliation = input.reconciliation || {};
  const externalSbom = input.externalSbom || {};
  return removeEmpty({
    schemaName: "aienvmap-compact-preflight",
    schemaVersion: 1,
    source: input.source,
    state: input.state || envelope.decision || "unknown",
    mode: input.mode,
    summary: input.summary || "Inspect the referenced evidence before environment changes.",
    counts: {
      runtimes: numberOrZero(counts.runtimes),
      packageManagers: numberOrZero(counts.packageManagers),
      containers: numberOrZero(counts.containers),
      warnings: numberOrZero(counts.warnings),
      openIntents: numberOrZero(counts.openIntents)
    },
    decision: removeEmpty({
      action: envelope.action,
      reasonCodes,
      reasons: explainReasonCodes(reasonCodes),
      projectLocalWork: envelope.projectLocalWork,
      environmentChanges: envelope.environmentChanges,
      question: envelope.userQuestion,
      requiresHumanApprovalBefore: boundedArray(envelope.requiresHumanApprovalBefore, 8),
      removalAuthorized: envelope.removalAuthorized === true
    }),
    review: removeEmpty({
      dependency: dependency.status,
      dependencyTargets: boundedArray(dependency.reviewTargets, 8),
      scannerEvidence: dependency.scannerEvidence,
      reconciliation: reconciliation.decision,
      reconciliationFreshness: reconciliation.freshness,
      externalSbom: externalSbom.decision
    }),
    next: removeEmpty({
      command: input.nextCommand || envelope.nextSafeCommand,
      setupCommand: input.setupCommand,
      detailCommand: input.detailCommand
    }),
    evidence: removeEmpty({
      startHere: input.startHere,
      readOrder: boundedArray(input.readOrder, 6),
      reconciliation: reconciliation.artifact,
      coordinationRevision: input.coordinationRevision
    }),
    discovery: removeEmpty({
      decision: input.discoveryDecision,
      proofCommand: input.discoveryProofCommand,
      copyPastePrompt: input.copyPastePrompt
    }),
    rule: "Use this compact projection for the first decision. Read the referenced full artifacts before environment, dependency, security, install, removal, or runtime changes."
  });
}

function boundedArray(value, maximum) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, maximum) : [];
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function removeEmpty(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));
}
