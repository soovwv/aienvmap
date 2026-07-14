import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-apm-consumer-"));
const apm = process.env.APM_BIN || "apm";
const expectedSkills = [
  ".agents/skills/aienvmap/SKILL.md",
  ".claude/skills/aienvmap/SKILL.md"
];
const forbiddenOutputs = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".claude-plugin/plugin.json",
  ".agents/hooks.json",
  ".claude/settings.json",
  ".mcp.json"
];

try {
  run(apm, ["install", path.join(root, ".apm", "skills", "aienvmap"), "--target", "agent-skills,claude"], scratch);

  for (const file of expectedSkills) assert.equal(await exists(path.join(scratch, file)), true, `missing deployed skill: ${file}`);
  for (const file of forbiddenOutputs) assert.equal(await exists(path.join(scratch, file)), false, `unexpected APM output: ${file}`);

  const discover = JSON.parse(run(process.execPath, [path.join(root, "bin", "aienvmap.js"), "--dir", scratch, "discover", "--json"], root));
  assert.equal(discover.aiDiscovery.decision, "auto-ready");
  assert.deepEqual(discover.agentPointers.covered, ["codex", "gemini", "cursor", "copilot", "claude"]);
  assert.equal(discover.agentPointers.skills.length, 2);
  assert.ok(discover.agentPointers.skills.every((item) => item.hostAutomaticPickupVerified === false));

  const onboard = JSON.parse(run(process.execPath, [path.join(root, "bin", "aienvmap.js"), "--dir", scratch, "onboard", "--no-sync", "--json"], root));
  assert.equal(onboard.verification.pass, true);
  assert.equal(onboard.verification.hostAutomaticPickupVerified, false);
  assert.ok(onboard.pointers.every((item) => item.action === "preserve-agent-skill" && item.changed === false));
  for (const file of forbiddenOutputs) assert.equal(await exists(path.join(scratch, file)), false, `onboard created unexpected output: ${file}`);

  const result = {
    schemaName: "aienvmap-apm-consumer-check",
    schemaVersion: 1,
    pass: true,
    source: "local skill subpath",
    targets: ["agent-skills", "claude"],
    deployedSkills: expectedSkills,
    coveredAgents: discover.agentPointers.covered,
    nativePointersCreated: false,
    executableOrMcpConfigurationCreated: false,
    hostAutomaticPickupVerified: false,
    rule: "This proves APM placement and aienvmap coexistence, not that an AI host automatically loaded the skill."
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await fs.rm(scratch, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 60_000,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}\n${result.stdout || ""}\n${result.stderr || ""}`.trim());
  }
  return result.stdout;
}

async function exists(file) {
  return fs.access(file).then(() => true, () => false);
}
