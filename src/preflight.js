import { recommendedActions } from "./actions.js";
import { aiFallbackRead, aiStartupChecklist } from "./ai-contract.js";
import { aiDecision } from "./decision.js";
import { enforcementAdvice, enforcementGate } from "./enforcement.js";
import { operationalSafetyContract, preflightContract, qualitySignalsContract } from "./contract.js";
import { pendingFollowUps } from "./timeline.js";
import { buildAiDecisionEnvelope } from "./ai-decision-envelope.js";

export function buildPreflight(manifest = {}, warnings = [], intents = [], timeline = []) {
  const decision = aiDecision(warnings, intents);
  const enforcement = enforcementAdvice(warnings);
  const actions = recommendedActions(manifest, { warnings, intents });
  const state = decision.reviewRequired ? "review-required" : "clear";
  const topAction = actions[0] || null;
  const intentTargets = recommendedIntentTargets(manifest, warnings, intents);
  const dependencyReadSet = dependencyPreflightReadSet(manifest);
  const dependencyChangeProtocol = dependencyProtocol(manifest, dependencyReadSet);
  const dependencyQuickCheck = dependencyQuickCheckSummary(manifest, dependencyChangeProtocol);
  const coordination = coordinationSummary(intents);
  const followUps = pendingFollowUps(timeline);
  const followUpPlan = followUpPlanSummary(followUps);
  const agentActivity = agentActivitySummary(timeline);
  const sbomRisk = manifest.lightSbom?.riskSummary || {};
  const agentPointers = agentPointerSummary(manifest.agentFiles);
  const aiReadiness = aiReadinessSummary({ state, decision, coordination, agentActivity, agentPointers, sbomRisk, followUps });
  const collaboration = collaborationSummary({ state, decision, coordination, agentActivity, followUps, aiReadiness });
  const coordinationResolution = coordinationResolutionSummary({ coordination, agentActivity, followUpPlan, collaboration });
  const strictRecommendation = strictRecommendationSummary(enforcement);
  const maintenanceLoop = maintenanceLoopSummary({
    state,
    decision,
    topAction,
    followUps,
    sbomRisk,
    aiDependencyReview: manifest.lightSbom?.aiDependencyReview,
    dependencyReadSet,
    collaboration
  });
  const nextCommand = maintenanceLoop.nextCommand || topAction?.command || decision.nextCommand;
  const aiDecisionEnvelope = buildAiDecisionEnvelope({
    decision: state,
    reviewRequired: decision.reviewRequired,
    reasonCodes: [...warnings.map((item) => item.code), ...(intents.length ? ["open-intents"] : [])],
    evidenceRefs: [
      ".aienvmap/status.json",
      ...(warnings.some((item) => String(item.code || "").includes("external-sbom")) ? [".aienvmap/sbom.json"] : []),
      ...(intents.length ? [".aienvmap/intents.jsonl"] : []),
      ...(warnings.length ? ["aienvmap context --json"] : [])
    ],
    nextSafeCommand: nextCommand,
    projectLocalWork: decision.canContinueProjectLocalWork ? "allowed" : "review-first"
  });
  const aiBootstrap = aiBootstrapSummary({ state, decision, nextCommand, maintenanceLoop, topAction });
  const artifactFreshness = artifactFreshnessSummary(manifest, warnings);
  const aiSession = aiSessionSummary({
    state,
    nextCommand,
    aiBootstrap,
    artifactFreshness,
    agentPointers,
    collaboration,
    dependencyChangeProtocol
  });
  const environmentChangeProtocol = environmentProtocol({ state, intentTargets, dependencyChangeProtocol, collaboration });
  const operationalSafety = operationalSafetyContract();
  const qualitySignals = qualitySignalsContract();
  return {
    schemaVersion: 1,
    contract: preflightContract(),
    state,
    summary: state === "clear"
      ? "Project-local work can continue. Record intent before environment changes."
      : "Review warnings or open intents before environment changes.",
    decision,
    enforcement,
    strictRecommendation,
    operationalSafety,
    qualitySignals,
    aiDecisionEnvelope,
    enforcementProfile: {
      defaultMode: "advisory",
      localOperation: "non-blocking",
      strictMode: "optional",
      strictUse: "CI or explicit human-requested checks only",
      gate: enforcementGate(""),
      reason: "Avoid disrupting shared servers or developer machines while still making drift visible.",
      recommendedStrictCommand: enforcement.recommendedCommand,
      strictPlan: enforcement.strictPlan,
      strictDecision: enforcement.strictDecision,
      strictCommands: [
        "aienvmap doctor --strict security",
        "aienvmap doctor --strict policy",
        "aienvmap doctor --strict coordination",
        "aienvmap doctor --strict all"
      ]
    },
    counts: {
      warnings: warnings.length,
      openIntents: intents.length,
      runtimes: Object.keys(manifest.runtimes || {}).length,
      dependencies: Number(manifest.dependencySnapshot?.summary?.packages || 0),
      vulnerabilities: Number(manifest.security?.summary?.total || 0)
    },
    agentUse: {
      purpose: "First AI-readable environment preflight for this workspace.",
      rule: "Read status first, use context for details, record intent before environment changes.",
      projectLocalWork: decision.canContinueProjectLocalWork ? "allowed" : "review-first",
      environmentChanges: decision.canChangeEnvironmentWithoutReview ? "allowed" : "intent-and-review-first"
    },
    aiSession,
    aiBootstrap,
    artifactFreshness,
    quickstart: agentQuickstart(decision.reviewRequired),
    nextAgent: nextAgentHint(state, dependencyReadSet, dependencyChangeProtocol),
    coordination,
    coordinationResolution,
    agentActivity,
    collaboration,
    maintenanceLoop,
    agentPointers,
    aiReadiness,
    sbomRisk,
    followUps,
    followUpPlan,
    intentTargets,
    environmentChangeProtocol,
    dependencyReadSet,
    dependencyChangeProtocol,
    dependencyQuickCheck,
    artifacts: preflightArtifacts(),
    readOrder: [
      ".aienvmap/discovery.json",
      ".aienvmap/README.md",
      ".aienvmap/status.json",
      ".aienvmap/summary.md",
      "AIENV.md",
      ".aienvmap/manifest.json",
      ".aienvmap/plan.json",
      ".aienvmap/timeline.jsonl",
      ".aienvmap/intents.jsonl"
    ],
    commands: {
      refresh: "aienvmap sync",
      status: "aienvmap status --write",
      context: "aienvmap context --json",
      plan: "aienvmap plan --write",
      handoff: "aienvmap handoff --record --actor agent:id",
      checkpoint: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
      recordIntent: intentTargets[0]?.command || "aienvmap intent --actor agent:id --action planned-change"
    },
    topAction,
    nextCommand,
    nextSafeCommand: nextCommand
  };
}

