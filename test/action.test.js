import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("GitHub Action writes compact status artifacts by default", async () => {
  const action = await fs.readFile("action.yml", "utf8");
  const example = await fs.readFile("examples/github-action.yml", "utf8");

  assert.match(action, /write-status:/);
  assert.match(action, /write-schema:/);
  assert.match(action, /write-doctor-json:/);
  assert.match(action, /write-sbom:/);
  assert.match(action, /write-summary:/);
  assert.match(action, /reconcile-check:/);
  assert.match(action, /default: "off"/);
  assert.match(action, /reconcile .*--baseline .*--check --json/);
  assert.match(action, /status --dir/);
  assert.match(action, /--write --quiet/);
  assert.match(action, /sbom --dir.*--write --quiet/);
  assert.match(action, /--format cyclonedx-lite --write --quiet/);
  assert.match(action, /summary --dir.*--write --quiet/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /aienvmap environment preflight/);
  assert.match(action, /detected: runtimes/);
  assert.match(action, /review: warnings/);
  assert.match(action, /dependency risk/);
  assert.doesNotMatch(action, /Append strict plan summary/);
  assert.doesNotMatch(action, /Append follow-up plan summary/);
  assert.doesNotMatch(action, /Append AI loop summary/);
  assert.match(action, /schema --json >.*schema\.json/);
  assert.match(action, /doctor --dir.*--json >.*doctor\.json/);
  assert.match(example, /\.aienvmap\/status\.json/);
  assert.match(example, /\.aienvmap\/summary\.md/);
  assert.match(example, /\.aienvmap\/sbom\.json/);
  assert.match(example, /\.aienvmap\/sbom\.cdx\.json/);
  assert.match(example, /\.aienvmap\/schema\.json/);
  assert.match(example, /\.aienvmap\/doctor\.json/);
  assert.match(example, /compact environment preflight/);
});
