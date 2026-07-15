import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { doctorWorkspace } from "../src/commands/doctor.js";
import { strictResult } from "../src/commands/doctor.js";
import { coordinationWarnings, diagnose, handoffWarnings, multiAgentRecordWarnings, securityWarnings, staleIntentWarnings } from "../src/doctor.js";
import { writeJson } from "../src/fsutil.js";
import { openIntents } from "../src/timeline.js";

test("diagnose reports mixed lockfiles and version mismatches", () => {
  const warnings = diagnose({
    runtimes: { node: "22.0.0", python: "3.10.0" },
    containers: {},
    projectHints: {
      nvmrc: "20",
      pythonVersion: "3.11",
      packageLock: true,
      pnpmLock: true
    }
  });
  assert.deepEqual(warnings.map((w) => w.code), [
    "node-version-mismatch",
    "python-version-mismatch",
    "mixed-node-lockfiles"
  ]);
});

test("securityWarnings reports high or critical vulnerability summaries", () => {
  const warnings = securityWarnings({
    enabled: true,
    summary: { total: 2, critical: 1, high: 1 }
  });

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "security-vulnerabilities");
});

test("staleIntentWarnings reports old open intents", () => {
  const warnings = staleIntentWarnings([{
    id: "int_old",
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    action: "upgrade node",
    target: "node"
  }], new Date("2026-07-08T05:00:00.000Z"));

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "stale-open-intent");
});

test("handoffWarnings reports env changes without a later handoff", () => {
  const warnings = handoffWarnings([{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    target: "node",
    summary: "updated node"
  }]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "handoff-stale");
});

test("handoffWarnings accepts a later recorded handoff", () => {
  const warnings = handoffWarnings([{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    target: "node",
    summary: "updated node"
  }, {
    at: "2026-07-08T00:01:00.000Z",
    actor: "agent:codex",
    type: "agent-handoff",
    summary: "handoff clear"
  }]);

  assert.equal(warnings.length, 0);
});

test("handoffWarnings treats dependency records as handoff-worthy changes", () => {
  const warnings = handoffWarnings([{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    target: "dependency",
    summary: "updated lodash"
  }]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "handoff-stale");
});

test("multiAgentRecordWarnings reports shared target records after handoff", () => {
  const warnings = multiAgentRecordWarnings([
    {
      at: "2026-07-08T00:00:00.000Z",
      actor: "agent:codex",
      type: "agent-record",
      target: "dependency",
      summary: "dependency-change"
    },
    {
      at: "2026-07-08T00:01:00.000Z",
      actor: "agent:claude",
      type: "agent-record",
      target: "dependency",
      summary: "security dependency fix"
    }
  ]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "multi-agent-records");
  assert.equal(warnings[0].target, "dependency");
});

test("multiAgentRecordWarnings accepts a later handoff", () => {
  const warnings = multiAgentRecordWarnings([
    {
      at: "2026-07-08T00:00:00.000Z",
      actor: "agent:codex",
      type: "agent-record",
      target: "node",
      summary: "updated node"
    },
    {
      at: "2026-07-08T00:01:00.000Z",
      actor: "agent:claude",
      type: "agent-record",
      target: "node",
      summary: "changed node"
    },
    {
      at: "2026-07-08T00:02:00.000Z",
      actor: "agent:codex",
      type: "agent-handoff",
      summary: "handoff clear"
    }
  ]);

  assert.equal(warnings.length, 0);
});

test("coordinationWarnings reports multiple agents changing the same target", () => {
  const warnings = coordinationWarnings([
    { actor: "agent:codex", action: "upgrade node", target: "node" },
    { actor: "agent:claude", action: "downgrade node", target: "node" }
  ]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "conflicting-open-intents");
  assert.equal(warnings[0].target, "node");
});

test("coordinationWarnings infers dependency intent conflicts", () => {
  const warnings = coordinationWarnings([
    { actor: "agent:codex", action: "fix vulnerable package" },
    { actor: "agent:claude", action: "update dependency" }
  ]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "conflicting-open-intents");
  assert.equal(warnings[0].target, "dependency");
});

test("coordinationWarnings distinguishes sessions sharing one actor label", () => {
  const warnings = coordinationWarnings([
    { actor: "agent:codex", session: "thread:one", action: "update node", target: "node" },
    { actor: "agent:codex", session: "thread:two", action: "switch node", target: "node" }
  ]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "conflicting-open-intents");
});

test("staleIntentWarnings reports expired leases without granting authority", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");
  const intents = openIntents([{
    id: "int_expired",
    at: "2026-07-12T11:00:00.000Z",
    type: "intent",
    status: "open",
    actor: "agent:codex",
    session: "thread:old",
    action: "update node",
    target: "node",
    leaseExpiresAt: "2026-07-12T11:30:00.000Z"
  }], now);
  const warnings = staleIntentWarnings(intents, now);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "expired-intent-lease");
  assert.match(warnings[0].message, /Resolve or renew/);
  assert.equal(intents[0].lease.removalAuthorized, false);
});

