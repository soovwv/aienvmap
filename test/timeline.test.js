import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJsonl } from "../src/timeline.js";

test("readJsonl treats only a missing coordination artifact as empty", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-jsonl-missing-"));
  assert.deepEqual(await readJsonl(path.join(dir, "intents.jsonl")), []);
});

test("readJsonl accepts a BOM and blank lines without dropping valid events", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-jsonl-valid-"));
  const file = path.join(dir, "timeline.jsonl");
  await fs.writeFile(file, `\uFEFF{"id":1}\n  \n{"id":2}\n`, "utf8");
  assert.deepEqual(await readJsonl(file), [{ id: 1 }, { id: 2 }]);
});

test("readJsonl fails closed on a malformed coordination event without exposing its content", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-jsonl-invalid-"));
  const file = path.join(dir, "intents.jsonl");
  await fs.writeFile(file, `{"id":"valid"}\n{"secret":"private-value"\n`, "utf8");
  await assert.rejects(readJsonl(file), (error) => {
    assert.equal(error.code, "AIENVMAP_INVALID_JSONL");
    assert.equal(error.line, 2);
    assert.match(error.message, /intents\.jsonl contains invalid JSON on line 2/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
});

test("readJsonl rejects valid JSON that is not a coordination object", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-jsonl-shape-"));
  const file = path.join(dir, "intents.jsonl");
  await fs.writeFile(file, `{"id":"valid"}\nnull\n`, "utf8");
  await assert.rejects(readJsonl(file), (error) => error.code === "AIENVMAP_INVALID_JSONL" && error.line === 2);
});
