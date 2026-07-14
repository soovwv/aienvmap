import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncWorkspace } from "../src/commands/sync.js";
import { renderSummary, summaryWorkspace } from "../src/commands/summary.js";

test("renderSummary keeps the AI handoff compact and actionable", () => {
  const markdown = renderSummary({
    state: "review-required",
    counts: { warnings: 1, openIntents: 2, runtimes: 3, dependencies: 4, vulnerabilities: 5 },
    sbomRisk: { level: "medium", score: 42, scanner: "not run", signals: ["scanner unavailable"], next: "Run a dedicated scanner." },
    aiReadiness: {
      level: "review",
      next: "Review listed signals before another AI changes the environment.",
      signals: ["open intent conflicts", "multi-agent environment activity"],
      safeProjectLocalActions: ["read status and summary artifacts before changing the environment"]
    },
    aiBootstrap: {
      readFirst: ".aienvmap/status.json",
      detailCommand: "aienvmap context --json",
      nextSafeCommand: "aienvmap sync",
      localMode: "advisory",
      projectLocalWork: "allowed",
      environmentChanges: "review-first",
      rule: "Review context before shared environment changes; local checks remain non-blocking."
    },
    aiSession: {
      start: ["aienvmap status --json", "aienvmap sync"],
      rule: "Read status first, sync only when stale or missing, and record intent before shared environment changes."
    },
    artifactFreshness: {
      state: "stale",
      nextCommand: "aienvmap sync"
    },
    collaboration: {
      status: "review-before-env-change",
      activeTargets: ["dependency", "node"],
      nextCommand: "aienvmap handoff --record --actor agent:id",
      rule: "Do not install shared tools until collaboration signals are reviewed."
    },
    followUpPlan: {
      status: "pending",
      nextCommand: "aienvmap sync"
    },
    maintenanceLoop: {
      nextCommand: "aienvmap handoff --record --actor agent:id",
      sbomCommand: "aienvmap sync --security",
      sbomReview: {
        status: "review",
        securityConfidence: "scanner-summary",
        nextCommand: "aienvmap sync --security"
      },
      rule: "Keep local operation advisory and lightweight; use strict checks only when CI or the user explicitly asks."
    },
    environmentChangeProtocol: {
      rule: "Read status/context, record intent, checkpoint, and hand off around shared environment changes.",
      readFirst: [".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
      commands: {
        recordIntent: "aienvmap intent --actor agent:id --action planned-change --target dependency",
        checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
      }
    },
    nextCommand: "aienvmap handoff",
    quickstart: { detailCommand: "aienvmap context --json" },
    nextAgent: { readFirst: ".aienvmap/status.json" },
    enforcement: {
      recommendedCommand: "aienvmap doctor --strict security",
      strictPlan: { ciCommand: "aienvmap doctor --strict security --json" },
      strictDecision: {
        local: "warn-only",
        localCommand: "aienvmap doctor --json",
        ciCommand: "aienvmap doctor --strict security --json"
      }
    },
    strictRecommendation: {
      localCommand: "aienvmap doctor --json",
      localBehavior: "warn-only",
      ciCommand: "aienvmap doctor --strict security --json",
      releaseCommand: "aienvmap doctor --strict all --json"
    },
    qualitySignals: {
      status: "prototype-hardening",
      principles: ["AI-friendly", "simple", "lightweight", "advisory-first", "batched-release"],
      checks: [{ name: "AI entry path", evidence: "aienvmap discover --json && aienvmap status --json && aienvmap context --json" }],
      mustStayTrue: ["do not fail local work by default"],
      rule: "Use these signals as a recommendation and stabilization checklist."
    },
    agentUse: { environmentChanges: "intent-and-review-first" },
    coordination: { next: "Check open intents.", conflictTargets: ["dependency"] },
    coordinationResolution: {
      status: "review",
      targets: ["dependency"],
      nextCommand: "aienvmap plan --write",
      rule: "Use this advisory resolution routine before another AI changes the same shared environment target."
    },
    agentActivity: { next: "Run handoff.", multiActorTargets: ["node"] },
    dependencyReadSet: [{ manifest: "package.json", lockfiles: ["package-lock.json"] }],
    dependencyChangeProtocol: {
      packageManagerPolicy: "clear",
      commands: {
        recordIntent: "aienvmap intent --actor agent:id --action planned-change --target dependency",
        checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
      }
    },
    agentPointers: {
      installed: ["codex"],
      missing: ["claude"],
      discovery: "ready: codex",
      discoveryDecision: "auto-ready",
      nextSetupCommand: "none",
      next: "Install a pointer with aienvmap snippet claude --write if this workspace uses that AI.",
      fallbackCommand: "aienvmap start --json",
      fallbackRead: [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md"]
    },
    artifacts: {
      startHere: ".aienvmap/README.md"
    }
  }, {
    workspace: { root: "/repo" },
    lightSbom: {
      source: { dependencies: "project manifests" },
      confidence: { transitiveDependencies: "not-resolved" },
      aiDependencyReview: {
        status: "review",
        securityConfidence: "scanner-summary",
        beforeDependencyChange: ["aienvmap intent --actor agent:id --action dependency-review --target dependency"]
      },
      aiReviewPlan: {
        status: "review",
        risk: "medium/42",
        securityConfidence: "scanner-summary",
        beforeChange: "aienvmap sync --security"
      },
      aiUse: {
        decision: "review",
        securityConfidence: "scanner-summary",
        scannerCommand: "aienvmap sync --security",
        nextCommand: "aienvmap sync --security"
      },
      dependencyQuickCheck: {
        status: "review",
        scannerEvidence: "scanner-summary",
        nextCommand: "aienvmap sync --security",
        reviewTargets: ["package.json"]
      }
    }
  });

  assert.match(markdown, /# aienvmap summary/);
  assert.match(markdown, /# aienvmap summary\n\n- AI readiness: review\n- AI signals: open intent conflicts; multi-agent environment activity\n- AI start here: \.aienvmap\/README\.md\n- AI bootstrap: allowed \/ review-first \/ advisory\n- AI session: aienvmap status --json -> aienvmap sync\n- AI artifact freshness: stale \/ aienvmap sync\n- AI next: aienvmap sync/);
  assert.match(markdown, /AI start here: \.aienvmap\/README\.md/);
  assert.match(markdown, /AI bootstrap: allowed \/ review-first \/ advisory/);
  assert.match(markdown, /AI session: aienvmap status --json -> aienvmap sync/);
  assert.match(markdown, /AI artifact freshness: stale \/ aienvmap sync/);
  assert.match(markdown, /AI next: aienvmap sync \(Review listed signals/);
  assert.match(markdown, /AI safe local work: read status and summary artifacts/);
  assert.match(markdown, /AI collaboration: review-before-env-change \/ dependency, node \/ aienvmap handoff --record --actor agent:id/);
  assert.match(markdown, /AI coordination resolution: review \/ dependency \/ aienvmap plan --write/);
  assert.match(markdown, /AI follow-up: pending \/ aienvmap sync/);
  assert.match(markdown, /AI environment protocol: aienvmap intent --actor agent:id --action planned-change --target dependency -> aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(markdown, /AI maintenance loop: aienvmap handoff --record --actor agent:id/);
  assert.match(markdown, /state: review-required/);
  assert.match(markdown, /light SBOM risk: medium \(42\)/);
  assert.match(markdown, /AI readiness: review/);
  assert.match(markdown, /AI read first: \.aienvmap\/status\.json/);
  assert.match(markdown, /AI bootstrap rule: Review context before shared environment changes/);
  assert.match(markdown, /session rule: Read status first, sync only when stale or missing/);
  assert.match(markdown, /local check: aienvmap doctor --json \(warn-only\)/);
  assert.match(markdown, /CI strict: aienvmap doctor --strict security --json/);
  assert.match(markdown, /release strict: aienvmap doctor --strict all --json/);
  assert.match(markdown, /quality signals: prototype-hardening \/ AI-friendly, simple, lightweight, advisory-first, batched-release/);
  assert.match(markdown, /release readiness: 0\.2\.0 \/ prototype-hardening \/ hold \/ accumulating \/ npm run release:check passes locally/);
  assert.match(markdown, /collaboration rule: Do not install shared tools/);
  assert.match(markdown, /resolution rule:/);
  assert.match(markdown, /maintenance rule: Keep local operation advisory and lightweight/);
  assert.match(markdown, /environment rule: Read status\/context, record intent, checkpoint/);
  assert.match(markdown, /conflict targets: dependency/);
  assert.match(markdown, /multi-actor targets: node/);
  assert.match(markdown, /AI SBOM plan: review \/ medium\/42 \/ scanner-summary \/ aienvmap sync --security/);
  assert.match(markdown, /AI SBOM use: review \/ scanner-summary \/ aienvmap sync --security \/ aienvmap sync --security/);
  assert.match(markdown, /AI dependency review: review \/ scanner-summary \/ aienvmap intent --actor agent:id --action dependency-review --target dependency/);
  assert.match(markdown, /dependency quick check: review \/ scanner-summary \/ aienvmap sync --security \/ package\.json/);
  assert.match(markdown, /maintenance SBOM review: review \/ scanner-summary \/ aienvmap sync --security/);
  assert.match(markdown, /## Dependency changes/);
  assert.match(markdown, /fallback: aienvmap start --json \/ \.aienvmap\/discovery\.json -> \.aienvmap\/README\.md -> \.aienvmap\/status\.json -> \.aienvmap\/summary\.md/);
  assert.match(markdown, /environment read: \.aienvmap\/status\.json, \.aienvmap\/summary\.md, aienvmap context --json/);
  assert.match(markdown, /environment before: aienvmap intent --actor agent:id --action planned-change --target dependency/);
  assert.match(markdown, /environment after: aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(markdown, /read files: package\.json, package-lock\.json/);
  assert.match(markdown, /checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(markdown, /## Agent pointers/);
  assert.match(markdown, /installed: codex/);
  assert.match(markdown, /missing: claude/);
  assert.match(markdown, /discovery: auto-ready \/ ready: codex \/ none/);
  assert.match(markdown, /aiEntry: aienvmap start --json \/ read aiEntry for readFirst, nextCommand, setup, intent, checkpoint, handoff, and copyPastePrompt/);
  assert.match(markdown, /## Quality signals/);
  assert.match(markdown, /status: prototype-hardening/);
  assert.match(markdown, /first check: AI entry path \/ aienvmap discover --json && aienvmap status --json && aienvmap context --json/);
  assert.match(markdown, /must stay true: do not fail local work by default/);
  assert.match(markdown, /## Release readiness/);
  assert.match(markdown, /target: 0\.2\.0/);
  assert.match(markdown, /default decision: hold/);
  assert.match(markdown, /publish gate: hold \/ Keep committing tested stabilization changes/);
  assert.match(markdown, /current batch: accumulating \/ stability-batch \/ AI discovery, verified AI onboarding, dependency quick check, dashboard parity/);
  assert.match(markdown, /next stabilization: keep the reviewed JSON root-field freeze candidate unchanged/);
  assert.match(markdown, /contract review: freeze-candidate-verified \/ npm run contract:check \/ discover, start, discovery, onboard, status, context/);
  assert.match(markdown, /batch reason: Several stability and AI-contract changes/);
  assert.match(markdown, /publish when: meaningful AI contract/);
  assert.match(markdown, /hold when: only one small documentation/);
  assert.match(markdown, /publish: Accumulate several meaningful AI-contract, dashboard, SBOM, release-gate, and bugfix changes before one npm publish/);
  assert.match(markdown, /\.aienvmap\/sbom\.cdx\.json/);
  assert.match(markdown, /\.aienvmap\/README\.md/);
});

test("summaryWorkspace writes summary.md after sync", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-summary-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^4.18.0" } }), "utf8");

  await syncWorkspace({ dir, quiet: true });
  const result = await summaryWorkspace({ dir, write: true, quiet: true });
  const summary = await fs.readFile(path.join(dir, ".aienvmap", "summary.md"), "utf8");

  assert.match(result.artifact, /\.aienvmap[\\\/]summary\.md$/);
  assert.match(summary, /## AI handoff/);
  assert.match(summary, /AI bootstrap:/);
  assert.match(summary, /AI start here: \.aienvmap\/README\.md/);
  assert.match(summary, /AI session:/);
  assert.match(summary, /AI artifact freshness:/);
  assert.match(summary, /AI collaboration:/);
  assert.match(summary, /AI follow-up:/);
  assert.match(summary, /AI environment protocol:/);
  assert.match(summary, /AI maintenance loop:/);
  assert.match(summary, /## SBOM/);
  assert.match(summary, /AI SBOM plan:/);
  assert.match(summary, /AI SBOM use:/);
  assert.match(summary, /## Dependency changes/);
  assert.match(summary, /environment before:/);
  assert.match(summary, /## Agent pointers/);
  assert.match(summary, /discovery: fallback-required \/ missing: run aienvmap onboard \/ aienvmap onboard/);
  assert.match(summary, /aiEntry: aienvmap start --json \/ read aiEntry/);
  assert.match(summary, /## Quality signals/);
  assert.match(summary, /quality signals: prototype-hardening/);
  assert.match(summary, /## Release readiness/);
  assert.match(summary, /release readiness: 0\.2\.0 \/ prototype-hardening \/ hold/);
  assert.match(summary, /next:/);
});
