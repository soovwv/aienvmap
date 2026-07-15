import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildStatus, renderStatusText, statusWorkspace } from "../src/commands/status.js";
import { writeJson } from "../src/fsutil.js";
import { importSbomEvidence } from "../src/sbom-evidence.js";

test("buildStatus returns a compact clear state", () => {
  const status = buildStatus({
    runtimes: { node: "24.0.0" },
    dependencySnapshot: { summary: { packages: 2 }, manifests: ["package.json"] },
    lightSbom: {
      riskSummary: {
        level: "low",
        score: 5,
        scanner: "off",
        next: "Run read-only security scan before dependency or release decisions.",
        signals: ["security scanner summary is off"]
      },
      dependencyChangeHints: [{
        manifest: "package.json",
        ecosystem: "npm",
        manager: "npm",
        groups: ["dependencies"],
        lockfiles: [{ file: "package-lock.json" }],
        riskPackages: []
      }]
    },
    security: { summary: { total: 0 } }
  }, [], []);

  assert.equal(status.state, "clear");
  assert.equal(status.aiDecisionEnvelope.decision, "clear");
  assert.equal(status.aiDecisionEnvelope.nextSafeCommand, status.nextSafeCommand);
  assert.equal(status.aiDecisionEnvelope.removalAuthorized, false);
  assert.equal(status.contract.name, "aienvmap-preflight");
  assert.equal(status.contract.stability, "additive");
  assert.ok(status.contract.aiEntryFields.includes("nextAgent"));
  assert.ok(status.contract.aiEntryFields.includes("collaboration"));
  assert.ok(status.contract.aiEntryFields.includes("maintenanceLoop"));
  assert.ok(status.contract.aiEntryFields.includes("operationalSafety"));
  assert.ok(status.contract.aiEntryFields.includes("qualitySignals"));
  assert.ok(status.contract.aiEntryFields.includes("environmentChangeProtocol"));
  assert.ok(status.contract.aiEntryFields.includes("dependencyReadSet"));
  assert.ok(status.contract.aiEntryFields.includes("dependencyQuickCheck"));
  assert.equal(status.counts.runtimes, 1);
  assert.equal(status.counts.dependencies, 2);
  assert.equal(status.agentUse.environmentChanges, "intent-first");
  assert.equal(status.aiBootstrap.readFirst, ".aienvmap/status.json");
  assert.equal(status.aiBootstrap.detailCommand, "aienvmap context --json");
  assert.equal(status.aiBootstrap.nextSafeCommand, status.nextCommand);
  assert.equal(status.aiBootstrap.nextSafeCommandSource, "collaboration");
  assert.match(status.aiBootstrap.nextSafeCommandReason, /project-local work|Multiple AI agents/);
  assert.equal(status.aiBootstrap.localMode, "advisory");
  assert.equal(status.aiBootstrap.projectLocalWork, "allowed");
  assert.equal(status.aiBootstrap.environmentChanges, "intent-first");
  assert.equal(status.aiSession.purpose, "Shortest repeatable startup routine for AI agents in this workspace.");
  assert.deepEqual(status.aiSession.readFirst, [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md"]);
  assert.equal(status.aiSession.start[0], "aienvmap status --json");
  assert.equal(status.aiSession.start[1], "aienvmap sync");
  assert.equal(status.aiSession.beforeEnvironmentChange, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.aiSession.afterEnvironmentChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.equal(status.aiSession.handoff, "aienvmap handoff --record --actor agent:id");
  assert.match(status.aiSession.avoid.join(" "), /broad install/);
  assert.match(status.aiSession.avoid.join(" "), /multi-agent activity/);
  assert.equal(status.aiSession.localWork, "allowed");
  assert.equal(status.aiSession.environmentChanges, "intent-first");
  assert.match(status.aiSession.rule, /Read status first/);
  assert.equal(status.artifactFreshness.state, "unknown");
  assert.equal(status.artifactFreshness.nextCommand, "aienvmap sync");
  assert.equal(status.artifactFreshness.statusArtifact, ".aienvmap/status.json");
  assert.equal(status.artifactFreshness.staleAfterHours, 24);
  assert.equal(status.aiReadiness.level, "ready");
  assert.equal(status.aiReadiness.requiresHumanReview, false);
  assert.equal(status.aiReadiness.environmentChanges, "intent-first");
  assert.equal(status.collaboration.status, "clear");
  assert.equal(status.collaboration.environmentChanges, "intent-first");
  assert.equal(status.collaboration.nextCommand, "aienvmap intent --actor agent:id --action planned-change --target environment");
  assert.match(status.collaboration.rule, /project-local work/);
  assert.equal(status.coordinationResolution.status, "clear");
  assert.equal(status.coordinationResolution.nextCommand, "aienvmap status --json");
  assert.match(status.coordinationResolution.rule, /No coordination conflict/);
  assert.match(status.aiReadiness.safeProjectLocalActions[0], /read status/);
  assert.match(status.aiReadiness.reviewOnlyEnvironmentChanges, /Record intent/);
  assert.equal(status.environmentChangeProtocol.mode, "advisory");
  assert.match(status.environmentChangeProtocol.appliesWhen, /runtimes/);
  assert.equal(status.environmentChangeProtocol.readFirst[0], ".aienvmap/README.md");
  assert.equal(status.environmentChangeProtocol.readFirst[1], ".aienvmap/status.json");
  assert.match(status.environmentChangeProtocol.beforeChange.join(" "), /Record intent/);
  assert.equal(status.environmentChangeProtocol.commands.recordIntent, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.environmentChangeProtocol.commands.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
  assert.match(status.environmentChangeProtocol.mustNotDo.join(" "), /broad install/);
  assert.match(status.environmentChangeProtocol.rule, /Project-local work/);
  assert.equal(status.quickstart.label, "10-second AI flow");
  assert.equal(status.quickstart.detailCommand, "aienvmap context --json");
  assert.equal(status.quickstart.afterEnvironmentChange, "aienvmap checkpoint --actor agent:id --summary what-changed --target environment");
  assert.match(status.quickstart.rule, /Continue project-local work/);
  assert.equal(status.nextAgent.readFirst, ".aienvmap/status.json");
  assert.equal(status.nextAgent.readSummary, ".aienvmap/summary.md");
  assert.equal(status.nextAgent.handoffCommand, "aienvmap handoff --record --actor agent:id");
  assert.deepEqual(status.nextAgent.dependencyFiles, ["package.json", "package-lock.json"]);
  assert.match(status.nextAgent.dependencyProtocol, /record dependency intent/);
  assert.equal(status.maintenanceLoop.mode, "advisory");
  assert.match(status.maintenanceLoop.localImpact, /read-only/);
  assert.equal(status.maintenanceLoop.readOrder[0], ".aienvmap/status.json");
  assert.equal(status.maintenanceLoop.cycle[0].command, "aienvmap sync");
  assert.equal(status.maintenanceLoop.cycle[4].command, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.maintenanceLoop.sbomCommand, "aienvmap sync --security");
  assert.equal(status.maintenanceLoop.sbomReview.status, "ready");
  assert.equal(status.maintenanceLoop.sbomReview.securityConfidence, "scanner-off");
  assert.equal(status.maintenanceLoop.sbomReview.nextCommand, "aienvmap sync --security");
  assert.match(status.maintenanceLoop.rule, /strict checks only/);
  assert.equal(status.intentTargets[0].target, "dependency");
  assert.equal(status.dependencyReadSet[0].manifest, "package.json");
  assert.deepEqual(status.dependencyReadSet[0].lockfiles, ["package-lock.json"]);
  assert.equal(status.dependencyChangeProtocol.mode, "advisory");
  assert.equal(status.dependencyQuickCheck.status, "ready");
  assert.equal(status.dependencyQuickCheck.nextCommand, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.dependencyQuickCheck.scannerEvidence, "unknown");
  assert.match(status.dependencyQuickCheck.mustNotDo.join(" "), /lockfile rewrite/);
  assert.equal(status.sbomRisk.level, "low");
  assert.match(status.sbomRisk.next, /security scan/);
  assert.equal(status.dependencyChangeProtocol.commands.recordIntent, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.commands.recordIntent, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.equal(status.commands.checkpoint, "aienvmap checkpoint --actor agent:id --summary what-changed --target environment");
  assert.equal(status.enforcementProfile.defaultMode, "advisory");
  assert.equal(status.enforcementProfile.localOperation, "non-blocking");
  assert.equal(status.strictRecommendation.localCommand, "aienvmap doctor --json");
  assert.equal(status.strictRecommendation.localBehavior, "warn-only");
  assert.equal(status.strictRecommendation.shouldFailLocal, false);
  assert.equal(status.strictRecommendation.ciCommand, "aienvmap doctor --strict all --json");
  assert.equal(status.strictRecommendation.releaseCommand, "aienvmap doctor --strict all --json");
  assert.equal(status.operationalSafety.mode, "advisory-first");
  assert.equal(status.operationalSafety.defaultBehavior, "warn-only");
  assert.match(status.operationalSafety.mustNotDo.join(" "), /audit fix/);
  assert.ok(status.operationalSafety.allowedWithoutIntent.includes("read generated artifacts"));
  assert.ok(status.operationalSafety.requireIntentBefore.includes("global tool installation or removal"));
  assert.equal(status.qualitySignals.status, "release-candidate");
  assert.ok(status.qualitySignals.principles.includes("AI-friendly"));
  assert.ok(status.qualitySignals.principles.includes("lightweight"));
  assert.match(status.qualitySignals.checks.map((item) => item.name).join(" "), /AI entry path/);
  assert.match(status.qualitySignals.checks.map((item) => item.evidence).join(" "), /aienvmap demo --json/);
  assert.match(status.qualitySignals.mustStayTrue.join(" "), /do not fail local work by default/);
  assert.match(status.qualitySignals.rule, /recommendation and stabilization checklist/);
  assert.equal(status.enforcementProfile.gate.localDefault, "warn-only");
  assert.equal(status.enforcementProfile.gate.failCondition, "never in default mode");
  assert.equal(status.enforcementProfile.strictPlan.ciCommand, "aienvmap doctor --strict all --json");
  assert.equal(status.enforcementProfile.strictDecision.localCommand, "aienvmap doctor --json");
  assert.equal(status.enforcementProfile.strictDecision.shouldFailLocal, false);
  assert.equal(status.enforcementProfile.strictDecision.ciCommand, "aienvmap doctor --strict all --json");
  assert.equal(status.artifacts.status, ".aienvmap/status.json");
  assert.equal(status.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(status.readOrder[1], ".aienvmap/README.md");
  assert.equal(status.readOrder[2], ".aienvmap/status.json");
  assert.equal(status.readOrder[3], ".aienvmap/summary.md");
  assert.equal(status.commands.context, "aienvmap context --json");
  assert.equal(status.nextCommand, "aienvmap intent --actor agent:id --action planned-change --target environment");
  assert.equal(status.nextSafeCommand, status.nextCommand);
});

test("buildStatus connects high SBOM risk to dependency review loop", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 1 }, manifests: ["package.json"] },
    lightSbom: {
      riskSummary: {
        level: "high",
        score: 80,
        scanner: "enabled",
        signals: ["1 high vulnerability finding(s)"],
        reviewTargets: ["package.json", "express"]
      },
      aiDependencyReview: {
        status: "review",
        securityConfidence: "scanner-summary",
        reviewTargets: ["package.json", "express"],
        beforeDependencyChange: [
          "aienvmap sync --security",
          "aienvmap intent --actor agent:id --action dependency-review --target dependency",
          "aienvmap plan --write"
        ],
        afterDependencyChange: [
          "run the narrowest relevant project validation",
          "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
        ]
      },
      dependencyQuickCheck: {
        status: "review",
        nextCommand: "aienvmap sync --security",
        scannerEvidence: "scanner-summary",
        reviewTargets: ["package.json", "express"],
        mustNotDo: ["do not run broad install commands before reading SBOM"]
      }
    },
    security: { summary: { total: 1 } }
  }, [], []);

  assert.equal(status.aiReadiness.level, "review");
  assert.equal(status.maintenanceLoop.sbomReview.status, "review");
  assert.equal(status.maintenanceLoop.sbomReview.riskLevel, "high");
  assert.deepEqual(status.maintenanceLoop.sbomReview.reviewTargets, ["package.json", "express"]);
  assert.equal(status.maintenanceLoop.sbomReview.beforeDependencyChange[1], "aienvmap intent --actor agent:id --action dependency-review --target dependency");
  assert.match(status.maintenanceLoop.sbomReview.afterDependencyChange[1], /checkpoint/);
  assert.equal(status.dependencyQuickCheck.status, "review");
  assert.equal(status.dependencyQuickCheck.nextCommand, "aienvmap sync --security");
  assert.deepEqual(status.dependencyQuickCheck.reviewTargets, ["package.json", "express"]);
  assert.equal(status.maintenanceLoop.sbomCommand, "aienvmap sync --security");
});

test("buildStatus exposes pending follow-ups from timeline", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 1 } },
    security: { summary: { total: 0 } }
  }, [], [], [{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    summary: "dependency-change",
    followUp: {
      required: true,
      target: "dependency",
      commands: ["aienvmap sync"]
    }
  }]);

  assert.equal(status.followUps.length, 1);
  assert.equal(status.followUps[0].target, "dependency");
  assert.equal(status.followUps[0].commands[0], "aienvmap sync");
  assert.equal(status.followUpPlan.status, "pending");
  assert.equal(status.followUpPlan.count, 1);
  assert.deepEqual(status.followUpPlan.targets, ["dependency"]);
  assert.equal(status.followUpPlan.readFirst[0], ".aienvmap/README.md");
  assert.equal(status.followUpPlan.readFirst[1], ".aienvmap/status.json");
  assert.equal(status.followUpPlan.nextCommand, "aienvmap sync");
  assert.deepEqual(status.followUpPlan.commands, ["aienvmap sync"]);
  assert.match(status.followUpPlan.rule, /before another AI/);
});

