import fs from "node:fs/promises";
import path from "node:path";
import { aiDefaultReadOrder, aiDiscoveryEntry, aiEntryContract, aiEnvMap, aiSessionUseContract, aiStartHere, aiStatus, aiSummary, npxAiFallbackPrompt, npxAiMissingFallbackPrompt, npxAiStartupChecklist } from "../ai-contract.js";
import { hasAgentPointer } from "../agent-pointer.js";
import { agentSkillLocations, hasAienvmapAgentSkill } from "../agent-skill.js";
import { readJson } from "../fsutil.js";
import { aiEnvPath, dashboardPath, discoveryJsonPath, manifestPath, sbomJsonPath, stateDir, stateReadmePath, statusJsonPath, summaryMdPath, workspaceDir } from "../paths.js";

const pointerFiles = [
  ["codex", "AGENTS.md"],
  ["claude", "CLAUDE.md"],
  ["gemini", "GEMINI.md"],
  ["cursor", path.join(".cursor", "rules", "environment.md")],
  ["copilot", path.join(".github", "copilot-instructions.md")]
];

const sessionStart = [
  "Read .aienvmap/discovery.json when instruction-file pickup is uncertain.",
  "Read .aienvmap/README.md when it exists.",
  "Read .aienvmap/status.json before environment-affecting work.",
  "Run npx aienvmap sync only when artifacts are missing or stale.",
  "Continue project-local code work unless status/context requires environment review.",
  "Record intent before changing runtimes, dependencies, package managers, Docker, or global tools."
];

export async function discoverWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const status = await readJson(statusJsonPath(dir), null);
  const artifacts = await discoverArtifacts(dir);
  const pointers = await discoverPointers(dir);
  const skills = await discoverAgentSkills(dir);
  const detected = artifacts.stateDir.exists || artifacts.discovery.exists || artifacts.aiEnv.exists || Boolean(status);
  const freshness = status?.artifactFreshness?.state || "unknown";
  const stale = ["stale", "unknown"].includes(freshness);
  const agentPointers = {
    discovery: pointerDiscovery(pointers, skills),
    installed: pointers.filter((item) => item.hasPointer).map((item) => item.agent),
    detected: pointers.filter((item) => item.exists).map((item) => item.agent),
    skills,
    skillCovered: unique(skills.flatMap((item) => item.availableTo)),
    covered: unique([
      ...pointers.filter((item) => item.hasPointer).map((item) => item.agent),
      ...skills.flatMap((item) => item.availableTo)
    ])
  };
  const readOrder = aiDefaultReadOrder;
  const result = {
    status: detected ? "detected" : "not-detected",
    detected,
    purpose: "Find the AI-readable environment map before shared environment changes.",
    localMode: "read-only",
    startHere: artifacts.discovery.exists ? aiDiscoveryEntry : artifacts.startHere.exists ? aiStartHere : artifacts.aiEnv.exists ? aiEnvMap : aiStartHere,
    readOrder,
    freshness,
    nextCommand: detected && !stale ? "npx aienvmap status" : "npx aienvmap sync",
    agentPointers,
    aiDiscovery: aiDiscoverySummary({ detected, stale, agentPointers, readOrder }),
    artifacts,
    rule: "If detected, read startHere and status before changing runtimes, dependencies, package managers, Docker, or global tools. This command does not write files."
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!args.quiet) {
    console.log(`aienvmap detected: ${result.detected ? "yes" : "no"}`);
    console.log(`start here: ${result.startHere}`);
    console.log(`status: ${artifacts.status.exists ? ".aienvmap/status.json" : "missing"}`);
    console.log(`freshness: ${result.freshness}`);
    console.log(`agent pointers: ${result.agentPointers.discovery}`);
    console.log(`next: ${result.nextCommand}`);
    console.log(`aiEntry: ${result.startHere} / follow aiDiscovery.aiEntry`);
    console.log(`AI fallback: ${result.aiDiscovery.fallbackPrompt}`);
    console.log(`copy-paste prompt: ${result.aiDiscovery.copyPastePrompt}`);
  }

  return result;
}

async function discoverArtifacts(dir) {
  return {
    stateDir: await artifact(dir, ".aienvmap", stateDir(dir)),
    discovery: await artifact(dir, aiDiscoveryEntry, discoveryJsonPath(dir)),
    startHere: await artifact(dir, aiStartHere, stateReadmePath(dir)),
    status: await artifact(dir, aiStatus, statusJsonPath(dir)),
    summary: await artifact(dir, aiSummary, summaryMdPath(dir)),
    aiEnv: await artifact(dir, aiEnvMap, aiEnvPath(dir)),
    manifest: await artifact(dir, ".aienvmap/manifest.json", manifestPath(dir)),
    sbom: await artifact(dir, ".aienvmap/sbom.json", sbomJsonPath(dir)),
    dashboard: await artifact(dir, ".aienvmap/dashboard.html", dashboardPath(dir))
  };
}

