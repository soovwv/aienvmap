import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("CLI context reads a workspace passed with --dir", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cli-dir-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await fs.writeFile(path.join(dir, ".aienvmap", "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false, summary: { total: 0 } }
  }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "context",
    "--json",
    "--dir",
    dir
  ], { cwd: path.resolve(".") });

  const json = JSON.parse(stdout);
  assert.equal(json.workspace.path, dir);
  assert.equal(json.status, "clear");
});

test("CLI context accepts --dir before the command", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cli-global-dir-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await fs.writeFile(path.join(dir, ".aienvmap", "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {},
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false, summary: { total: 0 } }
  }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "--dir",
    dir,
    "context",
    "--json"
  ], { cwd: path.resolve(".") });

  const json = JSON.parse(stdout);
  assert.equal(json.workspace.path, dir);
  assert.equal(json.status, "clear");
});

test("CLI schema prints the AI-readable output contract without a workspace", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "schema",
    "--json"
  ], { cwd: path.resolve(".") });

  const json = JSON.parse(stdout);
  assert.equal(json.name, "aienvmap-contract");
  assert.equal(json.contractVersion, "0.2");
  assert.equal(json.stableFrom, "0.2.0");
  assert.equal(json.outputs.status.contract.name, "aienvmap-preflight");
});

test("CLI scorecard keeps technical and market evidence separate", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "scorecard",
    "--json"
  ], { cwd: path.resolve(".") });

  const json = JSON.parse(stdout);
  assert.equal(json.schemaName, "aienvmap-product-scorecard");
  assert.ok(json.technicalReadiness.score > json.marketValidation.score);
  assert.ok(json.marketReadiness.score > json.marketValidation.score);
  assert.equal(json.releaseAssessment.qualified, true);
  assert.equal(json.releaseAssessment.publishReady, false);
  assert.match(json.rule, /not use overall score alone/);
});

test("package, README, and CLI help share the accurate environment-before-change positioning", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));
  const readme = await fs.readFile(path.resolve("README.md"), "utf8");
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "--help"
  ], { cwd: path.resolve(".") });
  const readmeTop = readme.replace(/\r\n/g, "\n").slice(0, 2800);

  assert.match(pkg.description, /Dependency-free environment map/);
  assert.match(pkg.description, /explicit change handoff/);
  assert.ok(pkg.keywords.includes("ai-workspace"));
  assert.ok(pkg.keywords.includes("ai-agents"));
  assert.ok(pkg.keywords.includes("ai-coding"));
  assert.ok(pkg.keywords.includes("coordination"));
  assert.ok(pkg.keywords.includes("workspace-coordination"));
  assert.ok(pkg.keywords.includes("multi-agent"));
  assert.ok(pkg.keywords.includes("shared-environment"));
  assert.ok(pkg.keywords.includes("environment-map"));
  assert.ok(pkg.keywords.includes("version-drift"));
  assert.ok(pkg.keywords.includes("light-sbom"));
  assert.ok(pkg.keywords.includes("dependency-coordination"));
  assert.match(readmeTop, /Know the development environment before an AI changes it/);
  assert.match(readmeTop, /environment map and explicit change handoff/);
  assert.match(readmeTop, /dependency-free/);
  assert.match(readmeTop, /npx aienvmap@0\.2\.0 trial/);
  assert.match(readmeTop, /nothing is uploaded automatically/);
  assert.match(readmeTop, /without silently installing, switching, or removing software/);
  assert.match(readmeTop, /## Why/);
  assert.match(readmeTop, /bad at remembering what another agent assumed/);
  assert.match(readmeTop, /Use it if several AI agents or sessions share environment-affecting work/);
  assert.match(readmeTop, /Skip it if you only need a full compliance SBOM scanner/);
  assert.match(readmeTop, /Agent A records a planned dependency change/);
  assert.match(readmeTop, /Agent B starts later and sees the pending intent/);
  assert.match(readme, /no package is installed, removed, or switched/);
  assert.match(readmeTop, /npx aienvmap@0\.2\.0 start/);
  assert.doesNotMatch(readmeTop, /npx aienvmap reconcile --quick/);
  assert.ok(readme.split(/\r?\n/).length <= 160);
  assert.ok(readme.indexOf("## Advanced environment evidence") > readme.indexOf("## What the AI gets"));
  assert.match(readme, /AI adoption guide/);
  assert.match(readme, /Automatic discovery is best-effort/);
  assert.match(readme, /aiDiscovery\.decision/);
  assert.match(readme, /fallback-required/);
  assert.match(readme, /aiAdoptionDecision/);
  assert.match(readme, /aiEntry/);
  assert.match(readme, /operationalSafety/);
  assert.match(readme, /releaseReadiness\.currentBatch/);
  assert.match(readme, /contractReview/);
  assert.match(readme, /nextStabilizationTasks/);
  assert.match(readme, /releaseReadiness\.currentBatch` is reviewed/);
  assert.match(readme, /several meaningful changes are batched/);
  assert.match(readme, /local-only unless a human reviews them/);
  assert.match(readme, /never edits the project's `\.gitignore`/);
  assert.match(stdout, /know the development environment before an AI changes it/);
  assert.match(stdout, /aienvmap start    one-command AI startup with a copy-paste fallback prompt/);
  assert.match(stdout, /aienvmap discover  read-only detection plus aiDiscovery\.decision and copy-paste prompt/);
});

test("package stays runtime dependency-free for lightweight shared machines", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));

  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.optionalDependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  assert.equal(pkg.bundledDependencies, undefined);
  assert.equal(pkg.main, undefined);
  assert.equal(pkg.version, "0.2.0");
});

test("package publish allowlist stays small and intentional", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));

  assert.deepEqual(pkg.files, [
    "bin",
    "src",
    "scripts/performance-check.mjs",
    "scripts/contract-check.mjs",
    "scripts/apm-consumer-check.mjs",
    "scripts/installed-package-check.mjs",
    "contracts",
    "evidence",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "BUGFIXES.md",
    "CONTRIBUTING.md",
    "CASE_REVIEW.md",
    "SECURITY.md",
    "TROUBLESHOOTING.md",
    "ROADMAP.md",
    "SCORECARD.md",
    "MARKET.md",
    "VALIDATION.md",
    "TESTING.md",
    "AI_TESTING.md",
    "TESTER_INVITE.md",
    "RELEASE_NOTES_0.2.0.md",
    "action.yml",
    "examples",
    ".agents",
    ".apm",
    "apm.yml"
  ]);
  assert.equal(pkg.files.includes("test"), false);
  assert.equal(pkg.files.includes(".aienvmap"), false);
  assert.equal(pkg.files.includes(".apm"), true);
  assert.equal(pkg.files.includes("apm.yml"), true);
});