test("buildStatus exposes multi-agent activity since last handoff", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 1 } },
    security: { summary: { total: 0 } }
  }, [], [], [
    {
      at: "2026-07-08T00:00:00.000Z",
      actor: "agent:codex",
      type: "agent-record",
      target: "dependency",
      summary: "dependency-change"
    },
    {
      at: "2026-07-08T00:01:00.000Z",
      actor: "agent:gemini",
      type: "agent-record",
      target: "dependency",
      summary: "security dependency fix"
    }
  ]);

  assert.equal(status.agentActivity.environmentRecordCount, 2);
  assert.deepEqual(status.agentActivity.multiActorTargets, ["dependency"]);
  assert.deepEqual(status.agentActivity.targets[0].actors, ["agent:codex", "agent:gemini"]);
  assert.match(status.agentActivity.next, /handoff/);
  assert.equal(status.collaboration.status, "review-before-env-change");
  assert.deepEqual(status.collaboration.activeTargets, ["dependency"]);
  assert.match(status.collaboration.reviewSignals.join(" "), /multi-agent/);
  assert.equal(status.collaboration.nextCommand, "aienvmap handoff --record --actor agent:id");
  assert.equal(status.maintenanceLoop.nextCommand, "aienvmap handoff --record --actor agent:id");
});

