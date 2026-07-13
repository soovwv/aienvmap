import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { discoverWorkspace } from "../src/commands/discover.js";
import { syncWorkspace } from "../src/commands/sync.js";

test("discover reports missing aienvmap artifacts without writing files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-discover-missing-"));

  const result = await discoverWorkspace({ dir, quiet: true });

  assert.equal(result.status, "not-detected");
  assert.equal(result.detected, false);
  assert.equal(result.localMode, "read-only");
  assert.equal(result.startHere, ".aienvmap/README.md");
  assert.equal(result.nextCommand, "npx aienvmap sync");
  assert.equal(result.aiDiscovery.mode, "best-effort");
  assert.equal(result.aiDiscovery.decision, "fallback-required");
  assert.equal(result.aiDiscovery.automatic, false);
  assert.equal(result.aiDiscovery.pointerStatus, "missing");
  assert.equal(result.aiDiscovery.nextSetupCommand, "npx aienvmap onboard");
  assert.equal(result.aiDiscovery.safeStart, "npx aienvmap sync");
  assert.equal(result.aiDiscovery.resume.nextCommand, "npx aienvmap sync");
  assert.equal(result.aiDiscovery.sessionUse.decision, "fallback-required");
  assert.equal(result.aiDiscovery.sessionUse.proofCommand, "npx aienvmap discover --json");
  assert.equal(result.aiDiscovery.sessionUse.nextCommand, "npx aienvmap sync");
  assert.equal(result.aiDiscovery.sessionUse.fallbackPromptField, "copyPastePrompt");
  assert.equal(result.aiDiscovery.sessionUse.copyPastePrompt, result.aiDiscovery.copyPastePrompt);
  assert.match(result.aiDiscovery.sessionUse.rule, /fallback-required/);
  assert.equal(result.aiDiscovery.aiEntry.decision, "fallback-required");
  assert.equal(result.aiDiscovery.aiEntry.nextCommand, "npx aienvmap sync");
  assert.equal(result.aiDiscovery.aiEntry.copyPastePrompt, result.aiDiscovery.copyPastePrompt);
  assert.match(result.aiDiscovery.aiEntry.rule, /Read aiEntry first/);
  assert.equal(result.aiDiscovery.resume.readFirst[0], ".aienvmap/discovery.json");
  assert.match(result.aiDiscovery.startupChecklist.join(" "), /dependencyQuickCheck/);
  assert.match(result.aiDiscovery.startupChecklist.join(" "), /checkpoint and hand off/);
  assert.match(result.aiDiscovery.resume.beforeEnvironmentChange, /planned-change/);
  assert.match(result.aiDiscovery.resume.afterEnvironmentChange, /checkpoint/);
  assert.match(result.aiDiscovery.resume.mustNotDo.join(" "), /automatic pickup/);
  assert.ok(result.aiDiscovery.sessionStart.includes("Read .aienvmap/status.json before environment-affecting work."));
  assert.match(result.aiDiscovery.fallbackPrompt, /Run npx aienvmap sync/);
  assert.equal(result.aiDiscovery.copyPastePrompt, result.aiDiscovery.fallbackPrompt);
  assert.ok(result.aiDiscovery.promptUse.pasteInto.includes("Claude"));
  assert.match(result.aiDiscovery.promptUse.when, /did not auto-read/);
  assert.match(result.aiDiscovery.humanInstruction, /Paste copyPastePrompt/);
  assert.match(result.aiDiscovery.limitation, /AI hosts only auto-read/);
  assert.equal(result.artifacts.stateDir.exists, false);
  await assert.rejects(fs.access(path.join(dir, ".aienvmap")));
});

test("discover finds generated start-here artifacts and agent pointers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-discover-"));
  await syncWorkspace({ dir, quiet: true });
  await fs.writeFile(path.join(dir, "AGENTS.md"), [
    "<!-- aienvmap:begin -->",
    "## aienvmap Environment Map",
    "<!-- aienvmap:end -->"
  ].join("\n"), "utf8");

  const result = await discoverWorkspace({ dir, quiet: true });

  assert.equal(result.status, "detected");
  assert.equal(result.detected, true);
  assert.equal(result.startHere, ".aienvmap/discovery.json");
  assert.equal(result.artifacts.discovery.exists, true);
  assert.equal(result.artifacts.startHere.exists, true);
  assert.equal(result.artifacts.status.exists, true);
  assert.equal(result.artifacts.aiEnv.exists, true);
  assert.equal(result.freshness, "fresh");
  assert.equal(result.nextCommand, "npx aienvmap status");
  assert.deepEqual(result.agentPointers.installed, ["codex"]);
  assert.equal(result.aiDiscovery.automatic, true);
  assert.equal(result.aiDiscovery.decision, "auto-ready");
  assert.equal(result.aiDiscovery.pointerStatus, "ready: codex");
  assert.equal(result.aiDiscovery.nextSetupCommand, "none");
  assert.equal(result.aiDiscovery.safeStart, "npx aienvmap status");
  assert.equal(result.aiDiscovery.resume.nextCommand, "npx aienvmap status");
  assert.equal(result.aiDiscovery.sessionUse.decision, "auto-ready");
  assert.equal(result.aiDiscovery.sessionUse.nextSetupCommand, "none");
  assert.equal(result.aiDiscovery.sessionUse.nextCommand, "npx aienvmap status");
  assert.equal(result.aiDiscovery.aiEntry.decision, "auto-ready");
  assert.equal(result.aiDiscovery.aiEntry.nextCommand, "npx aienvmap status");
  assert.equal(result.aiDiscovery.aiEntry.readFirst[0], ".aienvmap/discovery.json");
  assert.match(result.aiDiscovery.resume.rule, /startup contract/);
  assert.match(result.aiDiscovery.fallbackPrompt, /Use aienvmap as the workspace env map/);
  assert.equal(result.aiDiscovery.copyPastePrompt, result.aiDiscovery.fallbackPrompt);
  assert.ok(result.aiDiscovery.promptUse.pasteInto.includes("Gemini"));
  assert.deepEqual(result.aiDiscovery.fallbackRead, [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "AIENV.md"]);
  assert.match(result.rule, /does not write files/);
});

