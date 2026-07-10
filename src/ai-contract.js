export const aiDiscoveryEntry = ".aienvmap/discovery.json";
export const aiStartHere = ".aienvmap/README.md";
export const aiStatus = ".aienvmap/status.json";
export const aiSummary = ".aienvmap/summary.md";
export const aiEnvMap = "AIENV.md";
export const aiContextCommand = "aienvmap context --json";
export const npxAiContextCommand = "npx aienvmap context --json";

export const aiDefaultReadOrder = [
  aiDiscoveryEntry,
  aiStartHere,
  aiStatus,
  aiSummary,
  aiEnvMap,
  aiContextCommand
];

export const aiFallbackRead = [
  aiDiscoveryEntry,
  aiStartHere,
  aiStatus,
  aiSummary,
  aiContextCommand
];

export const aiStartupChecklist = [
  "run aienvmap start --json when automatic discovery is uncertain",
  "read .aienvmap/discovery.json, .aienvmap/status.json, and .aienvmap/summary.md",
  "check dependencyQuickCheck before dependency, lockfile, security, or release work",
  "record intent before shared environment changes, then checkpoint and hand off after accepted changes"
];

export const npxAiStartupChecklist = [
  "run npx aienvmap start --json when automatic discovery is uncertain",
  ...aiStartupChecklist.slice(1)
];

export const aiFallbackPrompt = "Use aienvmap as the workspace env map. Read .aienvmap/discovery.json, then .aienvmap/status.json, then run aienvmap context --json before environment changes.";
export const npxAiFallbackPrompt = "Use aienvmap as the workspace env map. Read .aienvmap/discovery.json, then .aienvmap/status.json, then run npx aienvmap context --json before environment changes.";
export const npxAiMissingFallbackPrompt = "Run npx aienvmap sync to create the AI env map, then read .aienvmap/discovery.json and .aienvmap/status.json.";

export const sbomReadOrder = [
  aiDiscoveryEntry,
  ".aienvmap/sbom.json",
  aiStatus,
  aiSummary,
  aiContextCommand
];

export function aiEntryContract({
  decision = "fallback-required",
  readFirst = aiFallbackRead,
  nextCommand = aiContextCommand,
  nextSetupCommand = "aienvmap onboard",
  beforeEnvironmentChange = "aienvmap intent --actor agent:id --action planned-change --target environment",
  afterEnvironmentChange = "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
  handoff = "aienvmap handoff --record --actor agent:id",
  copyPastePrompt = aiFallbackPrompt
} = {}) {
  return {
    purpose: "Small AI startup contract for hosts that missed automatic instruction-file discovery.",
    decision,
    readFirst,
    nextCommand,
    nextSetupCommand,
    beforeEnvironmentChange,
    afterEnvironmentChange,
    handoff,
    copyPastePrompt,
    rule: "Read aiEntry first when automatic discovery is uncertain; keep local work advisory and record intent before shared environment changes."
  };
}

export function aiSessionUseContract({
  decision = "fallback-required",
  nextCommand = aiContextCommand,
  nextSetupCommand = "aienvmap onboard",
  copyPastePrompt = aiFallbackPrompt,
  proofCommand = "aienvmap discover --json"
} = {}) {
  return {
    purpose: "Shortest cross-agent startup decision for using this workspace env map.",
    useAt: [
      "start of a new AI coding session",
      "before runtime, dependency, package manager, Docker, global tool, or security-remediation changes",
      "when another AI or human may share the same environment"
    ],
    proofCommand,
    decisionField: "aiDiscovery.decision",
    decision,
    nextCommand,
    nextSetupCommand,
    fallbackPromptField: "copyPastePrompt",
    copyPastePrompt,
    beforeEnvironmentChange: "aienvmap intent --actor agent:id --action planned-change --target environment",
    afterEnvironmentChange: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    handoff: "aienvmap handoff --record --actor agent:id",
    rule: "If decision is fallback-required, do not assume the AI host auto-read a pointer file; use copyPastePrompt or run start --json before environment-affecting work."
  };
}