test("buildStatus exposes agent pointer discovery hints", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { summary: { total: 0 } },
    agentFiles: {
      agents: { path: "AGENTS.md", exists: true, hasAienvmapPointer: true, installCommand: "aienvmap snippet codex --write", role: "codex" },
      claude: { path: "CLAUDE.md", exists: true, hasAienvmapPointer: false, installCommand: "aienvmap snippet claude --write", role: "claude" },
      gemini: { path: "GEMINI.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet gemini --write", role: "gemini" }
    }
  }, [], []);

  assert.deepEqual(status.agentPointers.installed, ["codex"]);
  assert.deepEqual(status.agentPointers.missing, ["claude", "gemini"]);
  assert.equal(status.aiReadiness.level, "ready");
  assert.equal(status.agentPointers.targets[1].file, "CLAUDE.md");
  assert.equal(status.agentPointers.onboardCommand, "aienvmap onboard");
  assert.equal(status.agentPointers.discoveryDecision, "auto-ready");
  assert.equal(status.agentPointers.nextSetupCommand, "none");
  assert.match(status.agentPointers.startupChecklist.join(" "), /dependencyQuickCheck/);
  assert.match(status.agentPointers.startupChecklist.join(" "), /checkpoint and hand off/);
  assert.equal(status.agentPointers.fallbackCommand, "aienvmap start --json");
  assert.deepEqual(status.agentPointers.fallbackRead, [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"]);
  assert.match(status.agentPointers.discovery, /ready: codex/);
  assert.match(status.agentPointers.next, /aienvmap onboard/);
  assert.match(status.agentPointers.next, /snippet claude/);
  assert.match(status.agentPointers.rule, /directly usable/);
});

