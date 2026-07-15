import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendJsonLine, appendJsonLinesChecked, jsonlRevision, readJson, stripBom, writeJson } from "../src/fsutil.js";

test("readJson accepts UTF-8 BOM JSON files from Windows editors", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-json-"));
  const file = path.join(dir, "package.json");
  await fs.writeFile(file, "\uFEFF{\"dependencies\":{\"express\":\"^4.18.0\"}}", "utf8");

  const json = await readJson(file, {});

  assert.equal(json.dependencies.express, "^4.18.0");
});

test("stripBom leaves normal JSON unchanged", () => {
  assert.equal(stripBom("{\"ok\":true}"), "{\"ok\":true}");
});

test("writeJson replaces artifacts without leaving temporary files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-atomic-json-"));
  const file = path.join(dir, "state.json");
  await writeJson(file, { revision: 1 });
  await writeJson(file, { revision: 2 });
  assert.deepEqual(await readJson(file), { revision: 2 });
  assert.deepEqual(await fs.readdir(dir), ["state.json"]);
});

test("appendJsonLine serializes concurrent AI event writes", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-locked-jsonl-"));
  const file = path.join(dir, "timeline.jsonl");
  await Promise.all(Array.from({ length: 20 }, (_, id) => appendJsonLine(file, { id })));
  const lines = (await fs.readFile(file, "utf8")).trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(lines.length, 20);
  assert.deepEqual(lines.map((item) => item.id).sort((a, b) => a - b), Array.from({ length: 20 }, (_, id) => id));
  assert.deepEqual(await fs.readdir(dir), ["timeline.jsonl"]);
});

test("checked JSONL append rejects a stale AI coordination revision", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cas-jsonl-"));
  const file = path.join(dir, "intents.jsonl");
  const initial = await jsonlRevision(file);
  const first = await appendJsonLinesChecked(file, [{ id: 1 }], initial);
  assert.notEqual(first.revision, initial);
  await assert.rejects(
    appendJsonLinesChecked(file, [{ id: 2 }], initial),
    (error) => error.code === "AIENVMAP_REVISION_CONFLICT" && error.currentRevision === first.revision
  );
  const lines = (await fs.readFile(file, "utf8")).trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(lines, [{ id: 1 }]);
});

test("checked JSONL append commits multiple resolution events as one revision", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cas-batch-"));
  const file = path.join(dir, "intents.jsonl");
  const before = await jsonlRevision(file);
  const result = await appendJsonLinesChecked(file, [{ ref: "one" }, { ref: "two" }], before);
  assert.equal(await jsonlRevision(file), result.revision);
  assert.equal((await fs.readFile(file, "utf8")).trim().split(/\r?\n/).length, 2);
});
