import fs from "node:fs/promises";
import path from "node:path";
import { diagnose } from "../doctor.js";
import { readJson } from "../fsutil.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { intentsPath, manifestPath, statusJsonPath, timelinePath, workspaceDir } from "../paths.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { buildPreflight } from "../preflight.js";

export async function statusWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const policy = await loadPolicy(dir);
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const status = buildStatus(manifest, warnings, intents, timeline);
  const artifact = args.write ? await writeStatusArtifact(dir, status) : "";
  const output = artifact ? { ...status, artifact } : status;
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else if (!args.quiet) {
    console.log(renderStatusText(output, { verbose: args.verbose === true, artifact }));
  }
  return output;
}

export async function writeStatusArtifact(dir, status) {
  const out = statusJsonPath(dir);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(status, null, 2), "utf8");
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
  const detail = output.quickstart?.detailCommand || "aienvmap context --json";
  const sessionStart = Array.isArray(output.aiSession?.start) && output.aiSession.start.length
    ? output.aiSession.start.join(" -> ")
    : `aienvmap status --json -> ${detail}`;
  const startHere = output.artifacts?.startHere || ".aienvmap/README.md";
  const summary = output.artifacts?.summary || ".aienvmap/summary.md";
  const discoveryDecision = output.agentPointers?.discoveryDecision || "fallback-required";
  const discovery = `${discoveryDecision} / ${output.agentPointers?.discovery || "missing: run aienvmap onboard"}`;
  const lines = [
    `${output.state || "unknown"}: ${output.summary || "Run aienvmap context --json for details."}`,
    `ready: ${readiness} | collaboration: ${collaboration}`,
    `sbom: ${sbomRisk} (${sbomScore}) | warnings: ${valueOrZero(counts.warnings)} | intents: ${valueOrZero(counts.openIntents)}`,
    `next: ${output.nextCommand || "aienvmap status --json"}`,
    `session: ${sessionStart} | start: ${startHere} | summary: ${summary} | discovery: ${discovery}`
  ];

  if (options.verbose) {
    const dependencyQuickCheck = output.dependencyQuickCheck || {};
    lines.push(
      `ai: ${output.quickstart?.readFirst || "aienvmap status --write"} -> ${detail}`,
      `dependency: ${dependencyQuickCheck.status || "unknown"} / ${dependencyQuickCheck.scannerEvidence || "unknown"} / ${dependencyQuickCheck.nextCommand || "aienvmap sbom --json"}`,
      `stale: ${output.aiSession?.ifMissingOrStale || output.artifactFreshness?.refreshCommand || "aienvmap sync"}`,
      `intent: ${output.intentTargets?.[0]?.command || output.commands?.recordIntent || "aienvmap intent --actor agent:id --action planned-change"}`,
      `checkpoint: ${output.commands?.checkpoint || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}`,
      `handoff: ${output.nextAgent?.handoffCommand || "aienvmap handoff --record --actor agent:id"}`,
      `strict: ${output.enforcement?.recommendedCommand || "aienvmap doctor --strict all"}`
    );
  }

  if (options.artifact || output.artifact) lines.push(`status: ${options.artifact || output.artifact}`);
  return lines.join("\n");
}

function valueOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
