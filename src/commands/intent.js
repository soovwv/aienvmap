import { appendJsonLine } from "../fsutil.js";
import { intentsPath, workspaceDir } from "../paths.js";
import { newIntentID } from "../timeline.js";
import { plannedTrust } from "../trust.js";

export async function intentWorkspace(args) {
  const dir = workspaceDir(args);
  const actor = required(args.actor, "actor");
  const action = required(args.action, "action");
  const now = new Date();
  const entry = {
    at: now.toISOString(),
    type: "intent",
    actor,
    action,
    target: args.target || "",
    reason: args.reason || "",
    status: "open",
    trust: plannedTrust(now)
  };
  entry.id = newIntentID();
  await appendJsonLine(intentsPath(dir), entry);
  console.log(`intent recorded: ${entry.id}`);
}

function required(value, name) {
  if (!value) throw new Error(`intent: --${name} is required`);
  return String(value);
}
