import { diagnose } from "../doctor.js";
import { appendJsonLine, readJsonStrict } from "../fsutil.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { intentsPath, manifestPath, timelinePath, workspaceDir } from "../paths.js";
import { renderHandoff } from "../render.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { changedTrust } from "../trust.js";
import { recommendedActions } from "../actions.js";
import { aiDecision } from "../decision.js";
import { buildPreflight } from "../preflight.js";

export async function handoffWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJsonStrict(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const policy = await loadPolicy(dir);
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const handoff = buildHandoff(manifest, timeline, warnings, intents, policy);
  if (args.record) {
    await recordHandoff(timelinePath(dir), handoff, args.actor || "agent:unknown");
  }

  if (args.json) {
    console.log(JSON.stringify(handoff, null, 2));
  } else if (!args.quiet) {
    console.log(renderHandoff(handoff));
  }
  return handoff;
}

async function recordHandoff(file, handoff, actor) {
  const now = new Date();
  await appendJsonLine(file, {
    at: now.toISOString(),
    actor,
    type: "agent-handoff",
    summary: `handoff ${handoff.status}`,
    status: handoff.status,
    warnings: handoff.warnings.map((warning) => warning.code),
    trust: changedTrust(now, handoff.status !== "clear")
  });
}

export function buildHandoff(manifest, timeline = [], warnings = [], intents = [], policy = {}) {
  const reviewRequired = warnings.length > 0 || intents.length > 0;
  const actions = recommendedActions(manifest, { warnings, intents });
  const preflight = buildPreflight(manifest, warnings, intents, timeline);
  return {
    status: reviewRequired ? "review-required" : "clear",
    nextSafeCommand: preflight.nextCommand || preflight.maintenanceLoop?.nextCommand || "aienvmap status --json",
    startHere: preflight.artifacts?.startHere || ".aienvmap/README.md",
    readOrder: preflight.readOrder || [],
    aiBootstrap: preflight.aiBootstrap,
    trust: manifest.trust || {},
    schemaVersion: manifest.schemaVersion || 1,
    preflight,
    decision: aiDecision(warnings, intents),
    workspace: manifest.workspace,
    safeRuntime: {
      node: manifest.runtimes?.node || "not detected",
      python: manifest.runtimes?.python || manifest.runtimes?.python3 || "not detected",
      docker: manifest.containers?.docker ? "available" : "not detected"
    },
    inventory: inventorySummary(manifest.inventory),
    security: securitySummary(manifest.security),
    dependencyHandoff: dependencyHandoffSummary(preflight, manifest),
    continuation: continuationSummary(preflight, manifest),
    coordination: preflight.coordination,
    coordinationResolution: preflight.coordinationResolution,
    agentActivity: preflight.agentActivity,
    policy: {
      node: policy.node || "not set",
      python: policy.python || "not set",
      packageManager: policy.packageManager || "not set",
      runtimeChanges: policy.runtimeChanges || "ask-first",
      globalInstalls: policy.globalInstalls || "ask-first"
    },
    openIntents: intents.slice(-5).reverse(),
    warnings,
    recommendedActions: actions,
    recentChanges: timeline.slice(-5).reverse(),
    mustNotDo: [
      "do not change global runtimes without user approval",
      "do not install or remove global package managers without user approval",
      "do not change Docker daemon/context assumptions without user approval"
    ],
    recommendedNext: reviewRequired
      ? "review warnings and open intents before environment changes"
      : "continue with project-local work; record intent before environment changes"
  };
}

