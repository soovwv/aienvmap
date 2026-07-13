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
    await fs.mkdir(path.join(dir, ".aienvmap"));
    const manifestSentinel = "existing manifest must remain unchanged\n";
    const timelineSentinel = "existing timeline must remain unchanged\n";
    await fs.writeFile(path.join(dir, ".aienvmap", "manifest.json"), manifestSentinel);
    await fs.writeFile(path.join(dir, ".aienvmap", "timeline.jsonl"), timelineSentinel);
    const { stdout } = await run(process.execPath, [path.resolve("bin/aienvmap.js"), "trial", "--json", "--dir", dir], { cwd: path.resolve("."), timeout: 60_000 });
    const result = JSON.parse(stdout);
    assert.equal(result.schemaName, "aienvmap.trial-result");
    assert.equal(result.privacy.automaticUpload, false);
    assert.equal(result.safety.environmentChanged, false);
    assert.equal(result.marketEvidence, false);
    assert.deepEqual(result.artifacts, [".aienvmap/trial/portable.json", ".aienvmap/trial/case-summary.json", ".aienvmap/trial/case-draft.md", ".aienvmap/trial/NEXT.md"]);
    assert.equal(await fs.stat(path.join(dir, "AIENV.md")).then(() => true, () => false), false);
    assert.equal(await fs.readFile(path.join(dir, ".aienvmap", "manifest.json"), "utf8"), manifestSentinel);
    assert.equal(await fs.readFile(path.join(dir, ".aienvmap", "timeline.jsonl"), "utf8"), timelineSentinel);
    assert.deepEqual((await fs.readdir(path.join(dir, ".aienvmap"))).sort(), ["manifest.json", "timeline.jsonl", "trial"]);
    const draft = await fs.readFile(path.join(dir, ".aienvmap", "trial", "case-draft.md"), "utf8");
    const next = await fs.readFile(path.join(dir, ".aienvmap", "trial", "NEXT.md"), "utf8");
    assert.match(draft, /Human verification/);
    assert.doesNotMatch(draft, /private-fixture/);
    assert.doesNotMatch(draft, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(next, /no automatic upload/i);
    assert.match(next, /may cache the aienvmap package/i);
    assert.match(next, /Do not paste `portable\.json` publicly/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("tester guides keep human consent and AI safety explicit", async () => {
  const testing = await fs.readFile(path.resolve("TESTING.md"), "utf8");
  const ai = await fs.readFile(path.resolve("AI_TESTING.md"), "utf8");
  const invite = await fs.readFile(path.resolve("TESTER_INVITE.md"), "utf8");
  const release = await fs.readFile(path.resolve("RELEASE_NOTES_0.1.1.md"), "utf8");
  const readme = await fs.readFile(path.resolve("README.md"), "utf8");
  for (const text of [testing, ai]) {
    assert.match(text, /0\.1\.1 trial/);
    assert.match(text, /no automatic upload/i);
    assert.match(text, /human/i);
  }
  assert.match(ai, /Do not invent positive feedback/);
  assert.match(ai, /Never submit a GitHub issue/);
  assert.match(ai, /Java discovery remains information-only/);
  assert.match(ai, /published 0\.1\.1 release/);
  assert.doesNotMatch(ai, /aienvmap@0\.1\.1 schema --json/);
  assert.match(ai, /read and obey `outputs\.trial\.writeScope` only if/);
  assert.match(ai, /published 0\.1\.1 trial writes under `.aienvmap`/);
  assert.match(testing, /published 0\.1\.1 trial writes only under `.aienvmap`/i);
  assert.match(testing, /Run 0\.1\.1 in a disposable directory/);
  assert.match(testing, /Current unreleased code isolates generated trial files under `.aienvmap\/trial\/`/);
  assert.match(invite, /Do not request positive reviews/);
  assert.match(invite, /npx aienvmap@0\.1\.1 trial/);
  assert.match(invite, /disposable directory or disposable project copy/);
  assert.match(invite, /may refresh existing `.aienvmap` manifest and timeline state/);
  assert.match(release, /signed npm provenance/);
  assert.match(release, /```bash\s+npx aienvmap@0\.1\.1 trial\s+```/);
  assert.match(release, /Run it in a disposable directory or disposable project copy/);
  assert.match(readme, /Run `npx aienvmap@0\.1\.1 trial` only in a disposable directory or disposable project copy/);
  assert.match(readme, /Current unreleased code isolates trial writes to `.aienvmap\/trial\/`/);
});
