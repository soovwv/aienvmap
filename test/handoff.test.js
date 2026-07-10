import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildHandoff, handoffWorkspace } from "../src/commands/handoff.js";
import { renderHandoff } from "../src/render.js";
import { writeJson } from "../src/fsutil.js";

test("buildHandoff summarizes next-agent environment state", () => {
  const handoff = buildHandoff({
    schemaVersion: 1,
    trust: { state: "observed", verified: false },
    workspace: { path: "/tmp/work", name: "work" },
    runtimes: { node: "24.0.0", python: "3.11.0" },
    containers: { docker: "29.0.0" },
    security: {
      mode: "security",
      enabled: true,
      summary: { total: 1, critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
      topPackages: [{ name: "lodash", severity: "high", fixAvailable: true }]
    },
    dependencySnapshot: {
      summary: { packages: 1, ecosystems: ["npm"] },
      manifests: ["package.json"]
    },
    lightSbom: {
      riskSummary: {
        level: "high",
        score: 80,
        scanner: "enabled",
        reviewTargets: ["package.json", "lodash"]
      },
      aiDependencyReview: {
        status: "review",
        securityConfidence: "scanner-summary",
        reviewTargets: ["package.json", "lodash"],
        beforeDependencyChange: ["aienvmap sync --security", "aienvmap plan --write"]
      },
      dependencyQuickCheck: {
        status: "review",
        nextCommand: "aienvmap sync --security",
        scannerEvidence: "scanner-summary",
        reviewTargets: ["package.json", "lodash"],
        mustNotDo: ["do not run broad install commands before reading SBOM"],
        rule: "Use this compact block as the first AI dependency-work decision."
      },
      dependencyChangeHints: [{
        manifest: "package.json",
        ecosystem: "npm",
        manager: "npm",
        groups: ["dependencies"],
        lockfiles: [{ file: "package-lock.json" }],
        packages: 1,
        riskPackages: [{ name: "lodash" }]
      }]
    }
  }, [{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    summary: "updated node policy"
  }], [], [], { node: "24" });

  assert.equal(handoff.status, "clear");
  assert.equal(handoff.nextSafeCommand, "aienvmap intent --actor agent:id --action planned-change --target environment");
  assert.equal(handoff.startHere, ".aienvmap/README.md");
  assert.equal(handoff.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(handoff.readOrder[1], ".aienvmap/README.md");
  assert.equal(handoff.readOrder[2], ".aienvmap/status.json");
  assert.equal(handoff.aiBootstrap.nextSafeCommand, handoff.nextSafeCommand);
  assert.equal(handoff.aiBootstrap.readFirst, ".aienvmap/status.json");
  assert.equal(handoff.preflight.state, "clear");
  assert.equal(handoff.preflight.artifacts.envMap, "AIENV.md");
  assert.equal(handoff.decision.mode, "project-local-work");
  assert.equal(handoff.decision.canChangeEnvironmentWithoutReview, true);
  assert.equal(handoff.trust.state, "observed");
  assert.equal(handoff.schemaVersion, 1);
  assert.equal(handoff.safeRuntime.node, "24.0.0");
  assert.equal(handoff.security.topPackages[0].name, "lodash");
  assert.equal(handoff.policy.node, "24");
  assert.equal(handoff.recommendedActions[0].id, "review-security-remediation");
  assert.equal(handoff.dependencyHandoff.readSet[0].manifest, "package.json");
  assert.equal(handoff.dependencyHandoff.protocol.mode, "advisory");
  assert.equal(handoff.dependencyHandoff.quickCheck.status, "review");
  assert.equal(handoff.dependencyHandoff.quickCheck.nextCommand, "aienvmap sync --security");
  assert.equal(handoff.dependencyHandoff.protocol.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.equal(handoff.continuation.status, "clear");
  assert.equal(handoff.continuation.resume.purpose, "Minimum next-AI routine for continuing from the same environment map.");
  assert.equal(handoff.continuation.resume.readFirst[0], ".aienvmap/status.json");
  assert.equal(handoff.continuation.resume.nextCommand, handoff.continuation.nextCommand);
  assert.match(handoff.continuation.resume.beforeEnvironmentChange, /planned-change/);
  assert.match(handoff.continuation.resume.afterEnvironmentChange, /checkpoint/);
  assert.match(handoff.continuation.resume.handoff, /handoff --record/);
  assert.match(handoff.continuation.resume.mustNotDo.join(" "), /continue from memory only/);
  assert.match(handoff.continuation.resume.rule, /Every next AI/);
  assert.equal(handoff.continuation.discovery.decision, "fallback-required");
  assert.equal(handoff.continuation.discovery.nextSetupCommand, "aienvmap onboard");
  assert.equal(handoff.continuation.discovery.fallbackCommand, "aienvmap start --json");
  assert.match(handoff.continuation.discovery.rule, /auto-loaded/);
  assert.equal(handoff.continuation.maintenance.mode, "advisory");
  assert.equal(handoff.continuation.strict.localCommand, "aienvmap doctor --json");
  assert.equal(handoff.continuation.strict.shouldFailLocal, false);
  assert.equal(handoff.continuation.sbomReview.status, "review");
  assert.equal(handoff.continuation.sbomReview.securityConfidence, "scanner-summary");
  assert.deepEqual(handoff.continuation.sbomReview.reviewTargets, ["package.json", "lodash"]);
  assert.equal(handoff.continuation.dependencyQuickCheck.status, "review");
  assert.deepEqual(handoff.continuation.dependencyQuickCheck.reviewTargets, ["package.json", "lodash"]);
  assert.equal(handoff.agentActivity.environmentRecordCount, 1);
  assert.match(renderHandoff(handoff), /AI Handoff/);
  assert.match(renderHandoff(handoff), /Decision: project-local-work/);
  assert.match(renderHandoff(handoff), /AI continuation/);
  assert.match(renderHandoff(handoff), /Resume: \.aienvmap\/status\.json/);
  assert.match(renderHandoff(handoff), /Discovery: fallback-required \/ missing: run aienvmap onboard \/ aienvmap onboard/);
  assert.match(renderHandoff(handoff), /Discovery fallback: aienvmap start --json/);
  assert.match(renderHandoff(handoff), /Before env: aienvmap intent/);
  assert.match(renderHandoff(handoff), /After env: aienvmap checkpoint/);
  assert.match(renderHandoff(handoff), /Local check: aienvmap doctor --json \(warn-only\)/);
  assert.match(renderHandoff(handoff), /SBOM review: review \/ high \/ aienvmap sync --security/);
  assert.match(renderHandoff(handoff), /Dependency quick check: review \/ scanner-summary \/ aienvmap sync --security/);
  assert.match(renderHandoff(handoff), /Agent activity/);
  assert.match(renderHandoff(handoff), /Recommended actions/);
  assert.match(renderHandoff(handoff), /Dependency handoff/);
  assert.match(renderHandoff(handoff), /checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(renderHandoff(handoff), /Recommended next/);
});

test("handoffWorkspace can record handoff timeline entries", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-handoff-record-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {}
  });

  const originalLog = console.log;
  console.log = () => {};
  try {
    await handoffWorkspace({ dir, record: true, actor: "agent:codex", json: true });
  } finally {
    console.log = originalLog;
  }
  const timeline = await fs.readFile(path.join(dir, ".aienvmap", "timeline.jsonl"), "utf8");

  assert.match(timeline, /agent-handoff/);
  assert.match(timeline, /agent:codex/);
});

test("buildHandoff requires review when open intents exist", () => {
  const handoff = buildHandoff({
    trust: { state: "observed", verified: false },
    workspace: { path: "/tmp/work", name: "work" },
    runtimes: {},
    containers: {}
  }, [], [], [{
    actor: "agent:claude",
    action: "install pnpm",
    target: "pnpm"
  }], {});

  assert.equal(handoff.status, "review-required");
  assert.equal(handoff.nextSafeCommand, "aienvmap context --json");
  assert.equal(handoff.aiBootstrap.nextSafeCommand, "aienvmap context --json");
  assert.equal(handoff.preflight.state, "review-required");
  assert.equal(handoff.preflight.agentUse.environmentChanges, "intent-and-review-first");
  assert.equal(handoff.decision.mode, "review-first");
  assert.equal(handoff.decision.pendingIntentCount, 1);
  assert.equal(handoff.openIntents.length, 1);
  assert.equal(handoff.recommendedActions[0].id, "review-open-intents");
});

test("buildHandoff exposes coordination summary for next agents", () => {
  const handoff = buildHandoff({
    trust: { state: "observed", verified: false },
    workspace: { path: "/tmp/work", name: "work" },
    runtimes: {},
    containers: {},
    dependencySnapshot: { summary: { packages: 1 } }
  }, [], [], [
    { actor: "agent:codex", action: "update dependency", target: "dependency" },
    { actor: "agent:gemini", action: "fix vulnerable package" }
  ], {});

  assert.deepEqual(handoff.coordination.conflictTargets, ["dependency"]);
  assert.equal(handoff.coordinationResolution.status, "review");
  assert.deepEqual(handoff.continuation.coordinationResolution.targets, ["dependency"]);
  assert.equal(handoff.continuation.coordinationResolution.nextCommand, "aienvmap plan --write");
  assert.match(renderHandoff(handoff), /Coordination/);
  assert.match(renderHandoff(handoff), /Conflicts: dependency/);
});

test("buildHandoff exposes multi-agent activity for next agents", () => {
  const handoff = buildHandoff({
    trust: { state: "observed", verified: false },
    workspace: { path: "/tmp/work", name: "work" },
    runtimes: {},
    containers: {},
    dependencySnapshot: { summary: { packages: 1 } }
  }, [
    {
      at: "2026-07-08T00:00:00.000Z",
      actor: "agent:codex",
      type: "agent-record",
      target: "dependency",
      summary: "dependency-change"
    },
    {
      at: "2026-07-08T00:01:00.000Z",
      actor: "agent:claude",
      type: "agent-record",
      target: "dependency",
      summary: "dependency remediation"
    }
  ], [], [], {});

  assert.deepEqual(handoff.agentActivity.multiActorTargets, ["dependency"]);
  assert.match(renderHandoff(handoff), /multi-agent/);
});

test("buildHandoff carries follow-up plan into continuation", () => {
  const handoff = buildHandoff({
    trust: { state: "observed", verified: false },
    workspace: { path: "/tmp/work", name: "work" },
    runtimes: {},
    containers: {},
    dependencySnapshot: { summary: { packages: 1 } }
  }, [{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    target: "dependency",
    summary: "dependency-change",
    followUp: {
      required: true,
      target: "dependency",
      commands: ["aienvmap sync", "aienvmap status --write"]
    }
  }], [], [], {});

  assert.equal(handoff.continuation.followUpPlan.status, "pending");
  assert.match(handoff.continuation.resume.mustNotDo.join(" "), /pending follow-ups/);
  assert.equal(handoff.continuation.followUpPlan.nextCommand, "aienvmap sync");
  assert.deepEqual(handoff.continuation.followUpPlan.targets, ["dependency"]);
  assert.match(renderHandoff(handoff), /Follow-up: pending \/ aienvmap sync \/ dependency/);
});
