import test from "node:test";
import assert from "node:assert/strict";
import { buildAiDecisionEnvelope } from "../src/ai-decision-envelope.js";

test("AI decision envelope stays compact and conservative when clear", () => {
  const result = buildAiDecisionEnvelope({ decision: "clear", nextSafeCommand: "aienvmap status --json" });
  assert.equal(result.decision, "clear");
  assert.deepEqual(result.reasonCodes, ["no-review-signal"]);
  assert.equal(result.requiresHumanApproval, false);
  assert.equal(result.environmentChanges, "intent-first");
  assert.equal(result.removalAuthorized, false);
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
  assert.equal(result.nextSafeCommand, "aienvmap plan --write");
});
