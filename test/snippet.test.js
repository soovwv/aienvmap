import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { snippetWorkspace } from "../src/commands/snippet.js";

test("snippet writes only an aienvmap marker block when explicitly requested", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-"));

  await snippetWorkspace({ dir, _: ["agents"], write: true, quiet: true });

  const agents = await fs.readFile(path.join(dir, "AGENTS.md"), "utf8");
  assert.match(agents, /<!-- aienvmap:begin -->/);
  assert.match(agents, /Session start contract/);
  assert.match(agents, /Read `\.aienvmap\/status\.json` before environment-affecting work/);
  assert.match(agents, /aienvmap status --json/);
  assert.match(agents, /aienvmap sync` only when refresh is required/);
  assert.match(agents, /Continue project-local code work/);
  assert.match(agents, /Run `aienvmap status --write` only when status artifacts are missing/);
  assert.match(agents, /\.aienvmap\/summary\.md/);
  assert.match(agents, /aienvmap context --json/);
  assert.match(agents, /\.aienvmap\/reconcile\.json/);
  assert.match(agents, /aienvmap reconcile --write/);
  assert.match(agents, /Never remove a runtime/);
  assert.match(agents, /planned-change --target dependency/);
  assert.match(agents, /checkpoint --actor agent:id/);
  assert.match(agents, /<!-- aienvmap:end -->/);
});

test("snippet renders agent-specific actors for Claude and Gemini", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-agents-"));

  await snippetWorkspace({ dir, _: ["claude"], write: true, quiet: true });
  await snippetWorkspace({ dir, _: ["gemini"], write: true, quiet: true });

  const claude = await fs.readFile(path.join(dir, "CLAUDE.md"), "utf8");
  const gemini = await fs.readFile(path.join(dir, "GEMINI.md"), "utf8");

  assert.match(claude, /--actor agent:claude/);
  assert.match(claude, /Fast read order/);
  assert.match(gemini, /--actor agent:gemini/);
  assert.match(gemini, /dependencies, lockfiles/);
});

test("snippet can write optional Cursor and Copilot pointers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-extended-"));

  await snippetWorkspace({ dir, _: ["cursor"], write: true, quiet: true });
  await snippetWorkspace({ dir, _: ["copilot"], write: true, quiet: true });

  const cursor = await fs.readFile(path.join(dir, ".cursor", "rules", "environment.md"), "utf8");
  const copilot = await fs.readFile(path.join(dir, ".github", "copilot-instructions.md"), "utf8");

  assert.match(cursor, /Cursor should use `aienvmap`/);
  assert.match(cursor, /--actor agent:cursor/);
  assert.match(copilot, /GitHub Copilot should use `aienvmap`/);
  assert.match(copilot, /--actor agent:copilot/);
});

test("snippet rejects unknown targets instead of writing AGENTS.md", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-invalid-"));

  await assert.rejects(
    snippetWorkspace({ dir, _: ["typo"], write: true, quiet: true }),
    /agents, codex, claude, gemini, cursor, or copilot/
  );
  await assert.rejects(fs.readFile(path.join(dir, "AGENTS.md"), "utf8"));
});

test("snippet dry-run previews marker changes without writing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-preview-"));
  await fs.writeFile(path.join(dir, "AGENTS.md"), "# Existing rules\n", "utf8");
  const result = await snippetWorkspace({ dir, _: ["codex"], dry_run: true, quiet: true });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.action, "append-marker");
  assert.equal(result.changed, true);
  assert.equal(await fs.readFile(path.join(dir, "AGENTS.md"), "utf8"), "# Existing rules\n");
});

test("snippet uninstall removes only its marker block", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-uninstall-"));
  await fs.writeFile(path.join(dir, "AGENTS.md"), "# Existing rules\n", "utf8");
  await snippetWorkspace({ dir, _: ["codex"], write: true, quiet: true });
  const result = await snippetWorkspace({ dir, _: ["codex"], uninstall: true, quiet: true });
  assert.equal(result.mode, "uninstall");
  assert.equal(result.changed, true);
  assert.equal(await fs.readFile(path.join(dir, "AGENTS.md"), "utf8"), "# Existing rules\n");
});

test("snippet refuses instruction targets outside the workspace", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-snippet-boundary-"));
  const outside = `outside-${path.basename(dir)}.md`;
  await assert.rejects(
    snippetWorkspace({ dir, _: ["codex"], write: path.join("..", outside), quiet: true }),
    /must stay inside the workspace/
  );
  await assert.rejects(fs.access(path.resolve(dir, "..", outside)));
});
