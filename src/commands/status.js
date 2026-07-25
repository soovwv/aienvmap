import { diagnose } from "../doctor.js";
import { jsonlRevision, readJsonStrict, writeJson } from "../fsutil.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { intentsPath, manifestPath, reconcileJsonPath, statusJsonPath, timelinePath, workspaceDir } from "../paths.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { buildPreflight } from "../preflight.js";
import { summarizeReconciliation } from "./reconcile.js";
import { externalSbomWarnings, loadExternalSbomStartupSignal } from "../external-sbom-status.js";
import { reconciliationFresh } from "../reconciliation-freshness.js";
import { compactStatusPreflight } from "../compact-preflight.js";
import { explainReasonCodes } from "../reason-explanations.js";

export async function statusWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJsonStrict(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const policy = await loadPolicy(dir);
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const coordinationRevision = await jsonlRevision(intentsPath(dir));
  const externalSbom = await loadExternalSbomStartupSignal(dir);
  const reconciliation = await readJsonStrict(reconcileJsonPath(dir), null);
  const reconciliationIsFresh = await reconciliationFresh(reconciliation, dir);
  const warnings = [
    ...diagnose(manifest, { timeline, intents }),
    ...policyWarnings(manifest, policy),
    ...externalSbomWarnings(externalSbom),
    ...reconciliationWarnings(reconciliation, reconciliationIsFresh)
  ];
  const built = { ...buildStatus(manifest, warnings, intents, timeline), externalSbom };
  const baseStatus = {
    ...built,
    coordinationRevision,
    coordination: {
      ...(built.coordination || {}),
      revision: coordinationRevision,
      compareAndSwap: "Pass --if-revision <coordinationRevision> to intent or resolve when acting on a previously read state."
    }
  };
  const status = reconciliation ? { ...baseStatus, reconciliation: summarizeReconciliation(reconciliation) } : {
    ...baseStatus,
    reconciliation: { decision: "missing", artifact: ".aienvmap/reconcile.json", nextCommand: "aienvmap reconcile --write", rule: "Generate read-only reconciliation evidence before runtime or package-manager changes." }
  };
  const artifact = args.write ? await writeStatusArtifact(dir, status) : "";
  const output = artifact ? { ...status, artifact } : status;
  if (args.json) {
    console.log(JSON.stringify(args.compact ? compactStatusPreflight(output) : output, null, 2));
  } else if (!args.quiet) {
    console.log(renderStatusText(output, { verbose: args.verbose === true, artifact }));
  }
  return output;
}

function reconciliationWarnings(reconciliation, fresh) {
  if (!reconciliation || !Array.isArray(reconciliation.findings)) return [];
  if (!fresh) return [{
    code: "project-reconciliation-stale",
    severity: "review",
    message: "Project reconciliation evidence is stale relative to its age or declaration files.",
    action: "Run aienvmap reconcile --quick --write before relying on project declaration findings.",
    source: "reconciliation"
  }];
  return reconciliation.findings
    .filter((item) => item?.severity === "review" && isProjectDeclarationFinding(item.code))
    .map((item) => ({ ...item, source: item.source || "reconciliation" }));
}

function isProjectDeclarationFinding(code) {
  const value = String(code || "");
  return value.startsWith("project-declaration-") || value.endsWith("-project-declarations-conflict") || value.endsWith("-project-declarations-unresolved");
}

export async function writeStatusArtifact(dir, status) {
  const out = statusJsonPath(dir);
  await writeJson(out, status);
  return out;
}

export function buildStatus(manifest = {}, warnings = [], intents = [], timeline = []) {
  return buildPreflight(manifest, warnings, intents, timeline);
}

export function renderStatusText(output = {}, options = {}) {
  const counts = output.counts || {};
  const readiness = output.aiReadiness?.level || "unknown";
  const collaboration = output.collaboration?.status || "unknown";
  const sbomRisk = output.sbomRisk?.level || "unknown";
  const sbomScore = valueOrZero(output.sbomRisk?.score);
  const externalSbom = output.externalSbom || {};
  const detail = output.quickstart?.detailCommand || "aienvmap context --json";
  const sessionStart = Array.isArray(output.aiSession?.start) && output.aiSession.start.length
    ? output.aiSession.start.join(" -> ")
    : `aienvmap status --json -> ${detail}`;
  const startHere = output.artifacts?.startHere || ".aienvmap/README.md";
  const summary = output.artifacts?.summary || ".aienvmap/summary.md";
  const discoveryDecision = output.agentPointers?.discoveryDecision || "fallback-required";
  const discovery = `${discoveryDecision} / ${output.agentPointers?.discovery || "missing: run aienvmap onboard"}`;
  const reason = explainReasonCodes(output.aiDecisionEnvelope?.reasonCodes, 1)[0] || output.summary || "Run aienvmap context --json for details.";
  const lines = [
    `Environment: ${output.state || "unknown"}`,
    `Detected: runtimes ${valueOrZero(counts.runtimes)} | package managers ${valueOrZero(counts.packageManagers)} | containers ${valueOrZero(counts.containers)}`,
    `Review: warnings ${valueOrZero(counts.warnings)} | planned changes ${valueOrZero(counts.openIntents)} | dependency risk ${sbomRisk} (${sbomScore})`,
    `Reason: ${reason}`,
    `Next: ${output.nextCommand || "aienvmap status --json"}`
  ];

  if (options.verbose) {
    const dependencyQuickCheck = output.dependencyQuickCheck || {};
    lines.push(
      `ready: ${readiness} | AI activity: ${collaboration}`,
      `external SBOM: ${externalSbom.decision || "no-external-evidence"}`,
      `ai: ${output.quickstart?.readFirst || "aienvmap status --write"} -> ${detail}`,
      `dependency: ${dependencyQuickCheck.status || "unknown"} / ${dependencyQuickCheck.scannerEvidence || "unknown"} / ${dependencyQuickCheck.nextCommand || "aienvmap sbom --json"}`,
      `stale: ${output.aiSession?.ifMissingOrStale || output.artifactFreshness?.refreshCommand || "aienvmap sync"}`,
      `intent: ${output.intentTargets?.[0]?.command || output.commands?.recordIntent || "aienvmap intent --actor agent:id --action planned-change"}`,
      `checkpoint: ${output.commands?.checkpoint || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}`,
      `handoff: ${output.nextAgent?.handoffCommand || "aienvmap handoff --record --actor agent:id"}`,
      `strict: ${output.enforcement?.recommendedCommand || "aienvmap doctor --strict all"}`,
      `session: ${sessionStart} | start: ${startHere} | summary: ${summary} | discovery: ${discovery}`
    );
  }

  if (options.artifact || output.artifact) lines.push(`status: ${options.artifact || output.artifact}`);
  return lines.join("\n");
}

function valueOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
