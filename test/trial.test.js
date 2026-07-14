import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

test("trial completes a local technical test without uploading or changing the environment", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-trial-"));
  try {
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "private-fixture", private: true }));
    const wrapperSideEffect = path.join(dir, "wrapper-invoked.txt");
    const wrapper = process.platform === "win32" ? "mvnw.cmd" : "mvnw";
    const wrapperBody = process.platform === "win32"
      ? `@echo off\r\necho invoked> "${wrapperSideEffect}"\r\necho Apache Maven 3.9.9\r\n`
      : `#!/bin/sh\nprintf invoked > "${wrapperSideEffect}"\nprintf 'Apache Maven 3.9.9\\n'\n`;
    await fs.writeFile(path.join(dir, wrapper), wrapperBody);
    if (process.platform !== "win32") await fs.chmod(path.join(dir, wrapper), 0o755);
    await fs.mkdir(path.join(dir, ".aienvmap"));
    const manifestSentinel = "existing manifest must remain unchanged\n";
    const timelineSentinel = "existing timeline must remain unchanged\n";
    await fs.writeFile(path.join(dir, ".aienvmap", "manifest.json"), manifestSentinel);
    await fs.writeFile(path.join(dir, ".aienvmap", "timeline.jsonl"), timelineSentinel);
    const { stdout } = await run(process.execPath, [path.resolve("bin/aienvmap.js"), "trial", "--json", "--dir", dir], { cwd: path.resolve("."), timeout: 60_000 });
    const result = JSON.parse(stdout);
    assert.equal(result.schemaName, "aienvmap.trial-result");
    assert.equal(result.status, "technical-test-complete");
    assert.equal(result.privacy.automaticUpload, false);
    assert.equal(result.privacy.technicalResultReviewRequired, false);
    assert.equal(result.privacy.publicSubmissionReviewRequired, true);
    assert.equal(result.safety.environmentMutationRequested, false);
    assert.equal(result.safety.softwareRemovalRequested, false);
    assert.equal(result.safety.pathModificationRequested, false);
    assert.equal(result.safety.aienvmapMutationPerformed, false);
    assert.equal(result.safety.projectWrappersExecuted, false);
    assert.equal(result.safety.runtimeVersionProbesExecuted, true);
    assert.equal(result.safety.thirdPartyProbeSideEffectsGuaranteedAbsent, false);
    assert.equal(result.marketEvidence, false);
    assert.deepEqual(result.artifacts, [".aienvmap/trial/portable.json", ".aienvmap/trial/case-summary.json", ".aienvmap/trial/case-draft.md", ".aienvmap/trial/NEXT.md"]);
    assert.equal(await fs.stat(path.join(dir, "AIENV.md")).then(() => true, () => false), false);
    assert.equal(await fs.stat(wrapperSideEffect).then(() => true, () => false), false);
    assert.equal(await fs.readFile(path.join(dir, ".aienvmap", "manifest.json"), "utf8"), manifestSentinel);
    assert.equal(await fs.readFile(path.join(dir, ".aienvmap", "timeline.jsonl"), "utf8"), timelineSentinel);
    assert.deepEqual((await fs.readdir(path.join(dir, ".aienvmap"))).sort(), ["manifest.json", "timeline.jsonl", "trial"]);
    const draft = await fs.readFile(path.join(dir, ".aienvmap", "trial", "case-draft.md"), "utf8");
    const next = await fs.readFile(path.join(dir, ".aienvmap", "trial", "NEXT.md"), "utf8");
    assert.match(draft, /Human verification/);
    assert.match(draft, /Generated technical result/);
    assert.match(draft, /One-line confirmation/);
    assert.match(draft, /Silence is not consent/);
    assert.doesNotMatch(draft, /private-fixture/);
    assert.doesNotMatch(draft, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(next, /no automatic upload/i);
    assert.match(next, /may cache the aienvmap package/i);
    assert.match(next, /cannot guarantee that arbitrary third-party executables have no side effects/i);
    assert.match(next, /Do not paste `portable\.json` publicly/);
    assert.match(next, /Technical test: no opinion required/);
    assert.match(next, /real=yes\|partly\|no/);
    assert.match(next, /separately for explicit public submission approval/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("tester guides keep human consent and AI safety explicit", async () => {
  const testing = await fs.readFile(path.resolve("TESTING.md"), "utf8");
  const ai = await fs.readFile(path.resolve("AI_TESTING.md"), "utf8");
  const invite = await fs.readFile(path.resolve("TESTER_INVITE.md"), "utf8");
  const release = await fs.readFile(path.resolve("RELEASE_NOTES_0.1.1.md"), "utf8");
  const currentRelease = await fs.readFile(path.resolve("RELEASE_NOTES_0.2.0.md"), "utf8");
  const readme = await fs.readFile(path.resolve("README.md"), "utf8");
  for (const text of [testing, ai]) {
    assert.match(text, /0\.2\.0 trial/);
    assert.match(text, /no automatic upload/i);
    assert.match(text, /human/i);
  }
  assert.match(ai, /Do not invent positive feedback/);
  assert.match(ai, /Never submit a GitHub issue/);
  assert.match(ai, /Treat the technical test as complete without requesting a review/);
  assert.match(ai, /Never interpret silence/);
  assert.match(ai, /Java discovery remains information-only/);
  assert.match(ai, /Version 0\.1\.1 is a legacy trial/);
  assert.doesNotMatch(ai, /aienvmap@0\.1\.1 schema --json/);
  assert.match(ai, /Read and obey that exact version's `schema --json` `outputs\.trial` contract/);
  assert.match(ai, /writes trial artifacts only under `.aienvmap\/trial\/`/);
  assert.match(testing, /Version 0\.2\.0 isolates generated files under `.aienvmap\/trial\/`/i);
  assert.match(testing, /disposable directory or disposable project copy/);
  assert.match(testing, /do not need to write a review or answer a questionnaire/i);
  assert.match(invite, /Do not request positive reviews/);
  assert.match(invite, /npx aienvmap@0\.2\.0 trial/);
  assert.match(invite, /disposable directory or disposable project copy/);
  assert.match(invite, /skips project Maven\/Gradle wrappers/);
  assert.match(invite, /side-effect-free behavior cannot be guaranteed/);
  assert.match(release, /signed npm provenance/);
  assert.match(release, /```bash\s+npx aienvmap@0\.1\.1 trial\s+```/);
  assert.match(release, /Run it in a disposable directory or disposable project copy/);
  assert.match(currentRelease, /npx aienvmap@0\.2\.0 trial/);
  assert.match(currentRelease, /arbitrary third-party executable side effects cannot be guaranteed absent/);
  assert.match(readme, /Run `npx aienvmap@0\.2\.0 trial` in a disposable directory or disposable project copy/);
  assert.match(readme, /Trial artifacts are isolated under `.aienvmap\/trial\/`/);
});