function dependencyQuickCheckSummary(manifest = {}, dependencyChangeProtocol = {}) {
  const quick = manifest.lightSbom?.dependencyQuickCheck || {};
  const review = manifest.lightSbom?.aiDependencyReview || {};
  const sbomRisk = manifest.lightSbom?.riskSummary || {};
  const commands = dependencyChangeProtocol.commands || {};
  const reviewTargets = quick.reviewTargets || review.reviewTargets || sbomRisk.reviewTargets || [];
  return {
    status: quick.status || review.status || (["urgent", "high", "medium"].includes(sbomRisk.level) ? "review" : "ready"),
    purpose: quick.purpose || "10-second AI check before dependency, lockfile, package manager, security, or release-affecting dependency work.",
    readFirst: quick.readFirst || [".aienvmap/discovery.json", ".aienvmap/sbom.json", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
    nextCommand: quick.nextCommand || review.beforeDependencyChange?.[0] || sbomRisk.commands?.[0] || commands.recordIntent || "aienvmap sbom --json",
    reviewTargets: reviewTargets.slice(0, 5),
    scannerEvidence: quick.scannerEvidence || review.securityConfidence || "unknown",
    beforeChange: (quick.beforeChange || review.beforeDependencyChange || [commands.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target dependency"]).slice(0, 3),
    afterChange: (quick.afterChange || review.afterDependencyChange || [commands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"]).slice(-2),
    mustNotDo: (quick.mustNotDo || [
      "do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status",
      "do not switch package managers only because another AI prefers one",
      "do not make security claims from the light SBOM alone when scanner confidence is low"
    ]).slice(0, 3),
    rule: quick.rule || "Use this compact block as the first AI dependency-work decision; it is advisory and does not replace full scanner evidence."
  };
}

function coordinationResolutionSummary({ coordination = {}, agentActivity = {}, followUpPlan = {}, collaboration = {} }) {
  const targets = unique([
    ...(coordination.conflictTargets || []),
    ...(agentActivity.multiActorTargets || []),
    ...(followUpPlan.targets || [])
  ]);
  const needsReview = targets.length > 0 || collaboration.status === "review-before-env-change";
  const target = targets[0] || "<target>";
  return {
    status: needsReview ? "review" : "clear",
    mode: "advisory",
    targets,
    readFirst: [".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
    nextCommand: followUpPlan.status === "pending"
      ? followUpPlan.nextCommand
      : needsReview
        ? "aienvmap plan --write"
        : "aienvmap status --json",
    steps: needsReview
      ? [
        "Read the start-here file, status, summary, and context before shared environment changes.",
        "Run a read-only plan to compare open intents, multi-agent records, follow-ups, and SBOM risk.",
        "Ask the human owner or next AI to choose one environment direction when targets conflict.",
        "Resolve stale or superseded intents only after the chosen direction is clear.",
        "Record checkpoint and handoff after accepted environment changes."
      ]
      : [
        "Continue project-local work.",
        "Record intent before shared environment changes."
      ],
    commands: {
      plan: "aienvmap plan --write",
      resolveTarget: `aienvmap resolve --actor human:owner --target ${target} --status resolved`,
      handoff: "aienvmap handoff --record --actor agent:id",
      checkpoint: `aienvmap checkpoint --actor agent:id --summary environment-change --target ${target === "<target>" ? "environment" : target}`
    },
    mustNotDo: [
      "Do not pick one AI agent's environment change silently when another open intent targets the same surface.",
      "Do not resolve another agent's intent as completed unless the user or project owner chose that direction.",
      "Do not install, remove, upgrade, downgrade, or switch shared tools while coordination status is review."
    ],
    rule: needsReview
      ? "Use this advisory resolution routine before another AI changes the same shared environment target."
      : "No coordination conflict is active; keep using intent and checkpoint for environment changes."
  };
}

function environmentProtocol({ state, intentTargets = [], dependencyChangeProtocol = {}, collaboration = {} }) {
  const firstIntent = intentTargets[0];
  const target = firstIntent?.target || "environment";
  const intentCommand = firstIntent?.command || "aienvmap intent --actor agent:id --action planned-change --target environment";
  const dependencyCommands = dependencyChangeProtocol.commands || {};
  const checkpointCommand = target === "dependency"
    ? dependencyCommands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
    : `aienvmap checkpoint --actor agent:id --summary what-changed --target ${target}`;
  return {
    mode: "advisory",
    appliesWhen: "Before installing, removing, upgrading, downgrading, or switching runtimes, dependencies, package managers, Docker, or global tools.",
    state,
    readFirst: [".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
    beforeChange: [
      "Read status and context.",
      "Check collaboration.activeTargets and dependencyChangeProtocol when dependency files are involved.",
      "Record intent with the recommended target before editing shared environment state."
    ],
    afterChange: [
      "Run the narrowest relevant project validation.",
      "Run aienvmap checkpoint so the env map, light SBOM, status, summary, timeline, and handoff are refreshed."
    ],
    commands: {
      readStatus: "aienvmap status --json",
      readContext: "aienvmap context --json",
      recordIntent: intentCommand,
      checkpointAfterChange: checkpointCommand,
      handoff: dependencyCommands.handoff || "aienvmap handoff --record --actor agent:id"
    },
    mustNotDo: [
      "Do not run broad install, update, audit fix, or lockfile rewrite commands without reading the env map first.",
      "Do not switch package managers or runtime versions only because a tool prefers them.",
      "Do not ignore open intents, multi-agent activity, or pending follow-ups for the same target."
    ],
    nextCommand: collaboration.nextCommand || intentCommand,
    rule: state === "clear"
      ? "Project-local work can continue; use this advisory protocol before shared environment changes."
      : "Review status/context before shared environment changes; local code-only work can continue when allowed."
  };
}

function followUpPlanSummary(followUps = []) {
  const items = Array.isArray(followUps) ? followUps : [];
  const nextCommand = firstFollowUpCommand(items) || "aienvmap status --json";
  const targets = unique(items.map((item) => item.target || "environment"));
  const commands = uniqueCommands(items.flatMap((item) => item.commands || []));
  return {
    status: items.length ? "pending" : "clear",
    count: items.length,
    targets,
    readFirst: [".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
    nextCommand,
    commands,
    reason: items.length
      ? "Previous environment-affecting records still need refresh, status, or handoff follow-up."
      : "No pending follow-up after environment records.",
    rule: items.length
      ? "Run the follow-up command before another AI changes the same environment target."
      : "Continue project-local work; record intent before environment-affecting changes."
  };
}

function aiSessionSummary({ state, nextCommand, aiBootstrap = {}, artifactFreshness = {}, agentPointers = {}, collaboration = {}, dependencyChangeProtocol = {} }) {
  const commands = dependencyChangeProtocol.commands || {};
  return {
    purpose: "Shortest repeatable startup routine for AI agents in this workspace.",
    readFirst: [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md"],
    start: [
      "aienvmap status --json",
      artifactFreshness.state === "fresh" ? "aienvmap context --json" : "aienvmap sync"
    ],
    ifMissingOrStale: "aienvmap sync",
    beforeEnvironmentChange: commands.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target environment",
    afterEnvironmentChange: commands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    handoff: commands.handoff || "aienvmap handoff --record --actor agent:id",
    avoid: [
      "Do not run broad install, update, audit fix, or lockfile rewrite commands before reading status/context.",
      "Do not switch runtimes, package managers, Docker, or global tools only because an agent prefers them.",
      "Do not ignore open intents, multi-agent activity, pending follow-ups, or light SBOM review signals."
    ],
    nextCommand: nextCommand || aiBootstrap.nextSafeCommand || "aienvmap status --json",
    discovery: agentPointers.discovery || "missing: run aienvmap onboard",
    localWork: aiBootstrap.projectLocalWork || "allowed",
    environmentChanges: collaboration.environmentChanges || aiBootstrap.environmentChanges || "intent-first",
    state,
    rule: "Read status first, sync only when missing or stale, continue project-local work when allowed, and record intent before shared environment changes."
  };
}

function strictRecommendationSummary(enforcement = {}) {
  const strictDecision = enforcement.strictDecision || {};
  const policy = enforcement.policy || {};
  return {
    mode: "advisory-local-strict-optional",
    localCommand: strictDecision.localCommand || "aienvmap doctor --json",
    localBehavior: strictDecision.local || "warn-only",
    shouldFailLocal: strictDecision.shouldFailLocal === true,
    recommendedScope: strictDecision.recommendedScope || "all",
    ciCommand: strictDecision.ciCommand || "aienvmap doctor --strict all --json",
    releaseCommand: policy.release?.command || "aienvmap doctor --strict all --json",
    failingScopes: strictDecision.failingScopes || [],
    rule: strictDecision.rule || "Keep local operation advisory; use strict checks only for CI, release, or explicit human-requested verification."
  };
}

function artifactFreshnessSummary(manifest = {}, warnings = [], now = new Date()) {
  const generatedAt = manifest.generatedAt || "";
  const generatedMs = generatedAt ? new Date(generatedAt).getTime() : NaN;
  const ageHours = Number.isFinite(generatedMs)
    ? Math.max(0, Math.round(((now.getTime() - generatedMs) / 36e5) * 10) / 10)
    : null;
  const stale = warnings.some((warning) => warning.code === "manifest-stale");
  const state = !generatedAt ? "unknown" : stale ? "stale" : "fresh";
  return {
    state,
    generatedAt,
    ageHours,
    staleAfterHours: 24,
    statusArtifact: ".aienvmap/status.json",
    refreshCommand: "aienvmap sync",
    nextCommand: state === "fresh" ? "aienvmap status --json" : "aienvmap sync",
    rule: state === "fresh"
      ? "Use the current status artifact before environment-affecting work."
      : "Refresh artifacts before environment-affecting work; local code-only work can continue."
  };
}

function aiBootstrapSummary({ state, decision, nextCommand, maintenanceLoop = {}, topAction = {} }) {
  const meta = nextCommandMeta({ nextCommand, maintenanceLoop, topAction, decision });
  return {
    purpose: "Shortest AI entry point for this workspace environment.",
    readFirst: ".aienvmap/status.json",
    detailCommand: "aienvmap context --json",
    nextSafeCommand: nextCommand || "aienvmap status --json",
    nextSafeCommandSource: meta.source,
    nextSafeCommandReason: meta.reason,
    localMode: "advisory",
    projectLocalWork: decision.canContinueProjectLocalWork ? "allowed" : "review-first",
    environmentChanges: decision.canChangeEnvironmentWithoutReview ? "intent-first" : "review-first",
    rule: state === "clear"
      ? "Continue project-local work; record intent before shared environment changes."
      : "Review context before shared environment changes; local checks remain non-blocking."
  };
}

function nextCommandMeta({ nextCommand, maintenanceLoop = {}, topAction = {}, decision = {} }) {
  if (nextCommand && nextCommand === maintenanceLoop.nextCommand) {
    return {
      source: maintenanceLoop.nextCommandSource || "maintenance-loop",
      reason: maintenanceLoop.nextCommandReason || maintenanceLoop.rule || "Follow the recurring AI maintenance loop."
    };
  }
  if (nextCommand && topAction.command && nextCommand === topAction.command) {
    return {
      source: "recommended-action",
      reason: topAction.summary || "Use the highest-priority recommended action."
    };
  }
  if (nextCommand && nextCommand === decision.nextCommand) {
    return {
      source: "decision",
      reason: decision.reviewRequired ? "Review is required before shared environment changes." : "Project-local work can continue; record intent before environment changes."
    };
  }
  return {
    source: "fallback",
    reason: "Read status and context before changing shared environment state."
  };
}

function maintenanceLoopSummary({ state, decision, topAction, followUps, sbomRisk, aiDependencyReview = {}, dependencyReadSet, collaboration }) {
  const followUpCommand = firstFollowUpCommand(followUps);
  const dependencyAware = dependencyReadSet.length > 0;
  const securityReview = ["urgent", "high", "medium"].includes(sbomRisk?.level || "");
  const scannerOff = sbomRisk?.scanner === "off" || aiDependencyReview.securityConfidence === "scanner-off";
  const nextCommand = followUpCommand
    || collaboration?.nextCommand
    || topAction?.command
    || decision?.nextCommand
    || "aienvmap status --json";
  const nextCommandSource = followUpCommand
    ? "follow-up"
    : collaboration?.nextCommand
      ? "collaboration"
      : topAction?.command
        ? "recommended-action"
        : decision?.nextCommand
          ? "decision"
          : "fallback";
  const nextCommandReason = followUpCommand
    ? "A previous environment-affecting record still needs refresh, status, or handoff follow-up."
    : collaboration?.nextCommand
      ? collaboration.rule || "Collaboration signals should be reviewed before shared environment changes."
      : topAction?.summary || (decision?.reviewRequired ? "Review is required before shared environment changes." : "Project-local work can continue; record intent before environment changes.");
  const triggers = [
    "start of an AI coding session",
    "before runtime, dependency, package manager, Docker, or global tool changes",
    "after accepted environment changes",
    "before handing work to another AI or human"
  ];
  if (securityReview) triggers.push("before dependency or release decisions when SBOM risk is not clear");
  return {
    mode: "advisory",
    localImpact: "read-only until an AI or human intentionally records intent, checkpoint, or handoff",
    state,
    nextCommand,
    nextCommandSource,
    nextCommandReason,
    triggers,
    readOrder: [
      ".aienvmap/status.json",
      ".aienvmap/summary.md",
      "aienvmap context --json",
      "AIENV.md"
    ],
    cycle: [
      { step: "refresh", command: "aienvmap sync", when: "workspace env map may be stale" },
      { step: "decide", command: "aienvmap status --json", when: "first AI read or quick gate" },
      { step: "inspect", command: "aienvmap context --json", when: "status is review-required or details are needed" },
      { step: "plan", command: "aienvmap plan --write", when: "warnings, SBOM risk, or multi-agent activity need a read-only plan" },
      { step: "intent", command: dependencyAware ? "aienvmap intent --actor agent:id --action planned-change --target dependency" : "aienvmap intent --actor agent:id --action planned-change --target environment", when: "before environment-affecting changes" },
      { step: "checkpoint", command: dependencyAware ? "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency" : "aienvmap checkpoint --actor agent:id --summary what-changed --target environment", when: "after accepted environment-affecting changes" },
      { step: "handoff", command: "aienvmap handoff --record --actor agent:id", when: "before another AI continues environment work" }
    ],
    sbomCommand: securityReview || scannerOff ? "aienvmap sync --security" : "aienvmap sbom --json",
    sbomReview: sbomReviewSummary({ sbomRisk, aiDependencyReview, securityReview, scannerOff }),
    rule: "Keep local operation advisory and lightweight; use strict checks only when CI or the user explicitly asks."
  };
}

function sbomReviewSummary({ sbomRisk = {}, aiDependencyReview = {}, securityReview = false, scannerOff = false }) {
  const status = securityReview || aiDependencyReview.status === "review" ? "review" : "ready";
  const before = aiDependencyReview.beforeDependencyChange?.length
    ? aiDependencyReview.beforeDependencyChange
    : [
        scannerOff ? "aienvmap sync --security" : "aienvmap sbom --json",
        "aienvmap intent --actor agent:id --action dependency-review --target dependency",
        "aienvmap plan --write"
      ];
  const after = aiDependencyReview.afterDependencyChange?.length
    ? aiDependencyReview.afterDependencyChange
    : [
        "run the narrowest relevant project validation",
        "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
      ];
  return {
    status,
    riskLevel: sbomRisk.level || "unknown",
    score: Number(sbomRisk.score || 0),
    securityConfidence: aiDependencyReview.securityConfidence || (scannerOff ? "scanner-off" : "unknown"),
    reviewTargets: aiDependencyReview.reviewTargets || sbomRisk.reviewTargets || [],
    nextCommand: before[0] || "aienvmap sbom --json",
    beforeDependencyChange: before,
    afterDependencyChange: after,
    rule: status === "review"
      ? "Review SBOM risk, package manager policy, and dependency read set before dependency changes."
      : "Keep SBOM review lightweight; run security scan before dependency or release decisions when scanner confidence is low."
  };
}

function collaborationSummary({ state, decision, coordination, agentActivity, followUps, aiReadiness }) {
  const conflictTargets = coordination?.conflictTargets || [];
  const multiActorTargets = agentActivity?.multiActorTargets || [];
  const followUpTargets = (followUps || []).map((item) => item.target || "environment");
  const activeTargets = unique([...conflictTargets, ...multiActorTargets, ...followUpTargets]);
  const reviewSignals = [];
  if (conflictTargets.length) reviewSignals.push("open intent conflict");
  if (multiActorTargets.length) reviewSignals.push("multi-agent environment record");
  if ((followUps || []).length) reviewSignals.push("pending post-change follow-up");
  if (state !== "clear") reviewSignals.push("preflight review required");

  const nextCommand = firstFollowUpCommand(followUps)
    || (multiActorTargets.length ? "aienvmap handoff --record --actor agent:id" : "")
    || (conflictTargets.length ? "aienvmap plan --write" : "")
    || (decision?.canChangeEnvironmentWithoutReview
      ? "aienvmap intent --actor agent:id --action planned-change --target environment"
      : "aienvmap context --json");

  const status = reviewSignals.length ? "review-before-env-change" : "clear";
  return {
    status,
    mode: "advisory",
    activeTargets,
    reviewSignals,
    projectLocalWork: aiReadiness?.projectLocalWork || (decision?.canContinueProjectLocalWork ? "allowed" : "review-first"),
    environmentChanges: reviewSignals.length ? "intent-review-handoff-first" : "intent-first",
    nextCommand,
    rule: reviewSignals.length
      ? "Do not install, remove, upgrade, downgrade, or switch shared environment tools until the listed collaboration signals are reviewed."
      : "Multiple AI agents may continue project-local work; record intent before shared environment changes.",
    commands: {
      read: "aienvmap status --json",
      plan: "aienvmap plan --write",
      handoff: "aienvmap handoff --record --actor agent:id",
      checkpoint: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"
    }
  };
}

function aiReadinessSummary({ state, decision, coordination, agentActivity, agentPointers, sbomRisk, followUps }) {
  const blockers = [];
  const review = [];
  if (state !== "clear") review.push("status review required");
  if ((coordination?.conflictTargets || []).length) review.push("open intent conflicts");
  if ((agentActivity?.multiActorTargets || []).length) review.push("multi-agent environment activity");
  if ((followUps || []).length) review.push("pending environment follow-ups");
  if (["urgent", "high"].includes(sbomRisk?.level)) review.push("high light SBOM risk");
  if ((agentPointers?.targets || []).length && (agentPointers?.coveredCount ?? agentPointers?.installedCount ?? 0) === 0) review.push("no agent instruction pointer or recognized agent skill installed");

  const level = review.length ? "review" : "ready";
  const next = level === "ready"
    ? "AI agents can continue project-local work; record intent before environment changes."
    : "Review listed signals before another AI changes runtimes, dependencies, package managers, Docker, or global tools.";
  const safeProjectLocalActions = [
    "read status, summary, context, env map, SBOM, and timeline artifacts",
    "continue code-only work that does not install, remove, upgrade, downgrade, or switch tools",
    "write a plan or intent before changing runtimes, dependencies, package managers, Docker, or global tools"
  ];
  const reviewOnlyEnvironmentChanges = review.length
    ? "Record intent and review signals before environment changes; strict failure remains opt-in."
    : "Record intent before environment changes; strict failure remains opt-in.";
  return {
    level,
    requiresHumanReview: review.length > 0,
    projectLocalWork: decision?.canContinueProjectLocalWork ? "allowed" : "review-first",
    environmentChanges: decision?.canChangeEnvironmentWithoutReview ? "allowed" : "intent-and-review-first",
    safeProjectLocalActions,
    reviewOnlyEnvironmentChanges,
    signals: review,
    blockers,
    next,
    mode: "advisory"
  };
}

function agentActivitySummary(timeline = []) {
  const lastHandoffAt = lastTime(timeline, (item) => item.type === "agent-handoff");
  const envRecords = timeline
    .filter((item) => isEnvironmentRecord(item))
    .filter((item) => !lastHandoffAt || timeOf(item) > lastHandoffAt);
  const byTarget = new Map();
  for (const item of envRecords) {
    const target = normalizeTarget(item.target || targetFromText(`${item.summary || ""} ${item.action || ""}`) || "environment") || "environment";
    const summary = byTarget.get(target) || { target, count: 0, actors: [], latest: null, multiActor: false };
    summary.count += 1;
    if (item.actor && !summary.actors.includes(item.actor)) summary.actors.push(item.actor);
    if (!summary.latest || timeOf(item) > timeOf(summary.latest)) summary.latest = item;
    byTarget.set(target, summary);
  }
  const targets = [...byTarget.values()].map((item) => ({
    target: item.target,
    count: item.count,
    actors: item.actors.slice(0, 5),
    latestAt: item.latest?.at || "",
    latestSummary: item.latest?.summary || item.latest?.action || item.latest?.type || "",
    multiActor: item.actors.length > 1
  }));
  const multiActorTargets = targets.filter((item) => item.multiActor).map((item) => item.target);
  return {
    sinceLastHandoff: lastHandoffAt ? "after-last-handoff" : "all-recorded",
    environmentRecordCount: envRecords.length,
    targets,
    multiActorTargets,
    next: multiActorTargets.length
      ? "Run handoff and review follow-ups before another environment change."
      : envRecords.length
        ? "Run handoff before another AI continues environment work."
        : "No environment records need coordination."
  };
}

export function agentPointerSummary(agentFiles = {}) {
  const skills = Array.isArray(agentFiles?.skills) ? agentFiles.skills : [];
  const skillCovered = unique(skills.flatMap((item) => Array.isArray(item?.availableTo) ? item.availableTo : []));
  const entries = Object.entries(agentFiles || {}).filter(([name, item]) => {
    if (["agents", "claude", "gemini"].includes(name)) return true;
    if (!["cursor", "copilot"].includes(name)) return false;
    const normalized = normalizeAgentFile(item);
    return normalized.exists || normalized.hasAienvmapPointer;
  });
  const targets = entries.map(([name, item]) => {
    const normalized = normalizeAgentFile(item);
    return {
      name,
      role: normalized.role || (name === "agents" ? "codex" : name),
      file: normalized.path || defaultAgentFile(name),
      exists: normalized.exists,
      hasPointer: normalized.hasAienvmapPointer,
      installCommand: normalized.installCommand || defaultInstallCommand(name)
    };
  });
  const installed = targets.filter((item) => item.hasPointer);
  const installedRoles = installed.map((item) => item.role);
  const covered = unique([...installedRoles, ...skillCovered]);
  const missing = targets.filter((item) => !covered.includes(item.role));
  const discoveryDecision = covered.length ? "auto-ready" : "fallback-required";
  const methods = [installed.length ? "marker" : null, skillCovered.length ? "agent-skill" : null].filter(Boolean).join("+");
  return {
    installedCount: installed.length,
    coveredCount: covered.length,
    missingCount: missing.length,
    installed: installedRoles,
    skills,
    skillCovered,
    covered,
    missing: missing.map((item) => item.role),
    targets,
    discovery: covered.length
      ? `ready: ${covered.join(", ")}${skillCovered.length ? ` via ${methods}` : ""}`
      : "missing: run aienvmap onboard",
    discoveryDecision,
    nextSetupCommand: discoveryDecision === "auto-ready" ? "none" : "aienvmap onboard",
    startupChecklist: aiStartupChecklist,
    onboardCommand: "aienvmap onboard",
    fallbackRead: aiFallbackRead,
    fallbackCommand: "aienvmap start --json",
    next: missing.length
      ? `Run aienvmap onboard for Codex, Claude, and Gemini, or install one pointer with ${missing[0].installCommand}. Optional: use --agents cursor,copilot when those tools should discover aienvmap too.`
      : skillCovered.length
        ? "The aienvmap agent skill covers the requested AI tools; preserve the skill and use native pointers only where coverage is missing."
        : "Agent instruction pointers are installed for detected AI instruction files.",
    mode: "advisory",
    rule: "Instruction-file pointers or a recognized aienvmap agent skill improve automatic discovery. Host pickup is not proven; existing artifacts remain directly usable through aienvmap start --json or discovery.json."
  };
}

function normalizeAgentFile(item) {
  if (typeof item === "boolean") {
    return { exists: item, hasAienvmapPointer: item };
  }
  return {
    path: item?.path || "",
    exists: item?.exists === true,
    hasAienvmapPointer: item?.hasAienvmapPointer === true,
    installCommand: item?.installCommand || "",
    role: item?.role || ""
  };
}

function defaultAgentFile(name) {
  if (name === "claude") return "CLAUDE.md";
  if (name === "gemini") return "GEMINI.md";
  if (name === "cursor") return ".cursor/rules/environment.md";
  if (name === "copilot") return ".github/copilot-instructions.md";
  return "AGENTS.md";
}

function defaultInstallCommand(name) {
  if (name === "claude") return "aienvmap snippet claude --write";
  if (name === "gemini") return "aienvmap snippet gemini --write";
  if (name === "cursor") return "aienvmap snippet cursor --write";
  if (name === "copilot") return "aienvmap snippet copilot --write";
  return "aienvmap snippet codex --write";
}

function coordinationSummary(intents = []) {
  const byTarget = new Map();
  for (const intent of intents) {
    const target = normalizeTarget(intent.target || targetFromText(intent.action) || "environment") || "environment";
    const item = byTarget.get(target) || { target, count: 0, actors: [], actions: [], conflict: false };
    item.count += 1;
    if (intent.actor && !item.actors.includes(intent.actor)) item.actors.push(intent.actor);
    if (intent.action) item.actions.push(intent.action);
    byTarget.set(target, item);
  }
  const targets = [...byTarget.values()].map((item) => ({
    target: item.target,
    count: item.count,
    actors: item.actors.slice(0, 5),
    actions: item.actions.slice(-3),
    conflict: item.count > 1 && item.actors.length > 1
  }));
  const conflictTargets = targets.filter((item) => item.conflict).map((item) => item.target);
  return {
    openIntentCount: intents.length,
    targets,
    conflictTargets,
    next: conflictTargets.length
      ? "Review or resolve conflicting intents before environment changes."
      : intents.length
        ? "Check open intents before environment changes."
        : "No open environment intents."
  };
}

function isEnvironmentRecord(item = {}) {
  if (item.type === "detected-change") return false;
  const text = `${item.type || ""} ${item.target || ""} ${item.summary || ""} ${item.action || ""} ${item.change?.scope || ""} ${item.change?.key || ""}`.toLowerCase();
  return [
    "dependency",
    "dependencies",
    "package",
    "lockfile",
    "vulnerability",
    "runtime",
    "node",
    "python",
    "docker",
    "package manager",
    "package-manager",
    "npm",
    "pnpm",
    "yarn",
    "uv",
    "pip",
    "pipx",
    "global"
  ].some((token) => text.includes(token));
}

function lastTime(items = [], predicate) {
  const item = [...items].reverse().find(predicate);
  return item ? timeOf(item) : 0;
}

function timeOf(item = {}) {
  const value = new Date(item.at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function nextAgentHint(state, dependencyReadSet = [], dependencyChangeProtocol = {}) {
  const firstDependency = dependencyReadSet[0];
  const dependencyFiles = firstDependency
    ? [firstDependency.manifest, ...(firstDependency.lockfiles || [])].filter(Boolean)
    : [];
  return {
    handoffCommand: dependencyChangeProtocol.commands?.handoff || "aienvmap handoff --record --actor agent:id",
    readFirst: ".aienvmap/status.json",
    readSummary: ".aienvmap/summary.md",
    readNext: "aienvmap context --json",
    reviewState: state,
    dependencyFiles,
    dependencyProtocol: dependencyChangeProtocol.commands?.recordIntent
      ? "record dependency intent, sync after change, then record dependency-change"
      : "no dependency protocol detected",
    rule: state === "clear"
      ? "Next AI may continue project-local work; record intent before environment changes."
      : "Next AI should review warnings or open intents before environment changes."
  };
}

function dependencyProtocol(manifest = {}, dependencyReadSet = []) {
  const pmPolicy = manifest.lightSbom?.packageManagerPolicy || {};
  return {
    mode: "advisory",
    appliesWhen: "Before package, lockfile, or vulnerability remediation changes.",
    packageManagerPolicy: pmPolicy.status || "not-detected",
    beforeChange: [
      "Read dependencyReadSet manifests and lockfiles.",
      "Check lightSbom.packageManagerPolicy before choosing npm, pnpm, yarn, pip, uv, or another manager.",
      "Record dependency intent before edits."
    ],
    commands: {
      readContext: "aienvmap context --json",
      recordIntent: "aienvmap intent --actor agent:id --action planned-change --target dependency",
      refreshAfterChange: "aienvmap sync",
      recordAfterChange: "aienvmap record --actor agent:id --summary dependency-change --target dependency",
      checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
      handoff: "aienvmap handoff --record --actor agent:id"
    },
    mustNotDo: [
      "Do not switch package managers because another lockfile exists without user approval.",
      "Do not delete lockfiles or rewrite dependency manifests only to satisfy a tool preference.",
      "Do not run automatic fix commands without reviewing the dependency read set first."
    ],
    readSetCount: dependencyReadSet.length
  };
}

function dependencyPreflightReadSet(manifest = {}) {
  const hints = manifest.lightSbom?.dependencyChangeHints || [];
  const readSet = hints.map((hint) => ({
    manifest: hint.manifest,
    ecosystem: hint.ecosystem || "unknown",
    manager: hint.manager || "unknown",
    groups: hint.groups || [],
    lockfiles: (hint.lockfiles || []).map((item) => item.file).filter(Boolean),
    riskPackages: (hint.riskPackages || []).map((item) => item.name).filter(Boolean).slice(0, 5),
    reason: hint.riskPackages?.length
      ? "Read before dependency or security remediation; vulnerable packages are linked to this manifest."
      : "Read before dependency changes; this manifest defines project packages."
  }));
  if (readSet.length) return readSet.slice(0, 8);

  const manifests = manifest.lightSbom?.summary?.manifests || manifest.dependencySnapshot?.manifests || [];
  const lockfiles = (manifest.lightSbom?.summary?.lockfiles || manifest.dependencySnapshot?.lockfiles || [])
    .map((item) => item.file || item)
    .filter(Boolean);
  if (!manifests.length && !lockfiles.length) return [];
  return [{
    manifest: manifests[0] || "",
    ecosystem: "unknown",
    manager: "unknown",
    groups: [],
    lockfiles,
    riskPackages: [],
    reason: "Read detected dependency files before package changes."
  }];
}

function recommendedIntentTargets(manifest = {}, warnings = [], intents = []) {
  const targets = [];
  for (const warning of warnings) {
    addTarget(targets, targetFromWarning(warning), warning.message || warning.code, warning.code);
  }
  for (const intent of intents) {
    addTarget(targets, intent.target || targetFromText(intent.action), `Open intent from ${intent.actor || "unknown"}.`, "open-intent");
  }
  const pmPolicy = manifest.lightSbom?.packageManagerPolicy;
  if (pmPolicy?.status === "review-required") {
    addTarget(targets, "package-manager", pmPolicy.guidance, "package-manager-policy");
  }
  if (Number(manifest.security?.summary?.total || 0) > 0) {
    addTarget(targets, "dependency", "Security findings are dependency-related; record dependency intent before remediation.", "security");
  }
  if (Number(manifest.dependencySnapshot?.summary?.packages || 0) > 0) {
    addTarget(targets, "dependency", "Dependency manifests detected; use this target before package changes.", "dependency-snapshot");
  }
  if (!targets.length) {
    addTarget(targets, "environment", "Default target when the change affects runtime, dependency, container, or global tool state.", "default");
  }
  return targets.slice(0, 5).map((item) => ({
    ...item,
    command: `aienvmap intent --actor agent:id --action planned-change --target ${item.target}`
  }));
}

function addTarget(targets, target, reason, source) {
  const normalized = normalizeTarget(target);
  if (!normalized) return;
  const existing = targets.find((item) => item.target === normalized);
  if (existing) {
    if (source && !existing.sources.includes(source)) existing.sources.push(source);
    return;
  }
  targets.push({ target: normalized, reason: reason || "Environment change target.", sources: source ? [source] : [] });
}

function targetFromWarning(warning = {}) {
  if (warning.target) return warning.target;
  const code = warning.code || "";
  if (code.includes("node")) return "node";
  if (code.includes("python")) return "python";
  if (code.includes("docker")) return "docker";
  if (code.includes("lockfile") || code.includes("package-manager")) return "package-manager";
  if (code.includes("security")) return "dependency";
  if (code.includes("intent") || code.includes("handoff")) return "coordination";
  return targetFromText(`${warning.message || ""} ${code}`);
}

function targetFromText(text = "") {
  const normalized = String(text).toLowerCase();
  for (const target of ["node", "python", "docker", "package-manager", "dependency", "npm", "pnpm", "yarn", "uv", "pip", "pipx"]) {
    if (normalized.includes(target)) return target;
  }
  if (normalized.includes("package manager") || normalized.includes("lockfile")) return "package-manager";
  if (normalized.includes("vulnerab") || normalized.includes("package")) return "dependency";
  return "";
}

function normalizeTarget(target = "") {
  const normalized = String(target).trim().toLowerCase();
  if (["npm", "pnpm", "yarn"].includes(normalized)) return "package-manager";
  if (["pip", "pipx", "uv"].includes(normalized)) return "python";
  return normalized;
}

function unique(items = []) {
  return [...new Set(items.map((item) => normalizeTarget(item)).filter(Boolean))];
}

function uniqueCommands(items = []) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 8);
}

function firstFollowUpCommand(followUps = []) {
  for (const item of followUps || []) {
    const command = item.commands?.find(Boolean);
    if (command) return command;
  }
  return "";
}

function agentQuickstart(reviewRequired) {
  return {
    label: "10-second AI flow",
    readFirst: "aienvmap status --write",
    detailCommand: "aienvmap context --json",
    beforeEnvironmentChange: "aienvmap intent --actor agent:id --action planned-change --target <runtime|package-manager|docker|dependency>",
    afterEnvironmentChange: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    handoff: "aienvmap handoff --record --actor agent:id",
    rule: reviewRequired
      ? "Review warnings or open intents before environment changes; project-local work may continue."
      : "Continue project-local work; record intent before environment changes."
  };
}

export function preflightArtifacts() {
  return {
    discovery: ".aienvmap/discovery.json",
    startHere: ".aienvmap/README.md",
    status: ".aienvmap/status.json",
    summary: ".aienvmap/summary.md",
    envMap: "AIENV.md",
    manifest: ".aienvmap/manifest.json",
    sbom: ".aienvmap/sbom.json",
    cyclonedx: ".aienvmap/sbom.cdx.json",
    dashboard: ".aienvmap/dashboard.html",
    planJson: ".aienvmap/plan.json",
    planMarkdown: ".aienvmap/plan.md",
    intents: ".aienvmap/intents.jsonl",
    timeline: ".aienvmap/timeline.jsonl"
  };
}
