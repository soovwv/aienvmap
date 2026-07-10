import { appendJsonLine } from "../fsutil.js";
import { readJsonl, openIntents } from "../timeline.js";
import { intentsPath, workspaceDir } from "../paths.js";

export async function resolveWorkspace(args) {
  const dir = workspaceDir(args);
  const actor = required(args.actor, "actor");
  const refs = await resolveIntentRefs(dir, args);
  const now = new Date().toISOString();
  const entries = refs.map((ref) => ({
    at: now,
    type: "intent-resolved",
    actor,
    ref,
    status: args.status || "resolved",
    reason: args.reason || ""
  }));
  for (const entry of entries) {
    await appendJsonLine(intentsPath(dir), entry);
  }
  const output = {
    status: args.status || "resolved",
    count: entries.length,
    refs,
    actor,
    reason: args.reason || ""
  };
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else if (!args.quiet) {
    console.log(`intents ${output.status}: ${output.count}${refs.length ? ` (${refs.join(", ")})` : ""}`);
  }
  return output;
}

function required(value, name) {
  if (!value) throw new Error(`resolve: --${name} is required`);
  return String(value);
}

async function resolveIntentRefs(dir, args) {
  const open = openIntents(await readJsonl(intentsPath(dir)));
  if (args.all) return open.map((intent) => intent.id);
  if (args.target) {
    const target = String(args.target).trim().toLowerCase();
    const refs = open
      .filter((intent) => String(intent.target || "").trim().toLowerCase() === target)
      .map((intent) => intent.id);
    if (!refs.length) throw new Error(`resolve: no open intents for target "${target}"`);
    return refs;
  }
  const requested = required(args.id || args.ref, "id");
  return [await resolveIntentRef(open, requested)];
}

async function resolveIntentRef(open, requested) {
  const matches = open.filter((intent) => intent.id === requested || intent.id.startsWith(requested));
  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    throw new Error(`resolve: "${requested}" matches multiple open intents`);
  }
  return requested;
}
