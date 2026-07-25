import test from "node:test";
import assert from "node:assert/strict";
import { explainReasonCode, explainReasonCodes } from "../src/reason-explanations.js";

test("known internal reason codes have plain-language explanations", () => {
  assert.equal(
    explainReasonCode("multiple-python-installations"),
    "More than one Python command was detected; aliases may refer to the same environment."
  );
});

test("project declaration variants stay useful without an exhaustive code registry", () => {
  assert.equal(
    explainReasonCode("python-project-declarations-conflict"),
    "Project files contain conflicting declarations for the same tool or runtime."
  );
  assert.equal(
    explainReasonCode("node-project-declarations-unresolved"),
    "Project files declare an environment requirement that could not be resolved safely."
  );
});

test("reason explanations are deduplicated and bounded", () => {
  assert.deepEqual(explainReasonCodes([
    "open-intents",
    "open-intents",
    "manifest-stale"
  ], 1), [
    "Another recorded environment change is still open and should be coordinated first."
  ]);
});
