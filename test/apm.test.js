import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { hasAienvmapAgentSkill } from "../src/agent-skill.js";
import { discoverWorkspace } from "../src/commands/discover.js";
import { onboardWorkspace } from "../src/commands/onboard.js";

const apmSkillFile = path.resolve(".apm/skills/aienvmap/SKILL.md");

test("APM package exposes one bounded, non-executing aienvmap skill", async () => {
  const manifest = await fs.readFile(path.resolve("apm.yml"), "utf8");
  const pkg = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));
  const skill = await fs.readFile(apmSkillFile, "utf8");
  const lines = skill.split(/\r?\n/);

  assert.match(manifest, /^name: aienvmap$/m);
  assert.match(manifest, new RegExp(`^version: ${pkg.version.replaceAll(".", "\\.")}$`, "m"));
  assert.match(manifest, /^license: Apache-2\.0$/m);
  assert.match(manifest, /^\s+- agent-skills$/m);
  assert.match(manifest, /^\s+- claude$/m);
  assert.match(skill, /^name: aienvmap$/m);
  assert.match(skill, /^description: Use before an AI installs/m);
  assert.match(skill, /aienvmap-agent-skill:v1/);
  assert.match(skill, /Ask for approval before any network-backed execution/);
  assert.match(skill, /APM distributes this skill; aienvmap observes the host/);
  assert.doesNotMatch(manifest, /hooks:|scripts:|mcp:/);
  assert.ok(lines.length < 150, `APM skill should stay compact, got ${lines.length} lines`);
  assert.equal(hasAienvmapAgentSkill(skill), true);
  assert.equal(hasAienvmapAgentSkill(skill.replace("name: aienvmap", "name: other")), false);
  assert.equal(hasAienvmapAgentSkill(skill.replace("<!-- aienvmap-agent-skill:v1 -->", "")), false);
});

test("CI performs a clean APM consumer install without claiming host pickup", async () => {
  const workflow = await fs.readFile(path.resolve(".github/workflows/ci.yml"), "utf8");
  const check = await fs.readFile(path.resolve("scripts/apm-consumer-check.mjs"), "utf8");
  assert.match(workflow, /node scripts\/apm-consumer-check\.mjs/);
  assert.match(check, /agent-skills,claude/);
  assert.match(check, /preserve-agent-skill/);
  assert.match(check, /hostAutomaticPickupVerified === false/);
  assert.match(check, /not that an AI host automatically loaded the skill/);
  assert.doesNotMatch(check, /npm install|npx |--global/);
});

test("discover recognizes APM-compatible cross-tool and Claude skills without claiming host pickup", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-apm-discover-"));
  const skill = await fs.readFile(apmSkillFile, "utf8");
  await writeSkill(dir, path.join(".agents", "skills", "aienvmap", "SKILL.md"), skill);
  await writeSkill(dir, path.join(".claude", "skills", "aienvmap", "SKILL.md"), skill);

  const result = await discoverWorkspace({ dir, quiet: true });

  assert.equal(result.detected, false);
  assert.deepEqual(result.agentPointers.installed, []);
  assert.deepEqual(result.agentPointers.skillCovered, ["codex", "gemini", "cursor", "copilot", "claude"]);
  assert.deepEqual(result.agentPointers.covered, result.agentPointers.skillCovered);
  assert.equal(result.agentPointers.skills.length, 2);
  assert.ok(result.agentPointers.skills.every((item) => item.distribution === "apm-compatible-agent-skill"));
  assert.ok(result.agentPointers.skills.every((item) => item.hostAutomaticPickupVerified === false));
  assert.match(result.agentPointers.discovery, /via agent-skill/);
  assert.equal(result.aiDiscovery.decision, "auto-ready");
  assert.equal(result.aiDiscovery.nextSetupCommand, "none");
  assert.equal(result.aiDiscovery.safeStart, "npx aienvmap sync");
});

test("onboard preserves recognized agent skills and does not add duplicate marker files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-apm-onboard-"));
  const skill = await fs.readFile(apmSkillFile, "utf8");
  await writeSkill(dir, path.join(".agents", "skills", "aienvmap", "SKILL.md"), skill);
  await writeSkill(dir, path.join(".claude", "skills", "aienvmap", "SKILL.md"), skill);

  const result = await onboardWorkspace({ dir, quiet: true });

  assert.equal(result.status, "ok");
  assert.equal(result.verification.status, "available");
  assert.equal(result.verification.pass, true);
  assert.deepEqual(result.verification.installed, []);
  assert.deepEqual(result.verification.skillCovered, ["codex", "claude", "gemini"]);
  assert.deepEqual(result.verification.covered, ["codex", "claude", "gemini"]);
  assert.deepEqual(result.verification.missing, []);
  assert.ok(result.pointers.every((item) => item.action === "preserve-agent-skill"));
  assert.ok(result.pointers.every((item) => item.changed === false));
  assert.equal(await exists(path.join(dir, "AGENTS.md")), false);
  assert.equal(await exists(path.join(dir, "CLAUDE.md")), false);
  assert.equal(await exists(path.join(dir, "GEMINI.md")), false);
  assert.equal(await fs.readFile(path.join(dir, ".agents", "skills", "aienvmap", "SKILL.md"), "utf8"), skill);
  assert.equal(await fs.readFile(path.join(dir, ".claude", "skills", "aienvmap", "SKILL.md"), "utf8"), skill);
  const status = JSON.parse(await fs.readFile(path.join(dir, ".aienvmap", "status.json"), "utf8"));
  assert.deepEqual(status.agentPointers.installed, []);
  assert.deepEqual(status.agentPointers.skillCovered, ["codex", "gemini", "cursor", "copilot", "claude"]);
  assert.equal(status.agentPointers.discoveryDecision, "auto-ready");
  assert.match(status.agentPointers.discovery, /via agent-skill/);
});

async function writeSkill(dir, relative, content) {
  const file = path.join(dir, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
}

async function exists(file) {
  return fs.access(file).then(() => true, () => false);
}