function continuationSummary(preflight = {}, manifest = {}) {
  const maintenanceLoop = preflight.maintenanceLoop || {};
  const strictDecision = preflight.enforcementProfile?.strictDecision || preflight.enforcement?.strictDecision || {};
  const sbomReview = maintenanceLoop.sbomReview || {};
  const dependencyQuickCheck = manifest.lightSbom?.dependencyQuickCheck || {};
  const followUpPlan = preflight.followUpPlan || {};
  const coordinationResolution = preflight.coordinationResolution || {};
  const agentPointers = preflight.agentPointers || {};
  const readOrder = (maintenanceLoop.readOrder || preflight.readOrder || []).slice(0, 4);
  const nextCommand = maintenanceLoop.nextCommand || preflight.nextCommand || "aienvmap status --json";
  return {
    status: preflight.state || "unknown",
    nextCommand,
    readOrder,
    resume: {
      purpose: "Minimum next-AI routine for continuing from the same environment map.",
      readFirst: readOrder.length ? readOrder : [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md"],
      nextCommand,
      allowed: "project-local code work can continue when status/context do not require environment review",
      beforeEnvironmentChange: preflight.aiSession?.beforeEnvironmentChange || "aienvmap intent --actor agent:id --action planned-change --target environment",
      afterEnvironmentChange: preflight.aiSession?.afterEnvironmentChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
      handoff: preflight.aiSession?.handoff || "aienvmap handoff --record --actor agent:id",
      mustNotDo: [
        "do not continue from memory only; read current aienvmap artifacts first",
        "do not change runtimes, dependencies, package managers, Docker, or global tools before intent/review",
        "do not ignore pending follow-ups, coordination conflicts, or SBOM review signals"
      ],
      rule: "Every next AI should start from the same aienvmap read order, then record intent/checkpoint/handoff around shared environment changes."
    },
    followUpPlan: {
      status: followUpPlan.status || "clear",
      count: Number(followUpPlan.count || 0),
      targets: (followUpPlan.targets || []).slice(0, 5),
      nextCommand: followUpPlan.nextCommand || "aienvmap status --json",
      rule: followUpPlan.rule || followUpPlan.reason || "Resolve follow-ups before shared environment changes."
    },
    discovery: {
      decision: agentPointers.discoveryDecision || ((agentPointers.installedCount || 0) > 0 ? "auto-ready" : "fallback-required"),
      pointerStatus: agentPointers.discovery || "missing: run aienvmap onboard",
      nextSetupCommand: agentPointers.nextSetupCommand || ((agentPointers.installedCount || 0) > 0 ? "none" : "aienvmap onboard"),
      fallbackCommand: agentPointers.fallbackCommand || "aienvmap start --json",
      fallbackRead: (agentPointers.fallbackRead || [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"]).slice(0, 4),
      startupChecklist: (agentPointers.startupChecklist || []).slice(0, 4),
      rule: "Use this discovery decision before assuming the next AI auto-loaded the aienvmap pointer."
    },
    coordinationResolution: {
      status: coordinationResolution.status || "clear",
      targets: (coordinationResolution.targets || []).slice(0, 5),
      nextCommand: coordinationResolution.nextCommand || "aienvmap status --json",
      rule: coordinationResolution.rule || "Use advisory coordination before shared environment changes."
    },
    maintenance: {
      mode: maintenanceLoop.mode || "advisory",
      localImpact: maintenanceLoop.localImpact || "read-only until an AI or human records a change",
      sbomCommand: maintenanceLoop.sbomCommand || "aienvmap sbom --json",
      rule: maintenanceLoop.rule || "Keep local operation advisory and lightweight."
    },
    sbomReview: {
      status: sbomReview.status || "unknown",
      riskLevel: sbomReview.riskLevel || "unknown",
      securityConfidence: sbomReview.securityConfidence || "unknown",
      nextCommand: sbomReview.nextCommand || maintenanceLoop.sbomCommand || "aienvmap sbom --json",
      reviewTargets: (sbomReview.reviewTargets || []).slice(0, 5)
    },
    dependencyQuickCheck: {
      status: dependencyQuickCheck.status || "unknown",
      nextCommand: dependencyQuickCheck.nextCommand || sbomReview.nextCommand || maintenanceLoop.sbomCommand || "aienvmap sbom --json",
      scannerEvidence: dependencyQuickCheck.scannerEvidence || sbomReview.securityConfidence || "unknown",
      reviewTargets: (dependencyQuickCheck.reviewTargets || sbomReview.reviewTargets || []).slice(0, 5),
      mustNotDo: (dependencyQuickCheck.mustNotDo || []).slice(0, 3),
      rule: dependencyQuickCheck.rule || "Use .aienvmap/sbom.json dependencyQuickCheck before dependency, lockfile, remediation, or release-affecting work."
    },
    strict: {
      localCommand: strictDecision.localCommand || "aienvmap doctor --json",
      local: strictDecision.local || "warn-only",
      shouldFailLocal: strictDecision.shouldFailLocal === true,
      ciCommand: strictDecision.ciCommand || "aienvmap doctor --strict all --json",
      rule: strictDecision.rule || "Local checks stay advisory; strict failure is opt-in."
    }
  };
}

function dependencyHandoffSummary(preflight = {}, manifest = {}) {
  const protocol = preflight.dependencyChangeProtocol || {};
  const dependencyQuickCheck = manifest.lightSbom?.dependencyQuickCheck || {};
  return {
    readSet: (preflight.dependencyReadSet || []).slice(0, 5),
    quickCheck: {
      status: dependencyQuickCheck.status || "unknown",
      nextCommand: dependencyQuickCheck.nextCommand || "aienvmap sbom --json",
      scannerEvidence: dependencyQuickCheck.scannerEvidence || "unknown",
      reviewTargets: (dependencyQuickCheck.reviewTargets || []).slice(0, 5),
      rule: dependencyQuickCheck.rule || "Read dependencyQuickCheck before dependency-affecting work."
    },
    protocol: {
      mode: protocol.mode || "advisory",
      packageManagerPolicy: protocol.packageManagerPolicy || "not-detected",
      recordIntent: protocol.commands?.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target dependency",
      recordAfterChange: protocol.commands?.recordAfterChange || "aienvmap record --actor agent:id --summary dependency-change --target dependency",
      checkpointAfterChange: protocol.commands?.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
      handoff: protocol.commands?.handoff || "aienvmap handoff --record --actor agent:id"
    }
  };
}

function securitySummary(security = {}) {
  return {
    mode: security.mode || "basic",
    enabled: security.enabled === true,
    summary: security.summary || { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
    topPackages: security.topPackages || []
  };
}

function inventorySummary(inventory = {}) {
  const tools = inventory.tools || {};
  return {
    mode: inventory.mode || "basic",
    enabled: inventory.enabled === true,
    groups: Object.fromEntries(Object.entries(tools).map(([name, items]) => [name, items.length]))
  };
}
