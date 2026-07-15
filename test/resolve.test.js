import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { intentWorkspace } from "../src/commands/intent.js";
import { resolveWorkspace } from "../src/commands/resolve.js";
import { intentsPath } from "../src/paths.js";
import { openIntents, readJsonl } from "../src/timeline.js";

test("resolveWorkspace resolves all open intents for a target", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-resolve-target-"));
  await recordIntentQuietly({ dir, actor: "agent:codex", action: "update dependency", target: "dependency" });
  await recordIntentQuietly({ dir, actor: "agent:claude", action: "fix vulnerable package", target: "dependency" });
  await recordIntentQuietly({ dir, actor: "agent:gemini", action: "update node", target: "node" });

  const result = await resolveWorkspace({ dir, actor: "human:owner", target: "dependency", status: "resolved", quiet: true });
  const open = openIntents(await readJsonl(intentsPath(dir)));

  assert.equal(result.count, 2);
  assert.deepEqual(open.map((intent) => intent.target), ["node"]);
});

test("resolveWorkspace resolves all open intents", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-resolve-all-"));
  await recordIntentQuietly({ dir, actor: "agent:codex", action: "update dependency", target: "dependency" });
  await recordIntentQuietly({ dir, actor: "agent:claude", action: "update node", target: "node" });

  const result = await resolveWorkspace({ dir, actor: "human:owner", all: true, quiet: true });
  const open = openIntents(await readJsonl(intentsPath(dir)));

  assert.equal(result.count, 2);
  assert.deepEqual(open, []);
});

test("resolveWorkspace prints JSON output for AI consumers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-resolve-json-"));
  await recordIntentQuietly({ dir, actor: "agent:codex", action: "update dependency", target: "dependency" });

  const originalLog = console.log;
  const lines = [];
  console.log = (value) => { lines.push(value); };
  try {
    await resolveWorkspace({ dir, actor: "human:owner", target: "dependency", json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(lines.at(-1));
  assert.equal(json.status, "resolved");
  assert.equal(json.count, 1);
  assert.equal(json.actor, "human:owner");
  assert.equal(json.refs.length, 1);
  assert.match(json.coordinationRevision, /^ir1:[a-f0-9]{16}$/);
});

test("intent and resolve support compare-and-swap for multiple AIs", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-resolve-cas-"));
  const first = await recordIntentQuietly({ dir, actor: "agent:codex", action: "update dependency", target: "dependency" });
  const staleRevision = first.previousRevision;
  await assert.rejects(
    recordIntentQuietly({ dir, actor: "agent:gemini", action: "update node", target: "node", if_revision: staleRevision }),
    (error) => error.code === "AIENVMAP_REVISION_CONFLICT"
  );
  const result = await resolveWorkspace({
    dir,
    actor: "human:owner",
    target: "dependency",
    if_revision: first.coordinationRevision,
    quiet: true
  });
  assert.equal(result.previousRevision, first.coordinationRevision);
  assert.notEqual(result.coordinationRevision, first.coordinationRevision);
});

test("intent records bounded advisory session lease evidence", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-intent-lease-"));
  const result = await recordIntentQuietly({
    dir,
    actor: "agent:codex",
    session: "thread:abc123",
    action: "update node",
    target: "node",
    lease_minutes: "30"
  });
  assert.equal(result.session, "thread:abc123");
  assert.equal(result.leaseMinutes, 30);
  assert.equal(new Date(result.leaseExpiresAt).getTime() - new Date(result.at).getTime(), 30 * 60_000);
  const [open] = openIntents(await readJsonl(intentsPath(dir)), new Date(result.at));
  assert.equal(open.lease.state, "active");
  assert.equal(open.lease.removalAuthorized, false);
});

test("intent rejects unsafe session and lease values", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-intent-invalid-"));
  await assert.rejects(
    recordIntentQuietly({ dir, actor: "agent:codex", session: "bad\nsession", action: "update node" }),
    /--session/
  );
  await assert.rejects(
    recordIntentQuietly({ dir, actor: "agent:codex", action: "update node", lease_minutes: "2" }),
    /--lease-minutes/
  );
});

async function recordIntentQuietly(args) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await intentWorkspace({ ...args, quiet: true });
  } finally {
    console.log = originalLog;
  }
}