test("strictResult filters failures by strict scope", () => {
  const warnings = [
    { code: "security-vulnerabilities", message: "security" },
    { code: "policy-version-mismatch", message: "policy" },
    { code: "conflicting-open-intents", message: "coordination" }
  ];

  assert.equal(strictResult(warnings, {}).fail, false);
  assert.equal(strictResult(warnings, {}).gate.strictMode, "off");
  assert.deepEqual(strictResult(warnings, { strict: "security" }).matchedWarningCodes, ["security-vulnerabilities"]);
  assert.equal(strictResult(warnings, { strict: "security" }).gate.exitCode, "1 when matching warnings exist");
  assert.deepEqual(strictResult(warnings, { strict: "policy" }).matchedWarningCodes, ["policy-version-mismatch"]);
  assert.deepEqual(strictResult(warnings, { strict: "coordination" }).matchedWarningCodes, ["conflicting-open-intents"]);
  assert.equal(strictResult(warnings, { ci: true }).scope, "all");
  assert.equal(strictResult(warnings, { ci: true }).fail, true);
});

test("doctorWorkspace JSON explains advisory exit behavior", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-doctor-exit-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: { node: "24.0.0" },
    packageManagers: {},
    containers: {},
    projectHints: { nvmrc: "20" },
    agentFiles: {
      agents: { path: "AGENTS.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet codex --write", role: "codex" },
      claude: { path: "CLAUDE.md", exists: true, hasAienvmapPointer: true, installCommand: "aienvmap snippet claude --write", role: "claude" }
    },
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false, summary: { total: 0 } }
  });

  const originalLog = console.log;
  const originalExitCode = process.exitCode;
  let output = "";
  console.log = (value) => { output = value; };
  process.exitCode = undefined;
  try {
    await doctorWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
    process.exitCode = originalExitCode;
  }

  const json = JSON.parse(output);
  assert.equal(json.status, "warning");
  assert.equal(json.exitBehavior.mode, "advisory");
  assert.equal(json.exitBehavior.willSetFailureExitCode, false);
  assert.match(json.exitBehavior.reason, /strict mode is off/);
  assert.equal(json.enforcement.strictPlan.recommendedStrictScope, "policy");
  assert.equal(json.enforcement.strictPlan.ciCommand, "aienvmap doctor --strict policy --json");
  assert.equal(json.enforcement.strictDecision.localCommand, "aienvmap doctor --json");
  assert.equal(json.enforcement.strictDecision.recommendedCommand, "aienvmap doctor --strict policy");
  assert.equal(json.nextSafeCommand, "aienvmap plan --write");
  assert.equal(json.aiReadiness.level, "review");
  assert.match(json.aiReadiness.next, /Review/);
  assert.equal(json.followUpPlan.status, "clear");
  assert.deepEqual(json.agentPointers.installed, ["claude"]);
  assert.deepEqual(json.agentPointers.missing, ["codex"]);
});

test("doctorWorkspace exposes pending follow-up plan", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-doctor-followup-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {},
    dependencySnapshot: { summary: { packages: 1 } },
    security: { enabled: false, summary: { total: 0 } }
  });
  await fs.writeFile(path.join(dir, ".aienvmap", "timeline.jsonl"), `${JSON.stringify({
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    target: "dependency",
    summary: "dependency-change",
    followUp: {
      required: true,
      target: "dependency",
      commands: ["aienvmap sync"]
    }
  })}\n`, "utf8");

  const originalLog = console.log;
  let jsonOutput = "";
  console.log = (value) => { jsonOutput = value; };
  try {
    await doctorWorkspace({ dir, json: true });
  } finally {
    console.log = originalLog;
  }

  const json = JSON.parse(jsonOutput);
  assert.equal(json.followUpPlan.status, "pending");
  assert.equal(json.followUpPlan.nextCommand, "aienvmap sync");
  assert.deepEqual(json.followUpPlan.targets, ["dependency"]);
  assert.equal(json.nextSafeCommand, "aienvmap sync");

  const textOutput = [];
  console.log = (value) => { textOutput.push(value); };
  try {
    await doctorWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  assert.match(textOutput.join("\n"), /follow-up: aienvmap sync targets: dependency/);
});

test("doctorWorkspace text shows advisory AI discovery action without blocking warnings", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-doctor-discovery-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    runtimes: {},
    packageManagers: {},
    containers: {},
    projectHints: {},
    agentFiles: {
      agents: { path: "AGENTS.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet codex --write", role: "codex" },
      claude: { path: "CLAUDE.md", exists: true, hasAienvmapPointer: false, installCommand: "aienvmap snippet claude --write", role: "claude" }
    },
    dependencySnapshot: { summary: { packages: 0 } },
    security: { enabled: false, summary: { total: 0 } }
  });

  const originalLog = console.log;
  const output = [];
  console.log = (value) => { output.push(value); };
  try {
    await doctorWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  const text = output.join("\n");
  assert.match(text, /doctor: no blocking environment warnings detected/);
  assert.match(text, /recommended actions:/);
  assert.match(text, /future AI agents discover the env map/);
  assert.match(text, /aienvmap snippet codex --write/);
});
