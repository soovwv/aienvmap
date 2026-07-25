import { aiFallbackRead, aiStartupChecklist } from "./ai-contract.js";

export function agentPointerSummary(agentFiles = {}) {
  const skills = Array.isArray(agentFiles?.skills) ? agentFiles.skills : [];
  const skillCovered = unique(skills.flatMap((item) => Array.isArray(item?.availableTo) ? item.availableTo : []));
  const entries = Object.entries(agentFiles || {}).filter(([name, item]) => {
    if (["agents", "claude", "gemini"].includes(name)) return true;
    if (!["cursor", "copilot"].includes(name)) return false;
    const normalized = normalizeAgentFile(item);
    return normalized.exists || normalized.hasAienvmapPointer;
  });
  const targets = entries.map(([name, item]) => {
    const normalized = normalizeAgentFile(item);
    return {
      name,
      role: normalized.role || (name === "agents" ? "codex" : name),
      file: normalized.path || defaultAgentFile(name),
      exists: normalized.exists,
      hasPointer: normalized.hasAienvmapPointer,
      installCommand: normalized.installCommand || defaultInstallCommand(name)
    };
  });
  const installed = targets.filter((item) => item.hasPointer);
  const installedRoles = installed.map((item) => item.role);
  const covered = unique([...installedRoles, ...skillCovered]);
  const missing = targets.filter((item) => !covered.includes(item.role));
  const discoveryDecision = covered.length ? "auto-ready" : "fallback-required";
  const methods = [installed.length ? "marker" : null, skillCovered.length ? "agent-skill" : null].filter(Boolean).join("+");
  return {
    installedCount: installed.length,
    coveredCount: covered.length,
    missingCount: missing.length,
    installed: installedRoles,
    skills,
    skillCovered,
    covered,
    missing: missing.map((item) => item.role),
    targets,
    discovery: covered.length
      ? `ready: ${covered.join(", ")}${skillCovered.length ? ` via ${methods}` : ""}`
      : "missing: run aienvmap onboard",
    discoveryDecision,
    nextSetupCommand: discoveryDecision === "auto-ready" ? "none" : "aienvmap onboard",
    startupChecklist: aiStartupChecklist,
    onboardCommand: "aienvmap onboard",
    fallbackRead: aiFallbackRead,
    fallbackCommand: "aienvmap start --json",
    next: missing.length
      ? `Run aienvmap onboard for Codex, Claude, and Gemini, or install one pointer with ${missing[0].installCommand}. Optional: use --agents cursor,copilot when those tools should discover aienvmap too.`
      : skillCovered.length
        ? "The aienvmap agent skill covers the requested AI tools; preserve the skill and use native pointers only where coverage is missing."
        : "Agent instruction pointers are installed for detected AI instruction files.",
    mode: "advisory",
    rule: "Instruction-file pointers or a recognized aienvmap agent skill improve automatic discovery. Host pickup is not proven; existing artifacts remain directly usable through aienvmap start --json or discovery.json."
  };
}

function normalizeAgentFile(item) {
  if (typeof item === "boolean") return { exists: item, hasAienvmapPointer: item };
  return {
    path: item?.path || "",
    exists: item?.exists === true,
    hasAienvmapPointer: item?.hasAienvmapPointer === true,
    installCommand: item?.installCommand || "",
    role: item?.role || ""
  };
}

function defaultAgentFile(name) {
  if (name === "claude") return "CLAUDE.md";
  if (name === "gemini") return "GEMINI.md";
  if (name === "cursor") return ".cursor/rules/environment.md";
  if (name === "copilot") return ".github/copilot-instructions.md";
  return "AGENTS.md";
}

function defaultInstallCommand(name) {
  if (name === "claude") return "aienvmap snippet claude --write";
  if (name === "gemini") return "aienvmap snippet gemini --write";
  if (name === "cursor") return "aienvmap snippet cursor --write";
  if (name === "copilot") return "aienvmap snippet copilot --write";
  return "aienvmap snippet codex --write";
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}
