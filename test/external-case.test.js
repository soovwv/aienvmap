import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("external case intake requires portable evidence, human verification, and privacy review", async () => {
  const template = await fs.readFile(path.resolve(".github/ISSUE_TEMPLATE/environment_case.md"), "utf8");
  for (const required of ["--case-summary", "omits versions", "Human verification", "False positive", "not a repository fixture", "did not paste raw reconcile", "linkable pseudonymous", "authorize maintainers"]) assert.match(template, new RegExp(required, "i"));
  assert.match(template, /Did aienvmap itself change or remove software\? \(expected: no\)/);
  assert.match(template, /--markdown/);
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
  assert.match(guide, /does not create an issue, upload evidence, write a file/i);
});

test("maintainer case review prevents double counting and weak outcome claims", async () => {
  const review = await fs.readFile(path.resolve("CASE_REVIEW.md"), "utf8");
  for (const required of ["submitted", "reproducible", "outcome-verified", "longitudinal", "Never count", "raw `portable.json`", "no-change decision", "Never request a positive review"]) assert.match(review, new RegExp(required, "i"));
  assert.match(review, /downloads, stars, repository fixtures/);
  assert.match(review, /Count one external environment once at its highest verified maturity/);
  assert.match(review, /exactly one evidence-maturity label/i);
  assert.match(review, /label handling must never block evidence submission/i);
});

test("environment case intake applies submitted without requiring tester label access", async () => {
  const template = await fs.readFile(path.resolve(".github/ISSUE_TEMPLATE/environment_case.md"), "utf8");
  const aiTesting = await fs.readFile(path.resolve("AI_TESTING.md"), "utf8");
  assert.match(template, /^labels: evidence, environment-case, submitted$/m);
  assert.match(template, /Do not select or pass labels/);
  assert.match(aiTesting, /do not pass label arguments/i);
  assert.match(aiTesting, /retry without label arguments/i);
});
