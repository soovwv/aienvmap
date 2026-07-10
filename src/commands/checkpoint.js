import { handoffWorkspace } from "./handoff.js";
import { recordWorkspace } from "./record.js";
import { statusWorkspace } from "./status.js";
import { syncWorkspace } from "./sync.js";
import { appendJsonLine } from "../fsutil.js";
import { timelinePath, workspaceDir } from "../paths.js";
import { observedTrust } from "../trust.js";

export async function checkpointWorkspace(args) {
  const actor = required(args.actor, "actor");
  const summary = required(args.summary || args.change, "summary");
  const quiet = args.quiet || args.json;
  const base = { ...args, actor, summary, quiet: true };

  const record = await recordWorkspace(base);
  const sync = await syncWorkspace({ ...base, json: false, quiet: true });
  await recordCheckpointSync(base);
  const handoff = await handoffWorkspace({ ...base, json: false, record: true, quiet: true });
  const status = await statusWorkspace({ ...base, json: false, write: true, quiet: true });

  const result = {
    status: "ok",
    mode: "post-environment-change",
    actor,
    summary,
    target: args.target || "",
    record,
    outputs: sync.outputs,
    state: status.state,
    warnings: status.counts?.warnings || 0,
    followUps: status.followUps || [],
    agentActivity: status.agentActivity || {},
    handoff: {
      status: handoff.status,
      recommendedNext: handoff.recommendedNext
    },
    next: "Share .aienvmap/status.json or run `aienvmap context --json` before another environment change."
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!quiet) {
    console.log(`checkpoint: ${result.state}`);
    console.log(`record: ${record.summary}${record.target ? ` (${record.target})` : ""}`);
    console.log(`status: ${result.outputs.status}`);
    console.log(`handoff: ${handoff.status}`);
    console.log(`next: ${result.next}`);
  }

  return result;
}

async function recordCheckpointSync(args) {
  const now = new Date();
  await appendJsonLine(timelinePath(workspaceDir(args)), {
    at: now.toISOString(),
    actor: args.actor,
    type: "sync",
    summary: "checkpoint sync",
    target: "",
    trust: observedTrust(now)
  });
}

function required(value, name) {
  if (!value) throw new Error(`checkpoint: --${name} is required`);
  return String(value);
}
