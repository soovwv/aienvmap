import fs from "node:fs/promises";
import path from "node:path";
import { schemaContract } from "../contract.js";
import { readJson } from "../fsutil.js";
import { manifestPath, statusJsonPath, summaryMdPath, workspaceDir } from "../paths.js";
import { statusWorkspace } from "./status.js";

export async function summaryWorkspace(args) {
  const dir = workspaceDir(args);
  let status = await readJson(statusJsonPath(dir));
  if (!status) {
    status = await statusWorkspace({ ...args, dir, json: false, write: true, quiet: true });
  }
  const manifest = await readJson(manifestPath(dir), {});
  const markdown = renderSummary(status, manifest);
  const artifact = args.write ? await writeSummaryArtifact(dir, markdown) : "";
  const output = { artifact, summary: markdown, state: status.state || "unknown", sbomRisk: status.sbomRisk || {}, nextCommand: status.nextCommand || "" };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else if (!args.quiet) {
    console.log(markdown.trimEnd());
    if (artifact) console.log(`\nsummary: ${artifact}`);
  }

  return output;
}

export async function writeSummaryArtifact(dir, markdown) {
  const out = summaryMdPath(dir);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${markdown.trimEnd()}\n`, "utf8");
  return out;
}

export function renderSummary(status = {}, manifest = {}) {
  const counts = status.counts || {};
  const sbomRisk = status.sbomRisk || manifest.lightSbom?.riskSummary || {};
  const coordination = status.coordination || {};
  const coordinationResolution = status.coordinationResolution || {};
  const activity = status.agentActivity || {};
  const collaboration = status.collaboration || {};
  const followUpPlan = status.followUpPlan || {};
  const environmentProtocol = status.environmentChangeProtocol || {};
  const environmentCommands = environmentProtocol.commands || {};
  const maintenanceLoop = status.maintenanceLoop || {};
  const sbomReview = maintenanceLoop.sbomReview || {};
  const aiBootstrap = status.aiBootstrap || {};
  const artifactFreshness = status.artifactFreshness || {};
  const aiSession = status.aiSession || {};
  const workspace = manifest.workspace?.root || manifest.workspace?.name || ".";
  const next = aiBootstrap.nextSafeCommand || status.nextSafeCommand || status.nextCommand || status.decision?.nextCommand || "aienvmap status";
  const startHere = status.artifacts?.startHere || ".aienvmap/README.md";
  const readFirst = aiBootstrap.readFirst || status.nextAgent?.readFirst || ".aienvmap/status.json";
  const detail = aiBootstrap.detailCommand || status.quickstart?.detailCommand || "aienvmap context --json";
  const strict = status.enforcement?.recommendedCommand || "aienvmap doctor --strict all";
  const riskLevel = sbomRisk.level || "unknown";
  const riskScore = valueOrZero(sbomRisk.score);
  const scanner = sbomRisk.scanner || manifest.lightSbom?.source?.scanner || "not run";
  const riskSignals = toList(sbomRisk.signals).slice(0, 3);
  const conflictTargets = toList(coordination.conflictTargets);
  const multiActorTargets = toList(activity.multiActorTargets);
  const dependencyProtocol = status.dependencyChangeProtocol || {};
  const dependencyCommands = dependencyProtocol.commands || {};
  const dependencyFiles = dependencyFilesFor(status.dependencyReadSet);
  const agentPointers = status.agentPointers || {};
  const discoveryDecision = agentPointers.discoveryDecision || (toList(agentPointers.installed).length ? "auto-ready" : "fallback-required");
  const discoverySetup = agentPointers.nextSetupCommand || (discoveryDecision === "auto-ready" ? "none" : "aienvmap onboard");
  const aiReadiness = status.aiReadiness || {};
  const aiSignals = toList(aiReadiness.signals).slice(0, 5);
  const aiNext = aiReadiness.next || "Run aienvmap context --json for details.";
  const aiDependencyReview = manifest.lightSbom?.aiDependencyReview || {};
  const dependencyQuickCheck = manifest.lightSbom?.dependencyQuickCheck || {
    status: aiDependencyReview.status || "unknown",
    nextCommand: aiDependencyReview.beforeDependencyChange?.[0] || sbomReview.nextCommand || "aienvmap sbom --json",
    scannerEvidence: aiDependencyReview.securityConfidence || "unknown",
    reviewTargets: aiDependencyReview.reviewTargets || sbomReview.reviewTargets || []
  };
  const aiUse = manifest.lightSbom?.aiUse || {
    decision: dependencyQuickCheck.status || aiDependencyReview.status || "unknown",
    securityConfidence: aiDependencyReview.securityConfidence || "unknown",
    scannerCommand: sbomReview.nextCommand || "aienvmap sync --security",
    nextCommand: dependencyQuickCheck.nextCommand || aiDependencyReview.beforeDependencyChange?.[0] || "aienvmap sbom --json"
  };
  const aiReviewPlan = manifest.lightSbom?.aiReviewPlan || {
    status: aiDependencyReview.status || "unknown",
    risk: `${riskLevel}/${riskScore}`,
    securityConfidence: aiDependencyReview.securityConfidence || "unknown",
    packageManagerPolicy: manifest.lightSbom?.packageManagerPolicy?.status || dependencyProtocol.packageManagerPolicy || "not-detected",
    beforeChange: aiDependencyReview.beforeDependencyChange?.[0] || sbomReview.nextCommand || "aienvmap sbom --json",
    afterChange: aiDependencyReview.afterDependencyChange?.slice(-1)[0] || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
  };
  const strictPlan = status.enforcementProfile?.strictPlan || status.enforcement?.strictPlan || {};
  const strictDecision = status.enforcementProfile?.strictDecision || status.enforcement?.strictDecision || {};
  const strictRecommendation = status.strictRecommendation || {};
  const releaseReadiness = schemaContract().releaseReadiness || {};
  const qualitySignals = status.qualitySignals || schemaContract().qualitySignals || {};
  const qualityPrinciples = toList(qualitySignals.principles).slice(0, 5);
  const qualityChecks = toList(qualitySignals.checks);
  const publishDecision = releaseReadiness.publishDecision || {};
  const publishGate = releaseReadiness.publishGate || {};
  const currentBatch = releaseReadiness.currentBatch || {};
  const releaseChecks = toList(releaseReadiness.requiredBeforeStable);
  const nextStabilizationTasks = toList(releaseReadiness.nextStabilizationTasks);
  const contractReview = releaseReadiness.contractReview || {};

  return [
    "# aienvmap summary",
    "",
    `- AI readiness: ${aiReadiness.level || "unknown"}`,
    `- AI signals: ${aiSignals.length ? aiSignals.join("; ") : "none"}`,
    `- AI start here: ${startHere}`,
    `- AI bootstrap: ${aiBootstrap.projectLocalWork || "allowed"} / ${aiBootstrap.environmentChanges || status.agentUse?.environmentChanges || "intent-first"} / ${aiBootstrap.localMode || "advisory"}`,
    `- AI session: ${(toList(aiSession.start)[0] || "aienvmap status --json")} -> ${(toList(aiSession.start)[1] || "aienvmap context --json")}`,
    `- AI artifact freshness: ${artifactFreshness.state || "unknown"} / ${artifactFreshness.nextCommand || "aienvmap sync"}`,
    `- AI next: ${next} (${aiNext})`,
    `- AI collaboration: ${collaboration.status || "unknown"} / ${toList(collaboration.activeTargets).join(", ") || "none"} / ${collaboration.nextCommand || "aienvmap status --json"}`,
    `- AI coordination resolution: ${coordinationResolution.status || "clear"} / ${toList(coordinationResolution.targets).join(", ") || "none"} / ${coordinationResolution.nextCommand || "aienvmap status --json"}`,
    `- AI follow-up: ${followUpPlan.status || "clear"} / ${followUpPlan.nextCommand || "aienvmap status --json"}`,
    `- AI environment protocol: ${environmentCommands.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target environment"} -> ${environmentCommands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}`,
    `- AI maintenance loop: ${maintenanceLoop.nextCommand || next}`,
    `- AI safe local work: ${toList(aiReadiness.safeProjectLocalActions)[0] || "read artifacts and avoid environment changes until reviewed"}`,
    `- AI read first: ${readFirst}, then ${detail}`,
    `- AI bootstrap rule: ${aiBootstrap.rule || "Read status first, use context for details, and keep local checks advisory."}`,
    `- mode: advisory by default; strict is opt-in with ${strict}`,
    `- local check: ${strictRecommendation.localCommand || strictDecision.localCommand || "aienvmap doctor --json"} (${strictRecommendation.localBehavior || strictDecision.local || "warn-only"})`,
    `- CI strict: ${strictRecommendation.ciCommand || strictPlan.ciCommand || `${strict} --json`}`,
    `- release strict: ${strictRecommendation.releaseCommand || "aienvmap doctor --strict all --json"}`,
    `- quality signals: ${qualitySignals.status || "prototype-hardening"} / ${qualityPrinciples.join(", ") || "AI-friendly, simple, lightweight"}`,
    `- release readiness: ${releaseReadiness.target || "0.2.0"} / ${releaseReadiness.status || "prototype-hardening"} / ${publishDecision.default || "hold"} / ${currentBatch.status || "accumulating"} / ${releaseChecks[0] || "npm run release:check passes locally"}`,
    "",
    `- state: ${status.state || "unknown"}`,
    `- workspace: ${workspace}`,
    `- warnings: ${valueOrZero(counts.warnings)} / open intents: ${valueOrZero(counts.openIntents)}`,
    `- runtimes: ${valueOrZero(counts.runtimes)} / dependencies: ${valueOrZero(counts.dependencies)} / vulnerabilities: ${valueOrZero(counts.vulnerabilities)}`,
    `- light SBOM risk: ${riskLevel} (${riskScore}) / scanner: ${scanner}`,
    `- next: ${next}`,
    "",
    "## AI handoff",
    "",
    `- environment changes: ${status.agentUse?.environmentChanges || "intent-and-review-first"}`,
    `- session rule: ${aiSession.rule || "Read status first, sync only when stale or missing, and record intent before shared environment changes."}`,
    `- collaboration rule: ${collaboration.rule || "Record intent before shared environment changes."}`,
    `- resolution rule: ${coordinationResolution.rule || "Use advisory coordination before shared environment changes."}`,
    `- coordination: ${coordination.next || "No open environment intents."}`,
    `- recent agent activity: ${activity.next || "No environment records need coordination."}`,
    `- maintenance rule: ${maintenanceLoop.rule || "Refresh, inspect, record intent, checkpoint, and hand off without blocking local operation."}`,
    `- environment rule: ${environmentProtocol.rule || "Read status/context, record intent, checkpoint, and hand off around shared environment changes."}`,
    `- conflict targets: ${conflictTargets.length ? conflictTargets.join(", ") : "none"}`,
    `- multi-actor targets: ${multiActorTargets.length ? multiActorTargets.join(", ") : "none"}`,
    "",
    "## SBOM",
    "",
    `- source: ${manifest.lightSbom?.source?.dependencies || "project manifests"}`,
    `- confidence: transitive ${manifest.lightSbom?.confidence?.transitiveDependencies || "not-resolved"}`,
    `- maintenance SBOM review: ${sbomReview.status || "unknown"} / ${sbomReview.securityConfidence || "unknown"} / ${sbomReview.nextCommand || maintenanceLoop.sbomCommand || "aienvmap sbom --json"}`,
    `- AI SBOM use: ${aiUse.decision || "unknown"} / ${aiUse.securityConfidence || "unknown"} / ${aiUse.scannerCommand || "aienvmap sync --security"} / ${aiUse.nextCommand || "aienvmap sbom --json"}`,
    `- dependency quick check: ${dependencyQuickCheck.status || "unknown"} / ${dependencyQuickCheck.scannerEvidence || "unknown"} / ${dependencyQuickCheck.nextCommand || "aienvmap sbom --json"} / ${toList(dependencyQuickCheck.reviewTargets).join(", ") || "none"}`,
    `- AI SBOM plan: ${aiReviewPlan.status || "unknown"} / ${aiReviewPlan.risk || `${riskLevel}/${riskScore}`} / ${aiReviewPlan.securityConfidence || "unknown"} / ${aiReviewPlan.beforeChange || "aienvmap sbom --json"}`,
    `- AI dependency review: ${aiDependencyReview.status || "unknown"} / ${aiDependencyReview.securityConfidence || "unknown"} / ${aiDependencyReview.beforeDependencyChange?.[0] || "aienvmap sbom --json"}`,
    `- signals: ${riskSignals.length ? riskSignals.join("; ") : "none"}`,
    `- verify: ${sbomRisk.next || "Use a dedicated scanner for security decisions."}`,
    "",
    "## Dependency changes",
    "",
    `- environment read: ${toList(environmentProtocol.readFirst).join(", ") || ".aienvmap/status.json, .aienvmap/summary.md, aienvmap context --json"}`,
    `- environment before: ${environmentCommands.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target environment"}`,
    `- environment after: ${environmentCommands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}`,
    `- read files: ${dependencyFiles.length ? dependencyFiles.join(", ") : "none detected"}`,
    `- before: ${dependencyCommands.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target dependency"}`,
    `- after: ${dependencyCommands.checkpointAfterChange || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"}`,
    `- package manager policy: ${dependencyProtocol.packageManagerPolicy || "not-detected"}`,
    "",
    "## Agent pointers",
    "",
    `- installed: ${toList(agentPointers.installed).join(", ") || "none"}`,
    `- missing: ${toList(agentPointers.missing).join(", ") || "none"}`,
    `- discovery: ${discoveryDecision} / ${agentPointers.discovery || "missing: run aienvmap onboard"} / ${discoverySetup}`,
    `- aiEntry: ${agentPointers.fallbackCommand || "aienvmap start --json"} / read aiEntry for readFirst, nextCommand, setup, intent, checkpoint, handoff, and copyPastePrompt`,
    `- next: ${agentPointers.next || "Run aienvmap snippet codex --write if AI agents need instruction-file discovery."}`,
    `- fallback: ${agentPointers.fallbackCommand || "aienvmap start --json"} / ${toList(agentPointers.fallbackRead).slice(0, 4).join(" -> ") || ".aienvmap/discovery.json -> .aienvmap/README.md -> .aienvmap/status.json -> .aienvmap/summary.md"}`,
    "",
    "## Quality signals",
    "",
    `- status: ${qualitySignals.status || "prototype-hardening"}`,
    `- principles: ${qualityPrinciples.join(", ") || "AI-friendly, simple, lightweight, advisory-first, batched-release"}`,
    `- first check: ${qualityChecks[0]?.name || "AI entry path"} / ${qualityChecks[0]?.evidence || "aienvmap discover --json && aienvmap status --json && aienvmap context --json"}`,
    `- must stay true: ${toList(qualitySignals.mustStayTrue)[0] || "do not require background services, daemons, or lock managers for the default flow"}`,
    `- rule: ${qualitySignals.rule || "Keep the default product lightweight and AI-readable before adding deeper integrations."}`,
    "",
    "## Release readiness",
    "",
    `- target: ${releaseReadiness.target || "0.2.0"}`,
    `- status: ${releaseReadiness.status || "prototype-hardening"}`,
    `- default decision: ${publishDecision.default || "hold"}`,
    `- publish gate: ${publishGate.status || "hold"} / ${publishGate.nextAction || "Keep accumulating tested changes until the batch is intentionally versioned."}`,
    `- current batch: ${currentBatch.status || "accumulating"} / ${currentBatch.releaseType || "stability-batch"} / ${toList(currentBatch.themes).join(", ") || "AI contract, dashboard, SBOM, release gate"}`,
    `- next stabilization: ${nextStabilizationTasks[0] || "keep the reviewed JSON root-field freeze candidate unchanged"}`,
    `- contract review: ${contractReview.status || "freeze-candidate-verified"} / ${contractReview.command || "npm run contract:check"} / ${toList(contractReview.surfaces).join(", ") || "discover, start, status, context, handoff, sbom"}`,
    `- batch reason: ${currentBatch.reason || "Accumulate meaningful changes before one intentional release."}`,
    `- gate: ${releaseChecks[0] || "npm run release:check passes locally"}`,
    `- publish when: ${toList(publishDecision.publishWhen)[0] || "meaningful changes are batched"}`,
    `- hold when: ${toList(publishDecision.holdWhen)[0] || "changes can be batched into the next release"}`,
    `- publish: ${releaseReadiness.batchRule || "Batch meaningful AI-contract, dashboard, SBOM, and release-gate changes before one npm publish."}`,
    `- stable contract: ${releaseReadiness.stableContractRule || "After 0.2.0, documented JSON fields remain additive and backward-compatible."}`,
    "",
    "## Artifacts",
    "",
    "- .aienvmap/README.md",
    "- AIENV.md",
    "- .aienvmap/status.json",
    "- .aienvmap/manifest.json",
    "- .aienvmap/sbom.json",
    "- .aienvmap/sbom.cdx.json",
    "- .aienvmap/dashboard.html"
  ].join("\n");
}

function valueOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function dependencyFilesFor(readSet = []) {
  const files = [];
  for (const item of toList(readSet).slice(0, 3)) {
    if (item.manifest) files.push(item.manifest);
    for (const lockfile of toList(item.lockfiles).slice(0, 3)) {
      const file = typeof lockfile === "string" ? lockfile : lockfile?.file;
      if (file && !files.includes(file)) files.push(file);
    }
  }
  return files.slice(0, 8);
}