test("buildStatus includes optional detected AI pointer files without making them default noise", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { summary: { total: 0 } },
    agentFiles: {
      agents: { path: "AGENTS.md", exists: true, hasAienvmapPointer: true, installCommand: "aienvmap snippet codex --write", role: "codex" },
      claude: { path: "CLAUDE.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet claude --write", role: "claude" },
      gemini: { path: "GEMINI.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet gemini --write", role: "gemini" },
      cursor: { path: ".cursor/rules/environment.md", exists: true, hasAienvmapPointer: true, installCommand: "aienvmap snippet cursor --write", role: "cursor" },
      copilot: { path: ".github/copilot-instructions.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet copilot --write", role: "copilot" }
    }
  }, [], []);

  assert.deepEqual(status.agentPointers.installed, ["codex", "cursor"]);
  assert.equal(status.agentPointers.targets.some((item) => item.role === "copilot"), false);
  assert.match(status.agentPointers.discovery, /ready: codex, cursor/);
});

test("buildStatus marks AI readiness review when no agent pointer is installed", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { summary: { total: 0 } },
    agentFiles: {
      agents: { path: "AGENTS.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet codex --write", role: "codex" }
    }
  }, [], []);

  assert.equal(status.aiReadiness.level, "review");
  assert.equal(status.aiReadiness.requiresHumanReview, true);
  assert.equal(status.agentPointers.discovery, "missing: run aienvmap onboard");
  assert.equal(status.agentPointers.discoveryDecision, "fallback-required");
  assert.equal(status.agentPointers.nextSetupCommand, "aienvmap onboard");
  assert.equal(status.agentPointers.fallbackCommand, "aienvmap start --json");
  assert.match(status.agentPointers.rule, /Instruction-file pointers/);
  assert.match(status.aiReadiness.signals.join(" "), /pointer/);
  assert.match(status.aiReadiness.safeProjectLocalActions.join(" "), /code-only work/);
  assert.match(status.aiReadiness.reviewOnlyEnvironmentChanges, /review signals/);
});

