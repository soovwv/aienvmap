import fs from "node:fs/promises";
import { aiDefaultReadOrder, aiDiscoveryEntry, aiEntryContract, aiFallbackPrompt, aiSessionUseContract, aiStartupChecklist, npxAiContextCommand } from "../ai-contract.js";
import { initWorkspace } from "./init.js";
import { scanWorkspace } from "./scan.js";
import { compileWorkspace } from "./compile.js";
import { dashWorkspace } from "./dash.js";
import { statusWorkspace } from "./status.js";
import { sbomWorkspace } from "./sbom.js";
import { summaryWorkspace } from "./summary.js";
import { discoveryJsonPath, stateReadmePath } from "../paths.js";

export async function syncWorkspace(args) {
  const quiet = args.quiet || args.json;
  const next = { ...args, quiet };

  const initialized = await initWorkspace(next);
  const scanned = await scanWorkspace(next);
  const compiled = await compileWorkspace(next);
  const dashboard = await dashWorkspace(next);
  const status = await statusWorkspace({ ...next, json: false, write: true, quiet: true });
  const sbom = await sbomWorkspace({ ...next, json: false, write: true, quiet: true });
  const cyclonedx = await sbomWorkspace({ ...next, json: false, write: true, quiet: true, format: "cyclonedx-lite" });
  const summary = await summaryWorkspace({ ...next, json: false, write: true, quiet: true });
  const discovery = await writeDiscoveryArtifact(next.dir || ".", status);
  const stateReadme = await writeStateReadme(next.dir || ".", status);

  const result = {
    status: "ok",
    outputs: {
      aiEnv: compiled.aiEnv,
      manifest: scanned.manifest,
      timeline: scanned.timeline,
      status: status.artifact,
      sbom: sbom.artifact,
      cyclonedx: cyclonedx.artifact,
      summary: summary.artifact,
      discovery,
      startHere: stateReadme,
      dashboard: dashboard.dashboard
    },
    changes: scanned.changes,
    initialized: initialized.stateDir
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!quiet) {
    console.log("sync complete: AIENV.md, start-here README, discovery, manifest, status, SBOM, summary, ledger, intents, and dashboard are up to date");
  }

  return result;
}

async function writeDiscoveryArtifact(dir, status = {}) {
  const out = discoveryJsonPath(dir);
  const discoveryDecision = status.agentPointers?.discoveryDecision || "fallback-required";
  const pointerStatus = status.agentPointers?.discovery || "missing: run aienvmap onboard";
  const nextSetupCommand = discoveryDecision === "auto-ready" ? "none" : "npx aienvmap onboard";
  const maintenance = status.maintenanceLoop || {};
  const followUp = status.followUpPlan || {};
  const dependencyQuickCheck = status.dependencyQuickCheck || {};
  const artifactFreshness = status.artifactFreshness || {};
  const readOrder = aiDefaultReadOrder;
  const resume = {
    readFirst: readOrder,
    nextCommand: status.nextCommand || "aienvmap status --json",
    beforeEnvironmentChange: status.aiSession?.beforeEnvironmentChange || "aienvmap intent --actor agent:id --action planned-change --target environment",
    afterEnvironmentChange: status.aiSession?.afterEnvironmentChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
    handoff: status.aiSession?.handoff || "aienvmap handoff --record --actor agent:id",
    rule: "Use this routine when an AI host did not auto-load an instruction-file pointer."
  };
  const sessionUse = aiSessionUseContract({
    decision: discoveryDecision,
    nextCommand: resume.nextCommand,
    nextSetupCommand,
    copyPastePrompt: aiFallbackPrompt,
    proofCommand: "npx aienvmap discover --json"
  });
  const artifact = {
    schemaVersion: 1,
    schemaName: "aienvmap.ai-discovery",
    generatedAt: new Date().toISOString(),
    purpose: "Smallest AI-readable entry point for this workspace environment map.",
    decision: discoveryDecision,
    automatic: discoveryDecision === "auto-ready",
    pointerStatus,
    limitation: "AI hosts only auto-read their supported instruction files; otherwise start from this file.",
    startCommand: "npx aienvmap start --json",
    statusCommand: "npx aienvmap status --json",
    contextCommand: npxAiContextCommand,
    nextCommand: status.nextCommand || "aienvmap status --json",
    nextSetupCommand,
    readOrder,
    externalSbom: status.externalSbom || null,
    maintenance: {
      status: followUp.status === "pending" ? "follow-up-pending" : maintenance.state || status.state || "unknown",
      nextCommand: followUp.status === "pending"
        ? followUp.nextCommand || "aienvmap sync"
        : maintenance.nextCommand || status.nextSafeCommand || status.nextCommand || "aienvmap status --json",
      source: followUp.status === "pending" ? "follow-up" : maintenance.nextCommandSource || "status",
      freshness: artifactFreshness.state || "unknown",
      followUp: followUp.status || "clear",
      dependencyQuickCheck: dependencyQuickCheck.status || "unknown",
      externalSbom: status.externalSbom?.decision || "no-external-evidence",
      beforeEnvironmentChange: status.aiSession?.beforeEnvironmentChange || "aienvmap intent --actor agent:id --action planned-change --target environment",
      afterEnvironmentChange: status.aiSession?.afterEnvironmentChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
      rule: "Use this compact block as the recurring AI environment maintenance decision before another shared environment change."
    },
    startupChecklist: status.agentPointers?.startupChecklist || aiStartupChecklist,
    resume,
    sessionUse,
    aiEntry: aiEntryContract({
      decision: discoveryDecision,
      readFirst: readOrder,
      nextCommand: resume.nextCommand,
      nextSetupCommand,
      beforeEnvironmentChange: resume.beforeEnvironmentChange,
      afterEnvironmentChange: resume.afterEnvironmentChange,
      handoff: resume.handoff,
      copyPastePrompt: aiFallbackPrompt
    }),
    fallbackPrompt: aiFallbackPrompt,
    copyPastePrompt: aiFallbackPrompt,
    promptUse: {
      pasteInto: ["Codex", "Claude", "Gemini", "Cursor", "Copilot", "other AI coding agents"],
      when: "Use when the AI host did not auto-read an aienvmap instruction-file pointer.",
      rule: "Keep the prompt short enough to paste into any AI session, then let the agent read the generated artifacts."
    },
    humanInstruction: "Paste copyPastePrompt into an AI session when automatic instruction-file discovery did not happen.",
    rule: "Do not assume automatic pickup worked. Read discovery/status first, keep local operation advisory, and record intent before shared environment changes."
  };
  await fs.writeFile(out, JSON.stringify(artifact, null, 2), "utf8");
  return out;
}

