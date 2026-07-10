import { snippetWorkspace } from "./snippet.js";
import { syncWorkspace } from "./sync.js";

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

  for (const agent of agents) {
    pointers.push(await snippetWorkspace({ ...args, _: [agent], write: true, quiet: true }));
  }

  const synced = args.no_sync ? null : await syncWorkspace({ ...args, json: false, quiet: true });
  const result = {
    status: "ok",
    pointers,
    sync: synced ? "ok" : "skipped",
    startHere: ".aienvmap/discovery.json",
    readFirst: [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "AIENV.md"],
    nextCommands: ["aienvmap status", "aienvmap context --json"],
    sessionStart,
    freshnessRule: "Use artifactFreshness.nextCommand; when stale or unknown, run aienvmap sync before environment-affecting work.",
    aiDiscovery: `${synced ? "ready" : "pointers-written"}: ${discoveryTargets.join(", ")}`,
    next: "Run aienvmap status; AI agents should read their instruction file pointer, then .aienvmap/discovery.json and .aienvmap/status.json."
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!args.quiet) {
    console.log(`AI discovery: ${result.aiDiscovery}`);
    console.log(`pointers: ${pointers.map((item) => item.file).join(", ")}`);
    console.log(`sync: ${result.sync}`);
    console.log(`read: ${result.readFirst.join(" -> ")}`);
    console.log(`session: ${result.sessionStart.join(" | ")}`);
    console.log(`commands: ${result.nextCommands.join(" | ")}`);
    console.log(`next: ${result.next}`);
  }

  return result;
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
