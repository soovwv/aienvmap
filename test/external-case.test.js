import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("external case intake requires portable evidence, human verification, and privacy review", async () => {
  const template = await fs.readFile(path.resolve(".github/ISSUE_TEMPLATE/environment_case.md"), "utf8");
  for (const required of ["--case-summary", "omits versions", "Human verification", "False positive", "not a repository fixture", "did not paste raw reconcile", "linkable pseudonymous", "authorize maintainers"]) assert.match(template, new RegExp(required, "i"));
  assert.match(template, /Did aienvmap itself change or remove software\? \(expected: no\)/);
});

test("portable case guide separates evidence maturity from feature count", async () => {
  const guide = await fs.readFile(path.resolve("examples/portable-environment-case-guide.md"), "utf8");
  for (const level of ["submitted", "reproducible", "outcome-verified", "longitudinal"]) assert.match(guide, new RegExp(level));
  assert.match(guide, /not telemetry/);
  assert.match(guide, /never submit the raw/i);
  assert.match(guide, /feature count are not independent market evidence/i);
  assert.match(guide, /never count one case twice/i);
  assert.match(guide, /--case-summary/);
  assert.match(guide, /never market evidence by itself/i);
});
