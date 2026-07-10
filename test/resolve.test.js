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
});

async function recordIntentQuietly(args) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    await intentWorkspace(args);
  } finally {
    console.log = originalLog;
  }
}
