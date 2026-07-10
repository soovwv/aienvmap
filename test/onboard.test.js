import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { onboardWorkspace } from "../src/commands/onboard.js";

test("onboard writes Codex, Claude, and Gemini pointers then syncs", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-"));

  const result = await onboardWorkspace({ dir, quiet: true });

  assert.equal(result.status, "ok");
  assert.equal(result.sync, "ok");
  assert.equal(result.aiDiscovery, "ready: codex, claude, gemini");
  assert.equal(result.startHere, ".aienvmap/discovery.json");
  assert.deepEqual(result.readFirst, [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "AIENV.md"]);
  assert.deepEqual(result.nextCommands, ["aienvmap status", "aienvmap context --json"]);
  assert.match(result.sessionStart[0], /\.aienvmap\/discovery\.json/);
  assert.match(result.sessionStart[0], /status\.json/);
  assert.match(result.sessionStart[1], /artifactFreshness/);
  assert.match(result.freshnessRule, /artifactFreshness\.nextCommand/);
  assert.deepEqual(result.pointers.map((item) => item.file), ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);

  const agents = await fs.readFile(path.join(dir, "AGENTS.md"), "utf8");
  const claude = await fs.readFile(path.join(dir, "CLAUDE.md"), "utf8");
  const gemini = await fs.readFile(path.join(dir, "GEMINI.md"), "utf8");
  const status = JSON.parse(await fs.readFile(path.join(dir, ".aienvmap", "status.json"), "utf8"));

  assert.match(agents, /--actor agent:codex/);
  assert.match(claude, /--actor agent:claude/);
  assert.match(gemini, /--actor agent:gemini/);
  assert.deepEqual(status.agentPointers.installed, ["codex", "claude", "gemini"]);
});

test("onboard can target one agent without syncing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-one-"));

  const result = await onboardWorkspace({ dir, _: ["claude"], no_sync: true, quiet: true });

  assert.equal(result.sync, "skipped");
  assert.equal(result.aiDiscovery, "pointers-written: claude");
  assert.match(result.sessionStart.join(" "), /project-local code work/);
  assert.deepEqual(result.pointers.map((item) => item.file), ["CLAUDE.md"]);
  await assert.rejects(fs.readFile(path.join(dir, "AGENTS.md"), "utf8"));
});

test("onboard can target optional Cursor and Copilot pointers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-extended-"));

  const result = await onboardWorkspace({ dir, agents: "cursor,copilot", no_sync: true, quiet: true });

  assert.deepEqual(result.pointers.map((item) => item.file), [
    path.join(".cursor", "rules", "environment.md"),
    path.join(".github", "copilot-instructions.md")
  ]);
  await assert.doesNotReject(fs.access(path.join(dir, ".cursor", "rules", "environment.md")));
  await assert.doesNotReject(fs.access(path.join(dir, ".github", "copilot-instructions.md")));
});

test("onboard explains all supported pointer targets on invalid input", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-invalid-"));

  await assert.rejects(
    onboardWorkspace({ dir, agents: "unknown", no_sync: true, quiet: true }),
    /codex, claude, gemini, cursor, or copilot/
  );
});

test("onboard text output includes the AI session start contract", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-text-"));
  const originalLog = console.log;
  const output = [];
  console.log = (value) => { output.push(value); };
  try {
    await onboardWorkspace({ dir, _: ["gemini"], no_sync: true });
  } finally {
    console.log = originalLog;
  }

  const text = output.join("\n");
  assert.match(text, /AI discovery: pointers-written: gemini/);
  assert.match(text, /read: \.aienvmap\/discovery\.json -> \.aienvmap\/README\.md -> \.aienvmap\/status\.json/);
  assert.match(text, /session: start at \.aienvmap\/discovery\.json/);
  assert.match(text, /artifactFreshness is not fresh/);
});

test("onboard dry-run previews all default pointers without writing or syncing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-preview-"));
  const result = await onboardWorkspace({ dir, dry_run: true, quiet: true });
  assert.equal(result.status, "preview");
  assert.equal(result.mode, "dry-run");
  assert.equal(result.sync, "skipped");
  assert.ok(result.pointers.every((item) => item.mode === "dry-run"));
  assert.deepEqual(await fs.readdir(dir), []);
});

test("onboard uninstall preserves existing instruction content", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-onboard-uninstall-"));
  await fs.writeFile(path.join(dir, "AGENTS.md"), "# Keep me\n", "utf8");
  await onboardWorkspace({ dir, _: ["codex"], no_sync: true, quiet: true });
  const result = await onboardWorkspace({ dir, _: ["codex"], uninstall: true, no_sync: true, quiet: true });
  assert.equal(result.status, "uninstalled");
  assert.equal(result.pointers[0].action, "remove-marker");
  assert.equal(await fs.readFile(path.join(dir, "AGENTS.md"), "utf8"), "# Keep me\n");
});
