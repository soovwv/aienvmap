import { snippetWorkspace } from "./snippet.js";
import { syncWorkspace } from "./sync.js";
import { discoverWorkspace } from "./discover.js";

const defaultAgents = ["codex", "claude", "gemini"];
const knownAgents = new Set(["agents", "codex", "claude", "gemini", "cursor", "copilot"]);
const sessionStart = [
  "start at .aienvmap/discovery.json, then read .aienvmap/status.json",
  "run aienvmap sync if status is missing, stale, or artifactFreshness is not fresh",
  "continue project-local code work unless status/context requires environment review"
];

export async function onboardWorkspace(args = {}) {
  const agents = selectedAgents(args);
  const discoveryTargets = agents.map((agent) => agent === "agents" ? "codex" : agent);
  const pointers = [];
  const before = await discoverWorkspace({ ...args, json: false, quiet: true });
  const skillCovered = before.agentPointers?.skillCovered || [];

  for (const agent of agents) {
    const skill = before.agentPointers?.skills?.find((item) => item.availableTo.includes(agent));
    if (skill && !args.uninstall) {
      pointers.push(preservedSkillPointer(agent, skill, args.dry_run));
      continue;
    }
    pointers.push(await snippetWorkspace({ ...args, _: [agent], write: true, quiet: true }));
  }

  const synced = args.no_sync || args.dry_run ? null : await syncWorkspace({ ...args, json: false, quiet: true });
  const discovered = args.dry_run ? null : await discoverWorkspace({ ...args, json: false, quiet: true });
  const verification = pointerVerification({ requested: discoveryTargets, discovered, preview: args.dry_run, uninstall: args.uninstall, skillCovered });
  const discoveryStatus = args.dry_run
    ? "preview"
    : args.uninstall
      ? verification.pass ? "removed" : "review"
      : verification.pass
        ? synced ? "ready" : "pointers-written"
        : "review";
  const result = {
    status: args.dry_run ? "preview" : args.uninstall ? "uninstalled" : "ok",
    mode: args.dry_run ? "dry-run" : args.uninstall ? "uninstall" : "write",
    pointers,
    sync: synced ? "ok" : "skipped",
    startHere: ".aienvmap/discovery.json",
    readFirst: [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "AIENV.md"],
    nextCommands: ["aienvmap status", "aienvmap context --json"],
    sessionStart,
    freshnessRule: "Use artifactFreshness.nextCommand; when stale or unknown, run aienvmap sync before environment-affecting work.",
    aiDiscovery: `${discoveryStatus}: ${discoveryTargets.join(", ")}`,
    verification,
    next: verification.pass === false
      ? "Run aienvmap discover --json and review the requested instruction files; do not claim automatic discovery."
      : args.uninstall && verification.skillCovered.length
        ? "Selected marker blocks were removed. Recognized agent skills remain managed by their package distributor."
      : "Run aienvmap status; AI agents should read their instruction file pointer, then .aienvmap/discovery.json and .aienvmap/status.json."
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!args.quiet) {
    console.log(`AI discovery: ${result.aiDiscovery}`);
    console.log(`pointers: ${pointers.map((item) => item.file).join(", ")}`);
    console.log(`sync: ${result.sync}`);
    console.log(`verification: ${verification.status} / ${verification.proofCommand}`);
    console.log(`read: ${result.readFirst.join(" -> ")}`);
    console.log(`session: ${result.sessionStart.join(" | ")}`);
    console.log(`commands: ${result.nextCommands.join(" | ")}`);
    console.log(`next: ${result.next}`);
  }

  return result;
}

export function pointerVerification({ requested = [], discovered = null, preview = false, uninstall = false, skillCovered = null } = {}) {
  const installed = discovered?.agentPointers?.installed || [];
  const discoveredSkillCovered = skillCovered || discovered?.agentPointers?.skillCovered || [];
  const requestedInstalled = requested.filter((agent) => installed.includes(agent));
  const requestedSkillCovered = requested.filter((agent) => discoveredSkillCovered.includes(agent));
  const covered = [...new Set([...requestedInstalled, ...requestedSkillCovered])];
  const requestedMissing = requested.filter((agent) => !covered.includes(agent));
  const pass = preview ? null : uninstall ? requestedInstalled.length === 0 : requestedMissing.length === 0;
  return {
    status: preview ? "preview-only" : pass ? uninstall ? "removed" : requestedSkillCovered.length ? "available" : "installed" : "review",
    pass,
    scope: uninstall ? "selected instruction-pointer marker files only" : "instruction-pointer markers and recognized aienvmap agent skills",
    requested,
    installed: requestedInstalled,
    skillCovered: requestedSkillCovered,
    covered,
    missing: requestedMissing,
    otherInstalled: [...new Set([...installed, ...discoveredSkillCovered])].filter((agent) => !requested.includes(agent)),
    hostAutomaticPickupVerified: false,
    proofCommand: "aienvmap discover --json",
    rule: "A complete marker or recognized agent skill verifies project context availability, not whether an AI host automatically loaded it; use the fallback prompt when host pickup is uncertain."
  };
}

function preservedSkillPointer(agent, skill, preview = false) {
  return {
    file: skill.file,
    target: agent,
    mode: preview ? "dry-run" : "preserve",
    exists: true,
    changed: false,
    action: "preserve-agent-skill",
    beforeBytes: skill.bytes,
    afterBytes: skill.bytes
  };
}

function selectedAgents(args = {}) {
  const raw = args.agents
    ? String(args.agents).split(",")
    : Array.isArray(args._) && args._.length
      ? args._
      : defaultAgents;
  const agents = raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  const invalid = agents.filter((item) => !knownAgents.has(item));
  if (invalid.length) throw new Error(`unknown onboard agent "${invalid[0]}"; use codex, claude, gemini, cursor, or copilot`);
  return [...new Set(agents.map((item) => item === "agents" ? "codex" : item))];
}
