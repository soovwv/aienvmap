import test from "node:test";
import assert from "node:assert/strict";
import { compactStartPreflight, compactStatusPreflight } from "../src/compact-preflight.js";

const status = {
  state: "review-required",
  summary: "Review one project declaration conflict.",
  counts: { runtimes: 2, packageManagers: 1, containers: 0, warnings: 1, openIntents: 1 },
  coordinationRevision: "ir1:0123456789abcdef",
  aiDecisionEnvelope: {
    action: "ask-bounded-question",
    reasonCodes: ["project-declaration-conflict"],
    projectLocalWork: "allowed",
    environmentChanges: "intent-first",
    userQuestion: "Which declared runtime should be authoritative?",
    requiresHumanApprovalBefore: ["runtime-switch", "removal"],
    removalAuthorized: false
  },
  dependencyQuickCheck: { status: "review", reviewTargets: ["node"], scannerEvidence: "scanner-off" },
  reconciliation: { decision: "review", freshness: "fresh", artifact: ".aienvmap/reconcile.json" },
  externalSbom: { decision: "no-external-evidence" },
  nextCommand: "aienvmap plan --write",
  quickstart: { detailCommand: "aienvmap context --json" },
  artifacts: { startHere: ".aienvmap/README.md" },
  aiSession: { start: ["aienvmap status --json", "aienvmap context --json"] }
};

test("compact status preflight keeps only first-decision evidence", () => {
  const result = compactStatusPreflight(status);

  assert.equal(result.schemaName, "aienvmap-compact-preflight");
  assert.equal(result.source, "status");
  assert.equal(result.state, "review-required");
  assert.equal(result.counts.warnings, 1);
  assert.equal(result.decision.question, "Which declared runtime should be authoritative?");
  assert.deepEqual(result.decision.reasons, ["Project files declare incompatible environment requirements."]);
  assert.equal(result.decision.removalAuthorized, false);
  assert.equal(result.review.reconciliationFreshness, "fresh");
  assert.equal(result.evidence.coordinationRevision, "ir1:0123456789abcdef");
  assert.equal(JSON.stringify(result).length < 3000, true);
});

test("compact start preflight adds startup and discovery evidence", () => {
  const result = compactStartPreflight({
    decision: "review-required",
    mode: "synced",
    summary: status.summary,
    aiDecisionEnvelope: status.aiDecisionEnvelope,
    nextCommand: status.nextCommand,
    nextSetupCommand: "npx aienvmap onboard",
    startHere: ".aienvmap/discovery.json",
    readOrder: [".aienvmap/discovery.json", ".aienvmap/status.json"],
    reconciliation: status.reconciliation,
    externalSbom: status.externalSbom,
    discoveryDecision: "fallback-required",
    sessionUse: { proofCommand: "npx aienvmap discover --json" },
    copyPastePrompt: "Read .aienvmap/discovery.json first."
  }, status);

  assert.equal(result.source, "start");
  assert.equal(result.mode, "synced");
  assert.equal(result.discovery.decision, "fallback-required");
  assert.equal(result.discovery.proofCommand, "npx aienvmap discover --json");
  assert.equal(result.next.setupCommand, "npx aienvmap onboard");
  assert.equal(JSON.stringify(result).length < 3000, true);
});
