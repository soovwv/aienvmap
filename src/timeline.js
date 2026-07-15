import fs from "node:fs/promises";
import path from "node:path";

export async function readTimeline(file) {
  return readJsonl(file);
}

export async function readJsonl(file) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const events = [];
  for (const [index, source] of raw.split(/\r?\n/).entries()) {
    const line = index === 0 ? source.replace(/^\uFEFF/, "").trim() : source.trim();
    if (!line) continue;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("coordination event must be an object");
      events.push(event);
    } catch (cause) {
      const error = new Error(`${path.basename(file)} contains invalid JSON on line ${index + 1}; repair or restore the coordination artifact before continuing`);
      error.code = "AIENVMAP_INVALID_JSONL";
      error.file = file;
      error.line = index + 1;
      error.cause = cause;
      throw error;
    }
  }
  return events;
}

export function openIntents(events = [], now = new Date()) {
  const byID = new Map();
  for (const event of events) {
    if (event.type === "intent-resolved") {
      const key = event.ref || event.id;
      if (key && byID.has(key)) {
        const current = byID.get(key);
        current.status = event.status || "resolved";
        current.resolvedAt = event.at;
        current.resolvedBy = event.actor;
        current.resolution = event.reason || "";
      }
      continue;
    }
    if (event.type === "intent" || !event.type) {
      const id = event.id || intentID(event);
      byID.set(id, { ...event, id, type: "intent", status: event.status || "open" });
    }
  }
  return [...byID.values()]
    .filter((intent) => intent.status === "open")
    .map((intent) => ({ ...intent, lease: intentLeaseState(intent, now) }));
}

export function intentLeaseState(intent = {}, now = new Date()) {
  if (!intent.leaseExpiresAt) {
    return { state: "unscoped", expiresAt: null, removalAuthorized: false, rule: "No lease was declared; age-based stale review still applies." };
  }
  const expiresAt = new Date(intent.leaseExpiresAt).getTime();
  const current = new Date(now).getTime();
  const valid = Number.isFinite(expiresAt) && Number.isFinite(current);
  return {
    state: !valid ? "invalid" : expiresAt <= current ? "expired" : "active",
    expiresAt: intent.leaseExpiresAt,
    removalAuthorized: false,
    rule: "Lease state is advisory evidence; expiry never resolves, deletes, or transfers an intent automatically."
  };
}

export function intentID(intent) {
  return `${intent.at || ""}:${intent.actor || ""}:${intent.action || ""}:${intent.target || ""}`;
}

export function newIntentID(now = new Date()) {
  const time = now.getTime().toString(36);
  const entropy = Math.random().toString(36).slice(2, 8);
  return `int_${time}_${entropy}`;
}

export function pendingFollowUps(timeline = []) {
  const lastSync = [...timeline].reverse().find((item) => item.type === "sync" || item.type === "detected-change");
  const lastHandoff = [...timeline].reverse().find((item) => item.type === "agent-handoff");
  const lastSyncAt = lastSync ? new Date(lastSync.at).getTime() : 0;
  const lastHandoffAt = lastHandoff ? new Date(lastHandoff.at).getTime() : 0;
  return timeline
    .filter((item) => item.followUp?.required)
    .filter((item) => {
      const at = new Date(item.at).getTime();
      return at > lastSyncAt || at > lastHandoffAt;
    })
    .slice(-5)
    .reverse()
    .map((item) => ({
      at: item.at,
      actor: item.actor || "unknown",
      target: item.followUp.target || item.target || "environment",
      summary: item.summary || item.type || "environment record",
      reason: item.followUp.reason || "Follow-up is required.",
      commands: item.followUp.commands || []
    }));
}
