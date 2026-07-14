import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("manual release workflow is provenance-enabled and fail-closed", async () => {
  const workflow = await fs.readFile(path.resolve(".github/workflows/release.yml"), "utf8");
  for (const signal of [
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "npm install --global npm@11.11.0",
    "trusted publishing requires Node 22.14.0 or later",
    "trusted publishing requires npm 11.5.1 or later",
    "package-manager-cache: false",
    "id-token: write",
    "group: npm-release",
    "cancel-in-progress: false",
    "timeout-minutes: 20",
    "refs/heads/main",
    "git rev-parse origin/main",
    "v$EXPECTED_VERSION",
    "is already published",
    "npm run release:check",
    "npm publish --access public",
    "--provenance",
    "dist.integrity",
    "Published registry metadata did not verify"
  ]) assert.match(workflow, new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workflow, /Prerelease versions must not use the latest dist-tag/);
  assert.match(workflow, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  assert.match(workflow, /authentication:/);
  assert.match(workflow, /default: "trusted-publisher"/);
  assert.match(workflow, /authentication == 'trusted-publisher'/);
  assert.match(workflow, /authentication == 'token-fallback'/);
  const trustedStep = workflow.slice(workflow.indexOf("Publish to npm with trusted publisher"), workflow.indexOf("Publish to npm with explicit token fallback"));
  assert.doesNotMatch(trustedStep, /NODE_AUTH_TOKEN/);
});

test("CI uses Node 24 based actions without implicit package-manager caching", async () => {
  const workflow = await fs.readFile(path.resolve(".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /package-manager-cache: false/);
  assert.match(workflow, /Installed package smoke/);
  assert.match(workflow, /npm run pack:install-check/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v4/);
});

test("release workflow remains explicit and manually confirmed", async () => {
  const workflow = await fs.readFile(path.resolve(".github/workflows/release.yml"), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_publish:/);
  assert.match(workflow, /github\.event\.inputs\.confirm_publish == 'publish'/);
  assert.match(workflow, /type: choice\s+options:\s+- trusted-publisher\s+- token-fallback/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:\s*\n\s*tags:/);
});

test("pull-request CI enforces the English UTF-8 text policy", async () => {
  const workflow = await fs.readFile(path.resolve(".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /English text and UTF-8 policy/);
  assert.match(workflow, /npm run text:check/);
});
