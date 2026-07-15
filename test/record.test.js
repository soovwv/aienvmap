import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { followUpForRecord, recordWorkspace } from "../src/commands/record.js";

test("followUpForRecord recommends refresh and handoff for dependency records", () => {
  const followUp = followUpForRecord({
    target: "dependency",
    summary: "dependency-change"
  });

  assert.equal(followUp.required, true);
  assert.equal(followUp.target, "dependency");
  assert.deepEqual(followUp.commands, [
    "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
    "aienvmap sync",
    "aienvmap status --write",
    "aienvmap handoff --record --actor agent:id"
  ]);
});

test("followUpForRecord stays quiet for non-environment notes", () => {
  const followUp = followUpForRecord({
    target: "docs",
    summary: "updated README wording"
  });

  assert.equal(followUp.required, false);
  assert.deepEqual(followUp.commands, []);
});

test("recordWorkspace stores follow-up metadata in timeline", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-record-followup-"));
  const originalLog = console.log;
  console.log = () => {};
  try {
    await recordWorkspace({
      dir,
      actor: "agent:codex",
      summary: "dependency-change",
      target: "dependency"
    });
  } finally {
    console.log = originalLog;
  }

  const raw = await fs.readFile(path.join(dir, ".aienvmap", "timeline.jsonl"), "utf8");
  const entry = JSON.parse(raw.trim());
  assert.equal(entry.followUp.required, true);
  assert.equal(entry.followUp.target, "dependency");
  assert.equal(entry.followUp.commands[0], "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency");
});
