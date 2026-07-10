import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { diagnose } from "../doctor.js";
import { exists, readJson } from "../fsutil.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { dashboardPath, intentsPath, manifestPath, planJsonPath, planMdPath, timelinePath, workspaceDir } from "../paths.js";
import { renderDashboard } from "../render.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { recommendedActions } from "../actions.js";
import { strictResult } from "../enforcement.js";
import { buildPreflight } from "../preflight.js";

export async function dashWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const policy = await loadPolicy(dir);
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const planArtifacts = await detectedPlanArtifacts(dir);
  const planRemediation = await detectedPlanRemediation(dir);
  const planEnvironment = await detectedPlanEnvironment(dir);
  const html = renderDashboard({
    ...manifest,
    preflight: buildPreflight(manifest, warnings, intents, timeline),
    recommendedActions: recommendedActions(manifest, { warnings, intents }),
    planArtifacts,
    planRemediation,
    planEnvironment,
    ciReadiness: ciReadiness(warnings)
  }, timeline, warnings, intents, policy);
  const out = dashboardPath(dir);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html, "utf8");
  if (!args.quiet) console.log(`dashboard: ${out}`);
  if (args.open) openFile(out);
  return { dashboard: out };
}

function ciReadiness(warnings) {
  return ["security", "policy", "coordination", "all"].map((scope) => {
    const result = strictResult(warnings, { strict: scope });
    return {
      scope,
      status: result.fail ? "fail" : "pass",
      matchedWarningCodes: result.matchedWarningCodes
    };
  });
}

async function detectedPlanArtifacts(dir) {
  const json = planJsonPath(dir);
  const markdown = planMdPath(dir);
  return {
    json: await exists(json) ? ".aienvmap/plan.json" : "",
    markdown: await exists(markdown) ? ".aienvmap/plan.md" : ""
  };
}

async function detectedPlanRemediation(dir) {
  const plan = await readJson(planJsonPath(dir), {});
  return (plan.remediationSteps || []).slice(0, 5).map((item) => ({
    package: item.package || "unknown",
    severity: item.severity || "unknown",
    fixVersions: Array.isArray(item.fixVersions) ? item.fixVersions.slice(0, 3) : [],
    fixAvailable: item.fixAvailable === true,
    advisories: Array.isArray(item.advisories) ? item.advisories.map((advisory) => advisory.id || advisory.title).filter(Boolean).slice(0, 2) : []
  }));
}

async function detectedPlanEnvironment(dir) {
  const plan = await readJson(planJsonPath(dir), {});
  return (plan.environmentSteps || []).slice(0, 5).map((item) => ({
    code: item.code || "unknown",
    category: item.category || "environment",
    summary: item.summary || ""
  }));
}

function openFile(file) {
  if (process.platform === "win32") {
    execFile("cmd", ["/c", "start", "", file], { windowsHide: true });
  } else if (process.platform === "darwin") {
    execFile("open", [file]);
  } else {
    execFile("xdg-open", [file]);
  }
}
