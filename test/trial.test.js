import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

test("trial creates a local human-review bundle without uploading or changing the environment", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-trial-"));
  try {
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "private-fixture", private: true }));
    const { stdout } = await run(process.execPath, [path.resolve("bin/aienvmap.js"), "trial", "--json", "--dir", dir], { cwd: path.resolve("."), timeout: 60_000 });
    const result = JSON.parse(stdout);
    assert.equal(result.schemaName, "aienvmap.trial-result");
    assert.equal(result.privacy.automaticUpload, false);
    assert.equal(result.safety.environmentChanged, false);
    assert.equal(result.marketEvidence, false);
    const draft = await fs.readFile(path.join(dir, ".aienvmap", "trial", "case-draft.md"), "utf8");
    const next = await fs.readFile(path.join(dir, ".aienvmap", "trial", "NEXT.md"), "utf8");
    assert.match(draft, /Human verification/);
    assert.doesNotMatch(draft, /private-fixture/);
    assert.doesNotMatch(draft, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(next, /no automatic upload/i);
    assert.match(next, /Do not paste `portable\.json` publicly/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("tester guides keep human consent and AI safety explicit", async () => {
  const testing = await fs.readFile(path.resolve("TESTING.md"), "utf8");
  const ai = await fs.readFile(path.resolve("AI_TESTING.md"), "utf8");
  for (const text of [testing, ai]) {
    assert.match(text, /0\.1\.1 trial/);
    assert.match(text, /no automatic upload/i);
    assert.match(text, /human/i);
  }
  assert.match(ai, /Do not invent positive feedback/);
  assert.match(ai, /Never submit a GitHub issue/);
  assert.match(ai, /Java discovery remains information-only/);
});
