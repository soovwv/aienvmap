import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { appendJsonLine, appendJsonLinesChecked, assertWritePathInsideWorkspace, jsonlRevision, readJson, readJsonStrict, stripBom, writeJson } from "../src/fsutil.js";

const casWriter = fileURLToPath(new URL("../test-support/cas-writer.mjs", import.meta.url));

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

test("readJsonStrict distinguishes missing state from malformed state", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-json-strict-"));
  const file = path.join(dir, "state.json");
  assert.equal(await readJsonStrict(file, null), null);
  await fs.writeFile(file, "{private-value", "utf8");
  await assert.rejects(readJsonStrict(file), (error) => {
    assert.equal(error.code, "AIENVMAP_INVALID_JSON");
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
});

test("writeJson replaces artifacts without leaving temporary files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-atomic-json-"));
  const file = path.join(dir, "state.json");
  await writeJson(file, { revision: 1 });
  await writeJson(file, { revision: 2 });
  assert.deepEqual(await readJson(file), { revision: 2 });
  assert.deepEqual(await fs.readdir(dir), ["state.json"]);
});

test("workspace writes reject state and instruction directories redirected by symbolic links", async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-boundary-workspace-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-boundary-outside-"));
  const state = path.join(workspace, ".aienvmap");
  try {
    await fs.symlink(outside, state, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error?.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  await assert.rejects(
    writeJson(path.join(state, "status.json"), { unsafe: true }),
    (error) => error.code === "AIENVMAP_WRITE_OUTSIDE_WORKSPACE"
  );
  await assert.rejects(fs.access(path.join(outside, "status.json")));

  const redirected = path.join(workspace, ".cursor");
  await fs.symlink(outside, redirected, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(
    assertWritePathInsideWorkspace(workspace, path.join(redirected, "rules", "environment.md")),
    (error) => error.code === "AIENVMAP_WRITE_OUTSIDE_WORKSPACE"
  );
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

test("checked JSONL append allows only one independent process to commit a shared revision", { timeout: 15_000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cas-process-"));
  const file = path.join(dir, "intents.jsonl");
  const gate = path.join(dir, "go");
  const expected = await jsonlRevision(file);
  const first = spawnWriter(file, expected, "first", path.join(dir, "first.ready"), gate);
  const second = spawnWriter(file, expected, "second", path.join(dir, "second.ready"), gate);

  try {
    await Promise.all([
      waitForPath(path.join(dir, "first.ready")),
      waitForPath(path.join(dir, "second.ready"))
    ]);
    await fs.writeFile(gate, "go\n", "utf8");
    const results = await Promise.all([first.result, second.result]);
    const committed = results.filter((item) => item.output.status === "committed");
    const rejected = results.filter((item) => item.output.status === "rejected");

    assert.equal(committed.length, 1);
    assert.equal(committed[0].code, 0);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].code, 2);
    assert.equal(rejected[0].output.code, "AIENVMAP_REVISION_CONFLICT");
    assert.equal(rejected[0].output.currentRevision, committed[0].output.revision);
    const lines = (await fs.readFile(file, "utf8")).trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(lines.length, 1);
    assert.ok(["first", "second"].includes(lines[0].id));
    await assert.rejects(fs.access(`${file}.lock`));
  } finally {
    first.child.kill();
    second.child.kill();
  }
});

test("JSONL append recovers an abandoned stale lock", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-stale-lock-"));
  const file = path.join(dir, "timeline.jsonl");
  const lock = `${file}.lock`;
  await fs.writeFile(lock, JSON.stringify({ pid: 999999, at: "stale" }), "utf8");
  const stale = new Date(Date.now() - 20_000);
  await fs.utimes(lock, stale, stale);

  await appendJsonLine(file, { id: "recovered" });

  assert.deepEqual((await fs.readFile(file, "utf8")).trim().split(/\r?\n/).map(JSON.parse), [{ id: "recovered" }]);
  await assert.rejects(fs.access(lock));
});

function spawnWriter(file, revision, id, ready, gate) {
  const child = spawn(process.execPath, [casWriter, file, revision, id, ready, gate], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const result = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      try {
        resolve({ code, output: JSON.parse(stdout.trim()), stderr });
      } catch (error) {
        reject(new Error(`CAS writer ${id} returned invalid output: ${stdout || stderr}`, { cause: error }));
      }
    });
  });
  return { child, result };
}

async function waitForPath(file, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(file);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`timed out waiting for ${file}`);
}
