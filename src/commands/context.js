import { diagnose } from "../doctor.js";
import { readJson } from "../fsutil.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { intentsPath, manifestPath, timelinePath, workspaceDir } from "../paths.js";
import { renderContext } from "../render.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { recommendedActions } from "../actions.js";
import { buildPlan, compactStepSummary } from "./plan.js";
import { aiDecision } from "../decision.js";
import { enforcementAdvice } from "../enforcement.js";
import { buildPreflight } from "../preflight.js";
import { externalSbomWarnings, loadExternalSbomStartupSignal } from "../external-sbom-status.js";

export async function contextWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const policy = await loadPolicy(dir);
  const externalSbom = await loadExternalSbomStartupSignal(dir);
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy), ...externalSbomWarnings(externalSbom)];
  const decision = aiDecision(warnings, intents);
  const actions = recommendedActions(manifest, { warnings, intents });
  const stepSummary = compactStepSummary(buildPlan(manifest, warnings, intents, policy));
  const preflight = { ...buildPreflight(manifest, warnings, intents, timeline), externalSbom };
  const nextSafeCommand = contextNextSafeCommand(actions, warnings, preflight);
  if (args.json) {
    console.log(JSON.stringify({
      status: warnings.length ? "review-required" : "clear",
      nextSafeCommand,
      startHere: preflight.artifacts?.startHere || ".aienvmap/README.md",
      readOrder: preflight.readOrder || [],
      aiSession: preflight.aiSession,
      aiBootstrap: preflight.aiBootstrap,
      artifactFreshness: preflight.artifactFreshness,
      strictRecommendation: preflight.strictRecommendation,
      operationalSafety: preflight.operationalSafety,
      qualitySignals: preflight.qualitySignals,
      preflight,
      aiReadiness: preflight.aiReadiness,
      collaboration: preflight.collaboration,
      coordinationResolution: preflight.coordinationResolution,
      maintenanceLoop: preflight.maintenanceLoop,
      coordination: preflight.coordination,
      agentPointers: preflight.agentPointers,
      sbomRisk: preflight.sbomRisk,
      followUps: preflight.followUps,
      followUpPlan: preflight.followUpPlan,
      environmentChangeProtocol: preflight.environmentChangeProtocol,
      dependencyQuickCheck: preflight.dependencyQuickCheck,
      externalSbom,
      decision,
      enforcement: enforcementAdvice(warnings),
      recommendedActions: actions,
      stepSummary,
      trust: manifest.trust || {},
      guidance: decision,
      workspace: manifest.workspace,
      runtimes: manifest.runtimes,
      packageManagers: manifest.packageManagers,
      containers: manifest.containers,
      inventory: inventorySummary(manifest.inventory),
      dependencySnapshot: dependencySummary(manifest.dependencySnapshot),
      lightSbom: lightSbomSummary(manifest.lightSbom),
      security: securitySummary(manifest.security),
      projectHints: manifest.projectHints,
      warnings,
      policy,
      intents: intents.slice(-5),
      recentLedger: timeline.slice(-5),
      protocol: manifest.agentProtocol
    }, null, 2));
    return;
  }
  console.log(renderContext({ ...manifest, preflight }, timeline, warnings, intents, policy, actions));
}

function contextNextSafeCommand(actions = [], warnings = [], preflight = {}) {
  const actionCommand = actions.find((item) => item.command)?.command;
  return preflight.nextCommand
    || preflight.maintenanceLoop?.nextCommand
    || actionCommand
    || (warnings.length ? "aienvmap plan --write" : "aienvmap status --json");
}

function lightSbomSummary(lightSbom = {}) {
  return {
    mode: lightSbom.mode || "light-sbom",
    summary: lightSbom.summary || {
      ecosystems: {},
      managers: {},
      groups: {},
      manifests: [],
      lockfiles: [],
      packages: 0,
      vulnerabilities: 0,
      directVulnerablePackages: 0,
      transitiveOrUnmatchedVulnerablePackages: 0
    },
    topRisk: (lightSbom.topRisk || []).slice(0, 8),
    packageManagerPolicy: lightSbom.packageManagerPolicy || {
      status: "no-lockfile",
      ecosystems: {},
      guidance: "No lockfile policy detected."
    },
    dependencyChangeHints: (lightSbom.dependencyChangeHints || []).slice(0, 8),
    dependencyQuickCheck: lightSbom.dependencyQuickCheck || {},
    riskSummary: lightSbom.riskSummary || {},
    source: lightSbom.source || {},
    confidence: lightSbom.confidence || {},
    limitations: lightSbom.limitations || [],
    aiUse: lightSbom.aiUse || {}
  };
}

function dependencySummary(snapshot = {}) {
  return {
    mode: snapshot.mode || "snapshot",
    enabled: snapshot.enabled === true,
    summary: snapshot.summary || { ecosystems: [], manifests: 0, packages: 0 },
    packages: (snapshot.packages || []).slice(0, 12)
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
