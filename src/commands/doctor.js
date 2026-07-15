import { diagnose } from "../doctor.js";
import { readJsonStrict } from "../fsutil.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { intentsPath, manifestPath, timelinePath, workspaceDir } from "../paths.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { recommendedActions } from "../actions.js";
import { enforcementAdvice, strictResult } from "../enforcement.js";
import { buildPreflight } from "../preflight.js";

export { strictResult } from "../enforcement.js";

export async function doctorWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJsonStrict(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const policy = await loadPolicy(dir);
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const actions = recommendedActions(manifest, { warnings, intents });
  const preflight = buildPreflight(manifest, warnings, intents, timeline);
  const strict = strictResult(warnings, args);
  const nextSafeCommand = preflight.followUpPlan?.status === "pending"
    ? preflight.followUpPlan.nextCommand
    : doctorNextSafeCommand(actions, warnings);
  const exitBehavior = {
    mode: strict.enabled ? "strict" : "advisory",
    willSetFailureExitCode: strict.fail,
    reason: strict.enabled
      ? `strict scope ${strict.scope} is enabled`
      : "strict mode is off; warnings are reported without failing local operation",
    gate: strict.gate
  };
  if (args.json) {
    console.log(JSON.stringify({
      status: strict.fail ? "fail" : warnings.length ? "warning" : "ok",
      exitBehavior,
      trust: manifest.trust || {},
      policy,
      aiReadiness: preflight.aiReadiness,
      agentPointers: preflight.agentPointers,
      followUpPlan: preflight.followUpPlan,
      openIntentCount: intents.length,
      nextSafeCommand,
      warnings,
      recommendedActions: actions,
      enforcement: enforcementAdvice(warnings),
      strict
    }, null, 2));
    if (strict.fail) {
      process.exitCode = 1;
    }
    return;
  }
  if (!warnings.length) {
    console.log("doctor: no blocking environment warnings detected");
    printFollowUpPlan(preflight.followUpPlan);
    const advisoryActions = actions.filter((item) => item.id !== "continue-project-local");
    if (advisoryActions.length) printRecommendedActions(advisoryActions);
    return;
  }
  for (const warning of warnings) {
    console.log(`[${warning.code}] ${warning.message}`);
  }
  printFollowUpPlan(preflight.followUpPlan);
  printRecommendedActions(actions);
  console.log(`doctor: warnings are non-blocking by default; pass --ci or --strict ${strict.availableScopes.join("|")} to fail automation.`);
  if (strict.fail) {
    process.exitCode = 1;
  }
}

function printFollowUpPlan(followUpPlan = {}) {
  if (followUpPlan.status !== "pending") return;
  const targets = followUpPlan.targets?.length ? ` targets: ${followUpPlan.targets.join(", ")}` : "";
  console.log(`follow-up: ${followUpPlan.nextCommand || "aienvmap status --json"}${targets}`);
}

function printRecommendedActions(actions = []) {
  if (!actions.length) return;
  console.log("recommended actions:");
  for (const item of actions) {
    console.log(`- [${item.priority}] ${item.summary}${item.command ? ` (${item.command})` : ""}`);
  }
}

function doctorNextSafeCommand(actions = [], warnings = []) {
  const command = actions.find((item) => item.command)?.command;
  if (command) return command;
  if (warnings.length) return "aienvmap plan --write";
  return "aienvmap status --json";
}
