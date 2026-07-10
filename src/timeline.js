import fs from "node:fs/promises";

export async function readTimeline(file) {
  return readJsonl(file);
}

export async function readJsonl(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function openIntents(events = []) {
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
  return [...byID.values()].filter((intent) => intent.status === "open");
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
