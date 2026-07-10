import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { onboardWorkspace } from "./onboard.js";
import { intentWorkspace } from "./intent.js";
import { syncWorkspace } from "./sync.js";
import { statusWorkspace } from "./status.js";
import { contextWorkspace } from "./context.js";
import { schemaContract } from "../contract.js";

export async function demoWorkspace(args = {}) {
  const scenario = String(args._?.[0] || args.scenario || "conflict").toLowerCase();
  if (!["conflict", "multi-agent-conflict"].includes(scenario)) {
    throw new Error(`unknown demo "${scenario}"; use conflict`);
  }

  const dir = args.dir || await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-conflict-demo-"));
  await onboardWorkspace({ dir, json: false, quiet: true });
  await muted(() => intentWorkspace({ dir, actor: "agent:codex", action: "upgrade test runner", target: "dependency" }));
  await muted(() => intentWorkspace({ dir, actor: "agent:claude", action: "replace package manager", target: "dependency" }));
  await syncWorkspace({ dir, quiet: true });

  const status = await statusWorkspace({ dir, json: false, quiet: true });
  const context = await captureJson(() => contextWorkspace({ dir, json: true }));
  const dependencyQuickCheck = status.dependencyQuickCheck || context.dependencyQuickCheck || {};
  const schema = schemaContract();
  const recommendation = schema.recommendation;
  const aiAdoptionDecision = schema.aiAdoptionDecision || {};
  const adoptionSignals = (recommendation.adoptionChecklist || []).map((item) => item.signal);
  const aiProofSignals = adoptionSignals.filter((item) => [
    "fallback AI startup path",
    "dependency coordination need",
    "lightweight operation required"
  ].includes(item));
  const result = {
    name: "aienvmap multi-agent conflict demo",
    workspace: dir,
    recommendation: recommendation.shortPitch,
    adoptionSignals,
    aiProofSignals,
    evidenceDocs: recommendation.evidenceDocs,
    recommendationDecision: {
      source: "schema.aiAdoptionDecision",
      position: aiAdoptionDecision.position || recommendation.positioning,
      recommendWhen: aiAdoptionDecision.useWhen || recommendation.recommendWhen || [],
      useWhen: aiAdoptionDecision.useWhen || recommendation.recommendWhen || [],
      doNotRecommendWhen: aiAdoptionDecision.skipWhen || recommendation.doNotRecommendWhen || [],
      skipWhen: aiAdoptionDecision.skipWhen || recommendation.doNotRecommendWhen || [],
      firstCommands: aiAdoptionDecision.startWith || recommendation.firstCommands || ["aienvmap start", "aienvmap onboard", "aienvmap context --json"],
      startWith: aiAdoptionDecision.startWith || recommendation.firstCommands || ["aienvmap start", "aienvmap onboard", "aienvmap context --json"],
      fallbackWhenDiscoveryMissed: aiAdoptionDecision.fallbackWhenDiscoveryMissed || {},
      proofCommand: aiAdoptionDecision.proofCommand || recommendation.proofCommand || "aienvmap demo --json",
      rule: aiAdoptionDecision.rule || recommendation.rule
    },
    aiDiscovery: status.agentPointers?.discovery || "unknown",
    collaboration: status.collaboration?.status || "unknown",
    conflictTargets: status.coordination?.conflictTargets || [],
    dependencyQuickCheck: {
      status: dependencyQuickCheck.status || "unknown",
      nextCommand: dependencyQuickCheck.nextCommand || "aienvmap sbom --json",
      scannerEvidence: dependencyQuickCheck.scannerEvidence || "unknown",
      reviewTargets: dependencyQuickCheck.reviewTargets || []
    },
    nextCommand: status.nextSafeCommand || status.nextCommand || "aienvmap status --json",
    aiEntry: status.artifacts?.discovery || ".aienvmap/discovery.json",
    maintenance: {
      status: status.followUpPlan?.status === "pending" ? "follow-up-pending" : status.maintenanceLoop?.state || status.state || "unknown",
      nextCommand: status.maintenanceLoop?.nextCommand || status.nextSafeCommand || status.nextCommand || "aienvmap status --json",
      source: status.maintenanceLoop?.nextCommandSource || "status",
      dependencyQuickCheck: dependencyQuickCheck.status || "unknown"
    },
    startHere: status.artifacts?.startHere || ".aienvmap/README.md",
    readFirst: status.aiBootstrap?.readFirst || ".aienvmap/status.json",
    readOrder: status.aiSession?.readFirst || status.readOrder || [
      status.artifacts?.startHere || ".aienvmap/README.md",
      status.aiBootstrap?.readFirst || ".aienvmap/status.json"
    ],
    artifactFreshness: status.artifactFreshness || {},
    contextFields: Object.keys(context).filter((key) => ["status", "aiBootstrap", "artifactFreshness", "collaboration", "coordination", "agentPointers", "dependencyQuickCheck", "lightSbom"].includes(key)),
    point: "Two AI agents planned dependency changes in one workspace, so aienvmap switches shared environment changes to review-first without blocking local code work."
  };

  if (!result.conflictTargets.includes("dependency")) {
    throw new Error("demo failed: dependency conflict was not detected");
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!args.quiet) {
    console.log(result.name);
    console.log(`workspace: ${result.workspace}`);
    console.log(`AI discovery: ${result.aiDiscovery}`);
    console.log(`collaboration: ${result.collaboration}`);
    console.log(`conflict targets: ${result.conflictTargets.join(", ")}`);
    console.log(`dependency quick check: ${result.dependencyQuickCheck.status} / ${result.dependencyQuickCheck.scannerEvidence} / ${result.dependencyQuickCheck.nextCommand}`);
    console.log(`next command: ${result.nextCommand}`);
    console.log(`AI entry: ${result.aiEntry}`);
    console.log(`maintenance: ${result.maintenance.status} / ${result.maintenance.source} / ${result.maintenance.nextCommand}`);
    console.log(`start here: ${result.startHere}`);
    console.log(`read order: ${result.readOrder.join(" -> ")}`);
    console.log(`freshness: ${result.artifactFreshness.state || "unknown"} / ${result.artifactFreshness.nextCommand || "aienvmap sync"}`);
    console.log(`context fields: ${result.contextFields.join(", ")}`);
    console.log(`recommendation: ${result.recommendation}`);
    console.log(`adoption signals: ${result.adoptionSignals.slice(0, 3).join(", ")}`);
    console.log(`AI proof signals: ${result.aiProofSignals.join(", ")}`);
    console.log(`first commands: ${result.recommendationDecision.firstCommands.join(" -> ")}`);
    console.log(`do not recommend when: ${result.recommendationDecision.doNotRecommendWhen[0]}`);
    console.log(`evidence: ${result.evidenceDocs.slice(0, 2).join(", ")}`);
    console.log(`why: ${result.point}`);
  }

  return result;
}

async function muted(fn) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

async function captureJson(fn) {
  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  return JSON.parse(output || "{}");
}