test("buildStatus treats legacy boolean agent files as installed pointers", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { summary: { total: 0 } },
    agentFiles: { agents: true }
  }, [], []);

  assert.deepEqual(status.agentPointers.installed, ["codex"]);
  assert.equal(status.agentPointers.missingCount, 0);
});

test("statusWorkspace JSON reports review-required and strict suggestion", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-status-"));
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
    dependencySnapshot: { summary: { packages: 1 } },
    security: { enabled: false, summary: { total: 0 } }
  });

  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await statusWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(output);
  assert.match(json.coordinationRevision, /^ir1:[a-f0-9]{16}$/);
  assert.equal(json.coordination.revision, json.coordinationRevision);
  assert.match(json.coordination.compareAndSwap, /--if-revision/);
  assert.equal(json.state, "review-required");
  assert.equal(json.contract.version, 1);
  assert.equal(json.enforcement.suggestedStrictScopes[0], "policy");
  assert.equal(json.enforcement.strictDecision.recommendedScope, "policy");
  assert.equal(json.enforcement.strictDecision.local, "warn-only");
  assert.equal(json.counts.warnings, 1);
  assert.equal(json.counts.dependencies, 1);
  assert.equal(json.agentUse.environmentChanges, "intent-and-review-first");
  assert.equal(json.maintenanceLoop.state, "review-required");
  assert.equal(json.maintenanceLoop.readOrder[2], "aienvmap context --json");
  assert.match(json.quickstart.rule, /Review warnings/);
  assert.match(json.nextAgent.rule, /review warnings/i);
  assert.equal(json.intentTargets[0].target, "node");
  assert.equal(json.artifacts.envMap, "AIENV.md");
  assert.equal(json.nextSafeCommand, json.nextCommand);
  assert.equal(json.aiBootstrap.nextSafeCommand, json.nextCommand);
});

