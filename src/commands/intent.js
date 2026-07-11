import { appendJsonLinesChecked } from "../fsutil.js";
import { intentsPath, workspaceDir } from "../paths.js";
import { newIntentID } from "../timeline.js";
import { plannedTrust } from "../trust.js";

export async function intentWorkspace(args) {
  const dir = workspaceDir(args);
  const actor = required(args.actor, "actor");
  const action = required(args.action, "action");
  const now = new Date();
  const session = optionalIdentifier(args.session, "session");
  const leaseMinutes = optionalLeaseMinutes(args.lease_minutes);
  const entry = {
    at: now.toISOString(),
    type: "intent",
    actor,
    ...(session ? { session } : {}),
    action,
    target: args.target || "",
    reason: args.reason || "",
    status: "open",
    trust: plannedTrust(now)
  };
  if (leaseMinutes) {
    entry.leaseMinutes = leaseMinutes;
    entry.leaseExpiresAt = new Date(now.getTime() + leaseMinutes * 60_000).toISOString();
  }
  entry.id = newIntentID();
  const revision = await appendJsonLinesChecked(intentsPath(dir), [entry], args.if_revision);
  const output = { ...entry, coordinationRevision: revision.revision, previousRevision: revision.beforeRevision };
  if (args.json) console.log(JSON.stringify(output, null, 2));
  else if (!args.quiet) console.log(`intent recorded: ${entry.id} (revision ${revision.revision})`);
  return output;
}

function optionalIdentifier(value, name) {
  if (value === undefined || value === false || value === "") return "";
  const normalized = String(value).trim();
  if (!normalized || normalized.length > 128 || /[\r\n\0]/.test(normalized)) {
    throw new Error(`intent: --${name} must be a non-empty identifier of at most 128 characters`);
  }
  return normalized;
}

function optionalLeaseMinutes(value) {
  if (value === undefined || value === false || value === "") return 0;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
    throw new Error("intent: --lease-minutes must be an integer from 5 to 1440");
  }
  return minutes;
}

function required(value, name) {
  if (!value) throw new Error(`intent: --${name} is required`);
  return String(value);
}
