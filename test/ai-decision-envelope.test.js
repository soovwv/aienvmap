import test from "node:test";
import assert from "node:assert/strict";
import { buildAiDecisionEnvelope } from "../src/ai-decision-envelope.js";

test("AI decision envelope stays compact and conservative when clear", () => {
  const result = buildAiDecisionEnvelope({ decision: "clear", nextSafeCommand: "aienvmap status --json" });
  assert.equal(result.decision, "clear");
  assert.deepEqual(result.reasonCodes, ["no-review-signal"]);
  assert.equal(result.requiresHumanApproval, false);
  assert.deepEqual(result.requiresHumanApprovalBefore, ["removal", "global-install", "runtime-switch", "lockfile-rewrite"]);
  assert.equal(result.environmentChanges, "intent-first");
  assert.equal(result.removalAuthorized, false);
  assert.equal(result.action, "continue-project-local-work");
  assert.equal(result.userQuestion, null);
  assert.equal(result.questionRequired, false);
  assert.equal(result.observationAuthority, "observed-not-approved");
  assert.match(result.neverDo.join(" "), /observed state as an approved baseline/);
});

test("AI decision envelope deduplicates bounded review evidence", () => {
  const result = buildAiDecisionEnvelope({
    decision: "review-required",
    reasonCodes: ["runtime-drift", "runtime-drift", ...Array.from({ length: 30 }, (_, index) => `reason-${index}`)],
    evidenceRefs: [".aienvmap/status.json", ".aienvmap/status.json", "aienvmap context --json"],
    nextSafeCommand: "aienvmap plan --write"
  });
  assert.equal(result.decision, "review");
  assert.equal(result.reasonCodes.length, 20);
  assert.deepEqual(result.evidenceRefs, [".aienvmap/status.json", "aienvmap context --json"]);
  assert.equal(result.requiresHumanApproval, true);
  assert.ok(result.requiresHumanApprovalBefore.includes("removal"));
  assert.equal(result.nextSafeCommand, "aienvmap plan --write");
  assert.equal(result.action, "review-evidence-before-environment-change");
  assert.equal(result.questionRequired, true);
  assert.match(result.userQuestion, /Multiple or conflicting runtime routes/);
});

test("AI decision envelope asks a bounded coordination question instead of guessing intent", () => {
  const result = buildAiDecisionEnvelope({
    decision: "review-required",
    reasonCodes: ["open-intents", "multi-agent-records"],
    evidenceRefs: [".aienvmap/intents.jsonl"]
  });
  assert.match(result.userQuestion, /coordinate with that intent, wait, or prepare a non-applying proposal/);
  assert.equal(result.removalAuthorized, false);
  assert.equal(result.observationAuthority, "observed-not-approved");
});

test("AI decision envelope asks for read-only evidence before security claims", () => {
  const result = buildAiDecisionEnvelope({ decision: "review", reasonCodes: ["external-sbom-stale"] });
  assert.match(result.userQuestion, /read-only evidence command/);
  assert.match(result.neverDo.join(" "), /without approval/);
});