async function writeStateReadme(dir, status = {}) {
  const out = stateReadmePath(dir);
  const session = Array.isArray(status.aiSession?.start) && status.aiSession.start.length
    ? status.aiSession.start.join(" -> ")
    : "aienvmap status --json -> aienvmap context --json";
  const readFirst = status.aiBootstrap?.readFirst || ".aienvmap/status.json";
  const readOrder = Array.isArray(status.aiSession?.readFirst) && status.aiSession.readFirst.length
    ? status.aiSession.readFirst
    : [".aienvmap/README.md", readFirst, ".aienvmap/summary.md"];
  const next = status.nextSafeCommand || status.nextCommand || "aienvmap status --json";
  const freshness = status.artifactFreshness?.status || "unknown";
  const discovery = status.agentPointers?.discovery || "missing: run aienvmap onboard";
  const discoveryDecision = discovery.startsWith("ready:") ? "auto-ready" : "fallback-required";
  const nextSetup = discoveryDecision === "auto-ready" ? "none" : "npx aienvmap onboard";
  const followUp = status.followUpPlan?.status || "clear";
  const sbom = status.sbomRisk?.level || "unknown";
  const lines = [
    "# aienvmap start here",
    "",
    "This workspace uses `aienvmap`.",
    "AI coding agents should read this environment map and explicit change handoff before changing shared development environment state.",
    "Generated by `aienvmap sync`. Read this before environment-affecting work.",
    "",
    `- shortest AI entry: \`${aiDiscoveryEntry}\``,
    `- read order: \`${readOrder.join(" -> ")}\``,
    `- AI session: \`${session}\``,
    `- next: \`${next}\``,
    `- freshness: ${freshness}`,
    `- discovery: ${discovery}`,
    `- discovery decision: ${discoveryDecision}`,
    "- aiEntry: read `.aienvmap/discovery.json` `aiEntry`, then follow `readFirst`, `nextCommand`, `beforeEnvironmentChange`, `afterEnvironmentChange`, and `handoff`",
    "- sessionUse: read `.aienvmap/discovery.json` `sessionUse`; if `decision` is `fallback-required`, use `copyPastePrompt` before environment-affecting work",
    `- next setup: \`${nextSetup}\``,
    "- discovery mode: best-effort; use `aienvmap discover --json` when automatic pickup is uncertain",
    "- startup checklist: `start --json` -> read `status.json` -> record `intent` before env changes -> `checkpoint` and `handoff` after changes",
    "- AI fallback prompt: Use aienvmap as the workspace env map. Read `.aienvmap/discovery.json`, then `.aienvmap/status.json`, then run `aienvmap context --json` before environment changes.",
    `- follow-up: ${followUp}`,
    `- light SBOM risk: ${sbom}`,
    "",
    "For humans: open `dashboard.html`.",
    "For AI agents: start here, then use `status.json`, `summary.md`, and `aienvmap context --json`.",
    "Default mode is advisory. Use strict checks only in CI or when a human asks.",
    ""
  ];
  await fs.writeFile(out, lines.join("\n"), "utf8");
  return out;
}