test("statusWorkspace text prints a compact default decision", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-status-text-"));
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
    security: { enabled: false, summary: { total: 0 } }
  });

  const originalLog = console.log;
  const lines = [];
  console.log = (value) => { lines.push(value); };
  try {
    await statusWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  assert.match(lines.join("\n"), /ready: ready \| collaboration: clear/);
  assert.match(lines.join("\n"), /session: aienvmap status --json -> aienvmap context --json/);
  assert.match(lines.join("\n"), /start: \.aienvmap\/README\.md/);
  assert.match(lines.join("\n"), /discovery: fallback-required \/ missing: run aienvmap onboard/);
  assert.equal(lines.join("\n").split("\n").length, 5);
});

test("statusWorkspace verbose text keeps command details", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-status-verbose-"));
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
    security: { enabled: false, summary: { total: 0 } }
  });

  const originalLog = console.log;
  const lines = [];
  console.log = (value) => { lines.push(value); };
  try {
    await statusWorkspace({ dir, verbose: true });
  } finally {
    console.log = originalLog;
  }

  const output = lines.join("\n");
  assert.match(output, /dependency: ready \/ unknown \/ aienvmap intent --actor agent:id --action planned-change --target dependency/);
  assert.match(output, /stale: aienvmap sync/);
  assert.match(output, /intent: aienvmap intent/);
  assert.match(output, /checkpoint: aienvmap checkpoint/);
  assert.match(output, /handoff: aienvmap handoff --record --actor agent:id/);
  assert.match(output, /strict: aienvmap doctor --strict all/);
  assert.ok(output.split("\n").length > 5);
});

test("renderStatusText stays compact for default human and AI scan", () => {
  const text = renderStatusText({
    state: "review-required",
    summary: "Review warnings before environment changes.",
    counts: { warnings: 2, openIntents: 1 },
    aiReadiness: { level: "review" },
    collaboration: { status: "review-before-env-change" },
    sbomRisk: { level: "medium", score: 42 },
    quickstart: { detailCommand: "aienvmap context --json" },
    artifacts: { startHere: ".aienvmap/README.md", summary: ".aienvmap/summary.md" },
    agentPointers: { discovery: "ready: codex", discoveryDecision: "auto-ready" },
    nextCommand: "aienvmap plan --write"
  });

  assert.deepEqual(text.split("\n"), [
    "review-required: Review warnings before environment changes.",
    "ready: review | collaboration: review-before-env-change",
    "sbom: medium (42) | external: no-external-evidence | warnings: 2 | intents: 1",
    "next: aienvmap plan --write",
    "session: aienvmap status --json -> aienvmap context --json | start: .aienvmap/README.md | summary: .aienvmap/summary.md | discovery: auto-ready / ready: codex"
  ]);
});

