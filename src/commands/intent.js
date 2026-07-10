import { appendJsonLinesChecked } from "../fsutil.js";
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
  const revision = await appendJsonLinesChecked(intentsPath(dir), [entry], args.if_revision);
  const output = { ...entry, coordinationRevision: revision.revision, previousRevision: revision.beforeRevision };
  if (args.json) console.log(JSON.stringify(output, null, 2));
  else if (!args.quiet) console.log(`intent recorded: ${entry.id} (revision ${revision.revision})`);
  return output;
}

function required(value, name) {
  if (!value) throw new Error(`intent: --${name} is required`);
  return String(value);
}
