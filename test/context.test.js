import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { contextWorkspace } from "../src/commands/context.js";
import { writeJson } from "../src/fsutil.js";

test("contextWorkspace JSON includes compact step summary", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-context-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: { node: "24.0.0" },
    packageManagers: {},
    containers: {},
    projectHints: { nvmrc: "20" },
    agentFiles: {
      agents: { path: "AGENTS.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet codex --write", role: "codex" }
    },
    dependencySnapshot: {
      mode: "snapshot",
      enabled: true,
      summary: { ecosystems: ["npm"], manifests: 1, packages: 1 },
      packages: [{ ecosystem: "npm", name: "express", version: "^4.18.0", manifest: "package.json", group: "dependencies" }]
    },
    lightSbom: {
      mode: "light-sbom",
      summary: {
        ecosystems: { npm: 1 },
        managers: { npm: 1 },
        groups: { dependencies: 1 },
        manifests: ["package.json"],
        packages: 1,
        vulnerabilities: 0,
        directVulnerablePackages: 0,
        transitiveOrUnmatchedVulnerablePackages: 0
      },
      topRisk: [],
      riskSummary: {
        level: "low",
        score: 5,
        scanner: "off",
        next: "Run read-only security scan before dependency or release decisions.",
        signals: ["security scanner summary is off"],
        commands: ["aienvmap sync --security"]
      },
      dependencyChangeHints: [{
        manifest: "package.json",
        ecosystem: "npm",
        manager: "npm",
        groups: ["dependencies"],
        lockfiles: [{ file: "package-lock.json", ecosystem: "npm", manager: "npm" }],
        packages: 1,
        riskPackages: []
      }],
      dependencyQuickCheck: {
        status: "review",
        nextCommand: "aienvmap sync --security",
        scannerEvidence: "scanner-off",
        reviewTargets: ["package.json"],
        mustNotDo: ["do not run broad install commands before reading SBOM"]
      },
      source: {
        dependencies: "project manifests",
        lockfiles: "file presence only",
        vulnerabilities: "not scanned",
        resolver: "not run"
      },
      confidence: {
        directDependencies: "high",
        transitiveDependencies: "not-resolved",
        vulnerabilities: "not-scanned"
      },
      limitations: ["Does not install packages."],
      aiUse: { dependencySource: "project manifests only; no install or resolver is run" }
    },
    security: { enabled: false }
  });
  await fs.writeFile(path.join(dir, ".aienvmap", "timeline.jsonl"), `${JSON.stringify({
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    summary: "dependency-change",
    followUp: {
      required: true,
      target: "dependency",
      commands: ["aienvmap sync"]
    }
  })}\n`, "utf8");

  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await contextWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(output);
  assert.equal(json.status, "review-required");
  assert.equal(json.aiDecisionEnvelope.decision, "review");
  assert.equal(json.aiDecisionEnvelope.nextSafeCommand, json.nextSafeCommand);
  assert.equal(json.aiDecisionEnvelope.requiresHumanApproval, true);
  assert.equal(json.nextSafeCommand, "aienvmap sync");
  assert.equal(json.startHere, ".aienvmap/README.md");
  assert.equal(json.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(json.readOrder[1], ".aienvmap/README.md");
  assert.equal(json.readOrder[2], ".aienvmap/status.json");
  assert.equal(json.aiSession.start[0], "aienvmap status --json");
  assert.equal(json.aiSession.start[1], "aienvmap context --json");
  assert.equal(json.aiSession.ifMissingOrStale, "aienvmap sync");
  assert.equal(json.aiSession.beforeEnvironmentChange, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(json.aiSession.afterEnvironmentChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.match(json.aiSession.avoid.join(" "), /lockfile rewrite/);
  assert.match(json.aiSession.avoid.join(" "), /light SBOM review/);
  assert.equal(json.preflight.aiSession.nextCommand, "aienvmap sync");
  assert.equal(json.aiBootstrap.nextSafeCommand, "aienvmap sync");
  assert.equal(json.aiBootstrap.localMode, "advisory");
  assert.equal(json.artifactFreshness.state, "fresh");
  assert.equal(json.artifactFreshness.nextCommand, "aienvmap status --json");
  assert.equal(json.artifactFreshness.refreshCommand, "aienvmap sync");
  assert.equal(json.preflight.artifactFreshness.state, "fresh");
  assert.equal(json.preflight.state, "review-required");
  assert.equal(json.preflight.contract.name, "aienvmap-preflight");
  assert.ok(json.preflight.contract.requiredFields.includes("decision"));
  assert.equal(json.preflight.artifacts.status, ".aienvmap/status.json");
  assert.equal(json.preflight.commands.context, "aienvmap context --json");
  assert.equal(json.aiReadiness.level, "review");
  assert.equal(json.aiReadiness.requiresHumanReview, true);
  assert.match(json.aiReadiness.signals.join(" "), /pointer/);
  assert.match(json.aiReadiness.safeProjectLocalActions.join(" "), /code-only work/);
  assert.match(json.aiReadiness.reviewOnlyEnvironmentChanges, /strict failure remains opt-in/);
  assert.equal(json.collaboration.status, "review-before-env-change");
  assert.deepEqual(json.collaboration.activeTargets, ["dependency"]);
  assert.equal(json.collaboration.nextCommand, "aienvmap sync");
  assert.equal(json.coordinationResolution.status, "review");
  assert.deepEqual(json.coordinationResolution.targets, ["dependency"]);
  assert.equal(json.coordinationResolution.nextCommand, "aienvmap sync");
  assert.match(json.coordinationResolution.rule, /advisory resolution routine/);
  assert.equal(json.maintenanceLoop.mode, "advisory");
  assert.equal(json.maintenanceLoop.nextCommand, "aienvmap sync");
  assert.equal(json.maintenanceLoop.cycle[5].command, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.equal(json.maintenanceLoop.sbomCommand, "aienvmap sync --security");
  assert.equal(json.maintenanceLoop.sbomReview.nextCommand, "aienvmap sync --security");
  assert.match(json.maintenanceLoop.triggers.join(" "), /AI coding session/);
  assert.match(json.maintenanceLoop.rule, /lightweight/);
  assert.equal(json.environmentChangeProtocol.mode, "advisory");
  assert.equal(json.environmentChangeProtocol.commands.readStatus, "aienvmap status --json");
  assert.equal(json.environmentChangeProtocol.commands.recordIntent, "aienvmap intent --actor agent:id --action planned-change --target node");
  assert.equal(json.environmentChangeProtocol.commands.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary what-changed --target node");
  assert.equal(json.preflight.environmentChangeProtocol.commands.handoff, "aienvmap handoff --record --actor agent:id");
  assert.match(json.environmentChangeProtocol.mustNotDo.join(" "), /open intents/);
  assert.match(json.collaboration.reviewSignals.join(" "), /pending post-change follow-up/);
  assert.equal(json.preflight.quickstart.beforeEnvironmentChange, "aienvmap intent --actor agent:id --action planned-change --target <runtime|package-manager|docker|dependency>");
  assert.equal(json.preflight.intentTargets[0].target, "node");
  assert.equal(json.preflight.dependencyReadSet[0].manifest, "package.json");
  assert.deepEqual(json.preflight.dependencyReadSet[0].lockfiles, ["package-lock.json"]);
  assert.equal(json.preflight.dependencyChangeProtocol.commands.recordAfterChange, "aienvmap record --actor agent:id --summary dependency-change --target dependency");
  assert.equal(json.preflight.dependencyChangeProtocol.commands.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.equal(json.dependencyQuickCheck.status, "review");
  assert.equal(json.dependencyQuickCheck.nextCommand, "aienvmap sync --security");
  assert.equal(json.preflight.dependencyQuickCheck.scannerEvidence, "scanner-off");
  assert.equal(json.externalSbom.decision, "no-external-evidence");
  assert.equal(json.preflight.externalSbom.removalAuthorized, false);
  assert.equal(json.coordination.openIntentCount, 0);
  assert.deepEqual(json.coordination.conflictTargets, []);
  assert.deepEqual(json.agentPointers.missing, ["codex"]);
  assert.equal(json.agentPointers.targets[0].installCommand, "aienvmap snippet codex --write");
  assert.equal(json.followUps[0].target, "dependency");
  assert.equal(json.preflight.followUps[0].commands[0], "aienvmap sync");
  assert.equal(json.followUpPlan.status, "pending");
  assert.equal(json.followUpPlan.nextCommand, "aienvmap sync");
  assert.deepEqual(json.followUpPlan.targets, ["dependency"]);
  assert.equal(json.preflight.followUpPlan.reason, "Previous environment-affecting records still need refresh, status, or handoff follow-up.");
  assert.equal(json.decision.schemaVersion, 1);
  assert.equal(json.decision.mode, "review-first");
  assert.equal(json.decision.canContinueProjectLocalWork, true);
  assert.equal(json.decision.canChangeEnvironmentWithoutReview, false);
  assert.equal(json.decision.clearDecisionGrantsEnvironmentAuthority, false);
  assert.equal(json.decision.proceedScope, "project-local-work-only");
  assert.deepEqual(json.decision.warningCodes, ["node-version-mismatch", "handoff-stale"]);
  assert.equal(json.decision.requiredCommands.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary what-changed --target environment");
  assert.equal(json.decision.requiredCommands.reviewPlan, "aienvmap plan");
  assert.equal(json.enforcement.mode, "advisory-by-default");
  assert.equal(json.enforcement.localBehavior, "non-blocking");
  assert.deepEqual(json.enforcement.suggestedStrictScopes, ["policy", "coordination"]);
  assert.equal(json.enforcement.strictPlan.recommendedStrictScope, "policy");
  assert.equal(json.enforcement.strictPlan.ciCommand, "aienvmap doctor --strict policy --json");
  assert.equal(json.enforcement.strictDecision.localCommand, "aienvmap doctor --json");
  assert.equal(json.enforcement.strictDecision.ciCommand, "aienvmap doctor --strict policy --json");
  assert.equal(json.strictRecommendation.localBehavior, "warn-only");
  assert.equal(json.strictRecommendation.shouldFailLocal, false);
  assert.equal(json.strictRecommendation.recommendedScope, "policy");
  assert.equal(json.strictRecommendation.ciCommand, "aienvmap doctor --strict policy --json");
  assert.equal(json.strictRecommendation.releaseCommand, "aienvmap doctor --strict all --json");
  assert.equal(json.operationalSafety.defaultBehavior, "warn-only");
  assert.match(json.operationalSafety.mustNotDo.join(" "), /global software automatically/);
  assert.match(json.preflight.operationalSafety.rule, /local operation lightweight/);
  assert.equal(json.qualitySignals.status, "release-candidate");
  assert.ok(json.qualitySignals.principles.includes("simple"));
  assert.match(json.qualitySignals.checks.map((item) => item.signal).join(" "), /fallback prompt/);
  assert.match(json.qualitySignals.recommendWhenAllTrue.join(" "), /light SBOM limitations/);
  assert.equal(json.preflight.qualitySignals.rule, json.qualitySignals.rule);
  assert.equal(json.dependencySnapshot.summary.packages, 1);
  assert.equal(json.dependencySnapshot.packages[0].name, "express");
  assert.equal(json.lightSbom.summary.packages, 1);
  assert.equal(json.sbomRisk.level, "low");
  assert.equal(json.lightSbom.riskSummary.scanner, "off");
  assert.equal(json.lightSbom.dependencyChangeHints[0].manifest, "package.json");
  assert.equal(json.lightSbom.dependencyQuickCheck.status, "review");
  assert.equal(json.lightSbom.source.dependencies, "project manifests");
  assert.equal(json.lightSbom.confidence.transitiveDependencies, "not-resolved");
  assert.match(json.lightSbom.limitations[0], /install/);
  assert.equal(json.lightSbom.aiUse.dependencySource, "project manifests only; no install or resolver is run");
  assert.equal(json.stepSummary.environment[0].code, "node-version-mismatch");
  assert.deepEqual(json.stepSummary.remediation, []);
});

test("contextWorkspace text includes pending follow-ups", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-context-followup-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false }
  });
  await fs.writeFile(path.join(dir, ".aienvmap", "timeline.jsonl"), `${JSON.stringify({
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    summary: "dependency-change",
    followUp: { required: true, target: "dependency", commands: ["aienvmap sync"] }
  })}\n`, "utf8");

  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await contextWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  assert.match(output, /Follow-ups/);
  assert.match(output, /Follow-up plan/);
  assert.match(output, /pending: aienvmap sync; targets: dependency/);
  assert.match(output, /dependency-change/);
});
