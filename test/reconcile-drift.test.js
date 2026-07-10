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

test("compareReconciliation detects a package-manager runtime routing change", () => {
  const baseline = report();
  baseline.npm.runtimeLinks = [{ managerPath: "$HOME/npm", runtimePath: "$HOME/node20", relationship: "co-located-executables", confidence: "strong", ownershipProven: false }];
  const current = report();
  current.npm.runtimeLinks = [{ managerPath: "$HOME/npm", runtimePath: "$HOME/node24", relationship: "path-precedence-inference", confidence: "medium", ownershipProven: false }];
  const result = compareReconciliation(baseline, current);
  assert.equal(result.decision, "review");
  assert.ok(result.drift.changedSections.includes("npm"));
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /npm\.runtimeLinks/);
});

test("compareReconciliation detects Python installer evidence drift", () => {
  const baseline = report();
  baseline.python.installations = [{ path: "$HOME/python", version: "3.12", installerEvidence: { collection: "collected", installerCounts: { pip: 2 }, digest: "one" } }];
  const current = report();
  current.python.installations = [{ path: "$HOME/python", version: "3.12", installerEvidence: { collection: "collected", installerCounts: { pip: 1, uv: 1 }, digest: "two" } }];
  const result = compareReconciliation(baseline, current);
  assert.equal(result.decision, "review");
  assert.ok(result.drift.changedSections.includes("python"));
  const installationChange = result.drift.changes.find((item) => item.field === "python.installations");
  assert.ok(installationChange);
  assert.deepEqual(installationChange.before[0].installerEvidence.installerCounts, { pip: 2 });
  assert.deepEqual(installationChange.after[0].installerEvidence.installerCounts, { pip: 1, uv: 1 });
});

test("compareReconciliation detects Python manager ownership evidence drift", () => {
  const baseline = report();
  baseline.python.installations = [{ path: "$HOME/python", version: "3.12", managerEvidence: { manager: "unknown", confidence: "none", ownershipProven: false } }];
  baseline.python.managerEvidence = { collection: "not-requested" };
  const current = report();
  current.python.installations = [{ path: "$HOME/python", version: "3.12", managerEvidence: { manager: "uv", confidence: "strong", ownershipProven: true, removalAuthorized: false } }];
  current.python.managerEvidence = { collection: "collected", manager: "uv", installationCount: 1 };
  const result = compareReconciliation(baseline, current);
  assert.equal(result.decision, "review");
  assert.ok(result.drift.changedSections.includes("python"));
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /python\.managerEvidence/);
});

test("compareReconciliation detects OS-native Java discovery evidence drift", () => {
  const baseline = report();
  baseline.otherRuntimes.java = { installations: [], distinctVersions: [], discoveryEvidence: { sources: [], osNativeCount: 0 } };
  const current = report();
  current.otherRuntimes.java = {
    installations: [{ runtime: "java", path: "/usr/lib/jvm/java-21/bin/java", version: "21", source: "linux-alternatives", discovery: "os-native" }],
    distinctVersions: ["21"],
    discoveryEvidence: { sources: ["linux-alternatives"], osNativeCount: 1 }
  };
  const result = compareReconciliation(baseline, current);
  assert.equal(result.decision, "review");
  assert.ok(result.drift.changedSections.includes("otherRuntimes"));
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /otherRuntimes\.java/);
});

test("compareReconciliation detects Java vendor and architecture drift", () => {
  const baseline = report();
  baseline.otherRuntimes.java = {
    installations: [{ runtime: "java", path: "/java", version: "21", vendor: "Microsoft", architecture: "amd64", runtimeKind: "jdk" }],
    distinctVersions: ["21"],
    runtimeMetadata: { vendors: ["Microsoft"], architectures: ["amd64"], runtimeKinds: ["jdk"] }
  };
  const current = report();
  current.otherRuntimes.java = {
    installations: [{ runtime: "java", path: "/java", version: "21", vendor: "Eclipse Adoptium", architecture: "aarch64", runtimeKind: "jdk" }],
    distinctVersions: ["21"],
    runtimeMetadata: { vendors: ["Eclipse Adoptium"], architectures: ["aarch64"], runtimeKinds: ["jdk"] }
  };
  const result = compareReconciliation(baseline, current);
  assert.equal(result.decision, "review");
  assert.match(result.drift.changes.map((item) => item.field).join(" "), /otherRuntimes\.java\.runtimeMetadata/);
});