async function discoverPointers(dir) {
  const out = [];
  for (const [agent, file] of pointerFiles) {
    const full = path.join(dir, file);
    const text = await readText(full);
    out.push({
      agent,
      file: toSlash(file),
      exists: text !== null,
      hasPointer: hasAgentPointer(text)
    });
  }
  return out;
}

async function discoverAgentSkills(dir) {
  const out = [];
  for (const location of agentSkillLocations) {
    const text = await readText(path.join(dir, location.file));
    if (!hasAienvmapAgentSkill(text)) continue;
    out.push({
      name: "aienvmap",
      kind: location.kind,
      file: toSlash(location.file),
      distribution: "apm-compatible-agent-skill",
      availableTo: location.availableTo,
      bytes: Buffer.byteLength(text, "utf8"),
      hostAutomaticPickupVerified: false
    });
  }
  return out;
}

async function artifact(dir, name, fullPath) {
  return {
    path: name,
    exists: await exists(fullPath),
    absolutePath: path.resolve(fullPath),
    relativePath: toSlash(path.relative(dir, fullPath))
  };
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

function pointerDiscovery(pointers = [], skills = []) {
  const installed = pointers.filter((item) => item.hasPointer).map((item) => item.agent);
  const skillCovered = unique(skills.flatMap((item) => item.availableTo));
  if (!skillCovered.length) return installed.length ? `ready: ${installed.join(", ")}` : "missing: run aienvmap onboard";
  const covered = unique([...installed, ...skillCovered]);
  const methods = [installed.length ? "marker" : null, skillCovered.length ? "agent-skill" : null].filter(Boolean).join("+");
  return `ready: ${covered.join(", ")} via ${methods}`;
}

function aiDiscoverySummary({ detected = false, stale = true, agentPointers = {}, readOrder = [] } = {}) {
  const installed = agentPointers.covered || agentPointers.installed || [];
  const safeStart = detected && !stale ? "npx aienvmap status" : "npx aienvmap sync";
  const fallbackRead = readOrder.slice(0, 5);
  const decision = installed.length ? "auto-ready" : "fallback-required";
  const nextSetupCommand = installed.length ? "none" : "npx aienvmap onboard";
  const startupChecklist = npxAiStartupChecklist;
  const fallbackPrompt = detected
    ? npxAiFallbackPrompt
    : npxAiMissingFallbackPrompt;
  const sessionUse = aiSessionUseContract({
    decision,
    nextCommand: safeStart,
    nextSetupCommand,
    copyPastePrompt: fallbackPrompt,
    proofCommand: "npx aienvmap discover --json"
  });
  const resume = {
    purpose: "Minimum AI startup routine when instruction-file automatic discovery is uncertain.",
    readFirst: fallbackRead.length ? fallbackRead : aiDefaultReadOrder,
    nextCommand: safeStart,
    allowed: "project-local code work can continue when status/context do not require environment review",
    beforeEnvironmentChange: "aienvmap intent --actor agent:id --action planned-change --target environment",
    afterEnvironmentChange: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    handoff: "aienvmap handoff --record --actor agent:id",
    mustNotDo: [
      "do not assume automatic pickup worked; verify discovery or read fallback artifacts first",
      "do not change runtimes, dependencies, package managers, Docker, or global tools before intent/review",
      "do not run sync repeatedly when status artifacts are fresh"
    ],
    rule: "When an AI host did not auto-load a pointer file, use this resume routine as the shared environment startup contract."
  };
  return {
    mode: "best-effort",
    decision,
    automatic: installed.length > 0,
    pointerStatus: installed.length ? `ready: ${installed.join(", ")}` : "missing",
    limitation: "AI hosts only auto-read their supported instruction files; otherwise use the fallback read path.",
    installCommand: "npx aienvmap onboard",
    nextSetupCommand,
    safeStart,
    sessionStart,
    startupChecklist,
    fallbackRead,
    resume,
    sessionUse,
    aiEntry: aiEntryContract({
      decision,
      readFirst: fallbackRead,
      nextCommand: safeStart,
      nextSetupCommand,
      beforeEnvironmentChange: resume.beforeEnvironmentChange,
      afterEnvironmentChange: resume.afterEnvironmentChange,
      handoff: resume.handoff,
      copyPastePrompt: fallbackPrompt
    }),
    fallbackPrompt,
    copyPastePrompt: fallbackPrompt,
    promptUse: {
      pasteInto: ["Codex", "Claude", "Gemini", "Cursor", "Copilot", "other AI coding agents"],
      when: "Use when the AI host did not auto-read an aienvmap instruction-file pointer.",
      rule: "Keep the prompt short enough to paste into any AI session, then let the agent read the generated artifacts."
    },
    humanInstruction: "Paste copyPastePrompt into an AI session when the host did not auto-read an instruction-file pointer.",
    rule: "Do not assume automatic pickup. Verify discovery with aienvmap discover or status before shared environment changes."
  };
}

function unique(values = []) {
  return [...new Set(values)];
}

function toSlash(value = "") {
  return String(value).replaceAll("\\", "/");
}