test("discover rejects plain mentions and stale pointer status as automatic discovery", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-discover-pointer-proof-"));
  await fs.writeFile(path.join(dir, "AGENTS.md"), [
    "<!-- aienvmap:begin -->",
    "Use aienvmap.",
    "<!-- aienvmap:end -->"
  ].join("\n"), "utf8");
  await syncWorkspace({ dir, quiet: true });
  await fs.writeFile(path.join(dir, "AGENTS.md"), "This file mentions aienvmap but has no installed pointer.\n", "utf8");

  const result = await discoverWorkspace({ dir, quiet: true });

  assert.deepEqual(result.agentPointers.installed, []);
  assert.deepEqual(result.agentPointers.detected, ["codex"]);
  assert.equal(result.agentPointers.discovery, "missing: run aienvmap onboard");
  assert.equal(result.aiDiscovery.decision, "fallback-required");
  assert.equal(result.aiDiscovery.automatic, false);
  assert.equal(result.aiDiscovery.pointerStatus, "missing");
});

test("discover JSON output is machine-readable for AI agents", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-discover-json-"));
  await syncWorkspace({ dir, quiet: true });
  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await discoverWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(output);
  assert.equal(json.detected, true);
  assert.equal(json.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(json.artifacts.discovery.path, ".aienvmap/discovery.json");
  assert.equal(json.artifacts.dashboard.path, ".aienvmap/dashboard.html");
  assert.equal(json.localMode, "read-only");
  assert.equal(json.aiDiscovery.mode, "best-effort");
  assert.equal(json.aiDiscovery.decision, "fallback-required");
  assert.equal(json.aiDiscovery.installCommand, "npx aienvmap onboard");
  assert.equal(json.aiDiscovery.nextSetupCommand, "npx aienvmap onboard");
  assert.equal(json.aiDiscovery.resume.handoff, "aienvmap handoff --record --actor agent:id");
  assert.equal(json.aiDiscovery.sessionUse.decisionField, "aiDiscovery.decision");
  assert.equal(json.aiDiscovery.sessionUse.nextSetupCommand, "npx aienvmap onboard");
  assert.ok(json.aiDiscovery.sessionUse.useAt.some((item) => item.includes("new AI coding session")));
  assert.equal(json.aiDiscovery.aiEntry.handoff, "aienvmap handoff --record --actor agent:id");
  assert.equal(json.aiDiscovery.aiEntry.nextSetupCommand, "npx aienvmap onboard");
  assert.match(json.aiDiscovery.startupChecklist.join(" "), /record intent before/);
  assert.match(json.aiDiscovery.startupChecklist.join(" "), /dependencyQuickCheck/);
  assert.match(json.aiDiscovery.resume.allowed, /project-local code work/);
  assert.ok(json.aiDiscovery.sessionStart.some((item) => item.includes("Record intent")));
  assert.match(json.aiDiscovery.fallbackPrompt, /aienvmap context --json/);
  assert.equal(json.aiDiscovery.copyPastePrompt, json.aiDiscovery.fallbackPrompt);
  assert.ok(json.aiDiscovery.promptUse.pasteInto.includes("Codex"));
  assert.match(json.aiDiscovery.humanInstruction, /instruction-file pointer/);
  assert.match(json.aiDiscovery.rule, /Do not assume automatic pickup/);
});

test("discover text output includes a copy-paste prompt", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-discover-text-"));
  const originalLog = console.log;
  const output = [];
  console.log = (value) => { output.push(value); };
  try {
    await discoverWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  const text = output.join("\n");
  assert.match(text, /AI fallback:/);
  assert.match(text, /aiEntry: \.aienvmap\/README\.md \/ follow aiDiscovery\.aiEntry/);
  assert.match(text, /copy-paste prompt: Run npx aienvmap sync/);
});
