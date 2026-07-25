import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "./temp-cleanup.js";
import { scanWorkspace } from "../src/commands/scan.js";

test("scan JSON emits exactly one machine-readable result", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-scan-json-"));
  const originalLog = console.log;
  const output = [];
  console.log = (value) => output.push(value);
  try {
    const result = await scanWorkspace({ dir, json: true });
    assert.equal(result.dir, dir);
  } finally {
    console.log = originalLog;
  }
  assert.equal(output.length, 1);
  const parsed = JSON.parse(output[0]);
  assert.equal(parsed.dir, dir);
  assert.equal(typeof parsed.changes, "number");
  assert.match(parsed.manifest, /manifest\.json$/);
});
