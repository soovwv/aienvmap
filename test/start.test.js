import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startWorkspace } from "../src/commands/start.js";

test("start syncs a missing workspace then returns the AI startup contract", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-start-missing-"));

  const result = await startWorkspace({ dir, quiet: true });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "synced");
  assert.equal(result.localMode, "read-mostly");
  assert.equal(result.startHere, ".aienvmap/discovery.json");
  assert.equal(result.readOrder.includes(".aienvmap/reconcile.json"), true);
  assert.ok(["clear", "review"].includes(result.reconciliation.decision));
  assert.equal(result.reconciliation.artifact, ".aienvmap/reconcile.json");
  assert.equal(typeof result.reconciliation.runtimeLinks.npmStrong, "number");
  assert.equal(typeof result.reconciliation.runtimeLinks.pipStrong, "number");
  assert.equal(typeof result.reconciliation.runtimeLinks.review, "number");
  assert.equal(typeof result.reconciliation.nodeManagerEvidence.proven, "number");
  assert.equal(typeof result.reconciliation.nodeManagerEvidence.inferred, "number");
  assert.equal(result.reconciliation.nodeManagerEvidence.removalAuthorized, false);
  assert.equal(typeof result.reconciliation.installerEvidence.notRequested, "number");
  assert.equal(result.reconciliation.installerEvidence.collected, 0);
  assert.equal(typeof result.reconciliation.managerEvidence.proven, "number");
  assert.equal(result.reconciliation.managerEvidence.removalAuthorized, false);
  assert.equal(typeof result.reconciliation.osNativeEvidence.java, "number");
  assert.ok(Array.isArray(result.reconciliation.javaMetadata.vendors));
  assert.ok(Array.isArray(result.reconciliation.javaMetadata.architectures));
  assert.equal(typeof result.reconciliation.javaMetadata.propertyEvidence, "number");
  assert.ok(Array.isArray(result.reconciliation.javaMetadata.buildTools));
  assert.ok(Array.isArray(result.reconciliation.javaMetadata.managers));
  assert.equal(typeof result.reconciliation.javaMetadata.managedInstalls, "number");
  assert.equal(typeof result.reconciliation.javaMetadata.routingManaged, "number");
  assert.equal(result.reconciliation.javaMetadata.removalAuthorized, false);
  assert.equal(result.decision, "clear");
  assert.equal(result.externalSbom.decision, "no-external-evidence");
  assert.equal(result.aiDiscovery.safeStart, "npx aienvmap status");
  assert.equal(result.aiDiscovery.decision, "fallback-required");
  assert.equal(result.discoveryDecision, "fallback-required");
  assert.equal(result.nextSetupCommand, "npx aienvmap onboard");
  assert.equal(result.aiDiscovery.resume.nextCommand, "npx aienvmap status");
  assert.equal(result.resume.nextCommand, "npx aienvmap status");
  assert.equal(result.sessionUse.decision, "fallback-required");
  assert.equal(result.sessionUse.nextCommand, "npx aienvmap status");
  assert.equal(result.sessionUse.copyPastePrompt, result.copyPastePrompt);
  assert.equal(result.aiEntry.nextCommand, "npx aienvmap status");
  assert.equal(result.aiEntry.copyPastePrompt, result.copyPastePrompt);
  assert.match(result.startupChecklist.join(" "), /dependencyQuickCheck/);
  assert.match(result.fallbackPrompt, /Use aienvmap as the workspace env map/);
  assert.equal(result.copyPastePrompt, result.fallbackPrompt);
  assert.ok(result.promptUse.pasteInto.includes("Claude"));
  assert.match(result.rule, /first AI entry command/);
  assert.match(result.statusText, /session:/);
  await assert.doesNotReject(fs.access(path.join(dir, ".aienvmap", "status.json")));
  await assert.doesNotReject(fs.access(path.join(dir, ".aienvmap", "dashboard.html")));
  await assert.doesNotReject(fs.access(path.join(dir, ".aienvmap", "reconcile.json")));
  const reconcile = JSON.parse(await fs.readFile(path.join(dir, ".aienvmap", "reconcile.json"), "utf8"));
  assert.equal(reconcile.scanMode, "quick");
});

test("start reads fresh artifacts without resyncing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-start-fresh-"));
  await startWorkspace({ dir, quiet: true });

  const result = await startWorkspace({ dir, quiet: true });

  assert.equal(result.mode, "read");
  assert.match(result.nextCommand, /aienvmap/);
  assert.match(result.aiDiscovery.fallbackPrompt, /Use aienvmap as the workspace env map/);
});

test("start JSON output is machine-readable", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-start-json-"));
  const originalLog = console.log;
  let output = "";
  console.log = (value) => { output = value; };
  try {
    await startWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(output);
  assert.equal(json.status, "ok");
  assert.equal(json.mode, "synced");
  assert.equal(json.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(json.readOrder.includes(".aienvmap/reconcile.json"), true);
  assert.equal(json.reconciliation.artifact, ".aienvmap/reconcile.json");
  assert.equal(json.nextSetupCommand, "npx aienvmap onboard");
  assert.equal(json.discoveryDecision, "fallback-required");
  assert.match(json.startupChecklist.join(" "), /start --json/);
  assert.equal(json.resume.handoff, "aienvmap handoff --record --actor agent:id");
  assert.equal(json.sessionUse.proofCommand, "npx aienvmap discover --json");
  assert.equal(json.sessionUse.decision, "fallback-required");
  assert.match(json.sessionUse.rule, /do not assume/);
  assert.equal(json.aiEntry.handoff, "aienvmap handoff --record --actor agent:id");
  assert.equal(json.aiEntry.copyPastePrompt, json.copyPastePrompt);
  assert.match(json.fallbackPrompt, /Use aienvmap as the workspace env map/);
  assert.equal(json.copyPastePrompt, json.fallbackPrompt);
  assert.ok(json.promptUse.pasteInto.includes("Gemini"));
  assert.match(json.aiDiscovery.startupChecklist.join(" "), /start --json/);
  assert.equal(json.aiDiscovery.resume.handoff, "aienvmap handoff --record --actor agent:id");
  assert.equal(json.aiDiscovery.copyPastePrompt, json.aiDiscovery.fallbackPrompt);
  assert.match(json.aiDiscovery.rule, /Do not assume automatic pickup/);
});

test("start text output includes a copy-paste prompt", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-start-text-"));
  const originalLog = console.log;
  const output = [];
  console.log = (value) => { output.push(value); };
  try {
    await startWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  const text = output.join("\n");
  assert.match(text, /aiEntry: \.aienvmap\/discovery\.json \/ follow aiEntry\.readFirst/);
  assert.match(text, /AI fallback:/);
  assert.match(text, /copy-paste prompt: Use aienvmap as the workspace env map/);
  assert.match(text, /reconcile: (clear|review) \/ \.aienvmap\/reconcile\.json/);
});
