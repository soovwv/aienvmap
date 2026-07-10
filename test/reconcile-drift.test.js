import test from "node:test";
import assert from "node:assert/strict";
import { compareReconciliation, reconciliationSnapshot } from "../src/reconcile-drift.js";

function report(overrides = {}) {
  return {
    generatedAt: "2026-07-10T00:00:00.000Z",
    scanMode: "standard",
    project: { packageManager: { name: "npm", version: "11" }, lockManagers: ["npm"] },
    node: { installations: [{ path: "$HOME/node", version: "24.0.0", active: true, source: "PATH", scope: "current-user" }], distinctVersions: ["24.0.0"] },
    npm: { installations: [{ path: "$HOME/npm", version: "11.0.0", active: true, globalRoot: "$HOME/npm-global", globalPackages: [{ name: "aienvmap", version: "0.1.0" }] }], distinctVersions: ["11.0.0"], distinctGlobalRoots: ["$HOME/npm-global"] },
    python: { installations: [], distinctVersions: [], packageLocations: [], pipCommands: [] },
    otherRuntimes: { java: { installations: [], distinctVersions: [] } },
    ...overrides
  };
}

test("reconciliationSnapshot ignores timestamps and presentation-only findings", () => {
  const first = reconciliationSnapshot({ ...report(), findings: [{ code: "one" }] });
  const second = reconciliationSnapshot({ ...report(), generatedAt: "later", findings: [{ code: "two" }] });
  assert.deepEqual(first, second);
});

test("compareReconciliation returns a stable clear decision for the same host state", () => {
  const result = compareReconciliation(report(), { ...report(), generatedAt: "later" });
  assert.equal(result.decision, "clear");
  assert.equal(result.exitCode, 0);
  assert.equal(result.drift.detected, false);
  assert.equal(result.baseline.fingerprint, result.current.fingerprint);
  assert.equal(result.aiDecision.safeToProceed, true);
});

test("compareReconciliation identifies runtime and project drift for AI review", () => {
  const current = report({
    project: { packageManager: { name: "pnpm", version: "10" }, lockManagers: ["pnpm"] },
    node: { installations: [{ path: "$HOME/node", version: "24.1.0", active: true, source: "PATH", scope: "current-user" }], distinctVersions: ["24.1.0"] }
  });
  const result = compareReconciliation(report(), current);
  assert.equal(result.decision, "review");
  assert.equal(result.exitCode, 2);
  assert.equal(result.drift.detected, true);
  assert.deepEqual(result.drift.changedSections, ["node", "project"]);
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /node\.distinctVersions/);
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /project\.packageManager/);
  assert.equal(result.aiDecision.safeToProceed, false);
  assert.match(result.aiDecision.rule, /does not authorize cleanup/);
});
