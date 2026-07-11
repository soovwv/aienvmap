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
  assert.equal(json.contractVersion, "0.1-prototype");
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
  assert.match(json.rule, /not use overall score alone/);
});

test("package, README, and CLI help share the AI workspace coordination positioning", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));
  const readme = await fs.readFile(path.resolve("README.md"), "utf8");
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "--help"
  ], { cwd: path.resolve(".") });
  const readmeTop = readme.replace(/\r\n/g, "\n").slice(0, 1300);

  assert.match(pkg.description, /AI workspace coordination tool/);
  assert.match(pkg.description, /multiple AI agents sharing one development environment/);
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
  assert.match(readmeTop, /AI-first env map \+ light SBOM coordination/);
  assert.match(readmeTop, /multiple AI agents safely share one development environment/);
  assert.match(readmeTop, /dependency-free/);
  assert.match(readmeTop, /without heavy locks/);
  assert.match(readmeTop, /Use: AI agents share environment-affecting work/);
  assert.match(readmeTop, /Prevent: different AI agents silently installing or assuming different software versions/);
  assert.match(readmeTop, /Skip: you only need a full compliance SBOM scanner/);
  assert.match(readmeTop, /AI signal: shared Codex\/Claude\/Gemini work/);
  assert.match(readmeTop, /Start: run `npx aienvmap start`/);
  assert.ok(readme.split(/\r?\n/).length <= 155);
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
  assert.match(stdout, /AI-first env map \+ light SBOM coordination for shared AI workspaces/);
  assert.match(stdout, /aienvmap start    one-command AI startup with a copy-paste fallback prompt/);
  assert.match(stdout, /aienvmap discover  read-only detection plus aiDiscovery\.decision and copy-paste prompt/);
});

test("package stays runtime dependency-free for lightweight shared machines", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));

  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.optionalDependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  assert.equal(pkg.bundledDependencies, undefined);
  assert.equal(pkg.version, "0.1.0");
});

test("package publish allowlist stays small and intentional", async () => {
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));

  assert.deepEqual(pkg.files, [
    "bin",
    "src",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "BUGFIXES.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "TROUBLESHOOTING.md",
    "ROADMAP.md",
    "SCORECARD.md",
    "action.yml",
    "examples",
    ".agents"
  ]);
  assert.equal(pkg.files.includes("test"), false);
  assert.equal(pkg.files.includes(".aienvmap"), false);
});
