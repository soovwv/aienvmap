import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkpointWorkspace } from "../src/commands/checkpoint.js";

test("checkpoint records, syncs, writes status, and records handoff", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-checkpoint-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { express: "^4.18.0" } }), "utf8");

  const result = await checkpointWorkspace({
    dir,
    actor: "agent:codex",
    summary: "dependency-change",
    target: "dependency",
    quiet: true
  });

  assert.equal(result.status, "ok");
  assert.equal(result.actor, "agent:codex");
  assert.equal(result.target, "dependency");
  assert.match(result.outputs.status, /\.aienvmap[\\\/]status\.json$/);
  assert.equal(result.handoff.status, "review-required");
  assert.equal(result.agentActivity.environmentRecordCount, 0);
  assert.equal(result.followUps.length, 0);

  const status = JSON.parse(await fs.readFile(path.join(dir, ".aienvmap", "status.json"), "utf8"));
  assert.equal(status.quickstart.afterEnvironmentChange, "aienvmap checkpoint --actor agent:id --summary what-changed --target environment");
  assert.equal(status.dependencyChangeProtocol.commands.checkpointAfterChange, "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");

  const timeline = await fs.readFile(path.join(dir, ".aienvmap", "timeline.jsonl"), "utf8");
  assert.match(timeline, /agent-record/);
  assert.match(timeline, /checkpoint sync/);
  assert.match(timeline, /agent-handoff/);
});

test("checkpoint JSON prints one machine-readable object", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-checkpoint-json-"));
  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output += `${value}\n`; };
  try {
    await checkpointWorkspace({
      dir,
      actor: "agent:gemini",
      summary: "updated node",
      target: "node",
      json: true
    });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(output);
  assert.equal(json.status, "ok");
  assert.equal(json.actor, "agent:gemini");
  assert.equal(json.target, "node");
});
