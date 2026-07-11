import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePerformanceMeasurement, evaluateWorkspaceMeasurement, performanceBudget } from "../src/performance-budget.js";

test("performance budgets cover core AI entry and inventory paths", () => {
  assert.deepEqual(Object.keys(performanceBudget.commands), ["scorecard", "start", "reconcileQuick"]);
  assert.equal(performanceBudget.mode, "regression-guard-not-benchmark");
  assert.match(performanceBudget.rule, /not latency promises/);
});

test("performance command evaluation reports every exceeded ceiling", () => {
  const result = evaluatePerformanceMeasurement("scorecard", { durationMs: 6000, stdoutBytes: 70000 });
  assert.equal(result.pass, false);
  assert.equal(result.failures.length, 2);
});

test("workspace budget bounds generated files and bytes", () => {
  const clear = evaluateWorkspaceMeasurement({ generatedBytes: 1000, generatedFiles: 2 });
  const exceeded = evaluateWorkspaceMeasurement({ generatedBytes: 4000000, generatedFiles: 40 });
  assert.equal(clear.pass, true);
  assert.equal(exceeded.pass, false);
  assert.equal(exceeded.failures.length, 2);
});