test("buildStatus summarizes open intent coordination by target", () => {
  const status = buildStatus({
    runtimes: {},
    dependencySnapshot: { summary: { packages: 1 } },
    security: { summary: { total: 0 } }
  }, [], [
    { actor: "agent:codex", action: "update dependency", target: "dependency" },
    { actor: "agent:claude", action: "fix vulnerable package" }
  ]);

  assert.equal(status.coordination.openIntentCount, 2);
  assert.equal(status.coordination.targets[0].target, "dependency");
  assert.deepEqual(status.coordination.targets[0].actors, ["agent:codex", "agent:claude"]);
  assert.deepEqual(status.coordination.conflictTargets, ["dependency"]);
  assert.equal(status.collaboration.status, "review-before-env-change");
  assert.deepEqual(status.collaboration.activeTargets, ["dependency"]);
  assert.match(status.collaboration.nextCommand, /plan --write/);
  assert.match(status.coordination.next, /conflicting intents/);
  assert.equal(status.coordinationResolution.status, "review");
  assert.deepEqual(status.coordinationResolution.targets, ["dependency"]);
  assert.equal(status.coordinationResolution.nextCommand, "aienvmap plan --write");
  assert.match(status.coordinationResolution.commands.resolveTarget, /--target dependency --status resolved/);
  assert.match(status.coordinationResolution.mustNotDo.join(" "), /silently/);
});

test("statusWorkspace can write the compact AI status artifact", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-status-write-"));
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
    security: { enabled: false, summary: { total: 0 } }
  });

  const result = await statusWorkspace({ dir, write: true, quiet: true });
  assert.match(result.artifact, /\.aienvmap[\\\/]status\.json$/);

  const written = JSON.parse(await fs.readFile(result.artifact, "utf8"));
  assert.equal(written.schemaVersion, 1);
  assert.equal(written.state, "clear");
  assert.equal(written.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(written.readOrder[1], ".aienvmap/README.md");
  assert.equal(written.readOrder[2], ".aienvmap/status.json");
  assert.equal(written.readOrder[3], ".aienvmap/summary.md");
  assert.equal(written.commands.refresh, "aienvmap sync");
  assert.equal(written.nextSafeCommand, written.nextCommand);
  assert.equal(written.aiBootstrap.readFirst, ".aienvmap/status.json");
  assert.equal(written.externalSbom.decision, "no-external-evidence");
});

test("statusWorkspace promotes external component drift into AI review", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-status-sbom-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runtimes: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false, summary: { total: 0 } }
  });
  const source = path.join(dir, "scanner.cdx.json");
  await writeJson(source, { bomFormat: "CycloneDX", components: [{ name: "alpha", version: "2", purl: "pkg:npm/alpha@2" }] });
  const evidence = await importSbomEvidence(dir, source);
  evidence.baselineDrift = { status: "changed", counts: { added: 0, removed: 0, versionChanged: 1 } };
  await writeJson(path.join(dir, ".aienvmap", "external-sbom-evidence.json"), evidence);

  const result = await statusWorkspace({ dir, quiet: true });
  assert.equal(result.state, "review-required");
  assert.equal(result.aiDecisionEnvelope.decision, "review");
  assert.ok(result.aiDecisionEnvelope.reasonCodes.includes("external-sbom-component-drift"));
  assert.ok(result.aiDecisionEnvelope.evidenceRefs.includes(".aienvmap/sbom.json"));
  assert.equal(result.externalSbom.decision, "component-drift-review");
  assert.equal(result.counts.warnings, 1);
  assert.ok(result.intentTargets[0].sources.includes("external-sbom-component-drift"));
  assert.match(renderStatusText(result), /external: component-drift-review/);
});
