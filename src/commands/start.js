import { discoverWorkspace } from "./discover.js";
import { statusWorkspace, renderStatusText } from "./status.js";
import { syncWorkspace } from "./sync.js";
import { reconcileWorkspace, summarizeReconciliation } from "./reconcile.js";
import { readJsonStrict } from "../fsutil.js";
import { reconcileJsonPath, workspaceDir } from "../paths.js";
import { readFileSync } from "node:fs";
import { reconciliationFresh } from "../reconciliation-freshness.js";
import { compactStartPreflight } from "../compact-preflight.js";
import { explainReasonCodes } from "../reason-explanations.js";

const packageVersion = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;

export async function startWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const before = await discoverWorkspace({ ...args, quiet: true, json: false });
  const needsSync = !before.detected || ["stale", "unknown"].includes(before.freshness);

  if (needsSync) {
    await syncWorkspace({ ...args, quiet: true, json: false });
  }

  let reconciliation = await readJsonStrict(reconcileJsonPath(dir), null);
  let reconciliationIsFresh = await reconciliationFresh(reconciliation, dir);
  if (needsSync || !reconciliationIsFresh) {
    reconciliation = await reconcileWorkspace({ ...args, dir, quiet: true, json: false, write: true, quick: true, automatic_snapshot: true });
    reconciliationIsFresh = await reconciliationFresh(reconciliation, dir);
  }

  const status = await statusWorkspace({ ...args, quiet: true, json: false, write: true });
  const after = await discoverWorkspace({ ...args, quiet: true, json: false });
  const result = {
    status: "ok",
    mode: needsSync ? "synced" : "read",
    localMode: "read-mostly",
    purpose: "One-command AI startup for a shared development environment.",
    startHere: after.startHere,
    readOrder: withReconcile(after.readOrder),
    decision: status.state,
    summary: status.summary,
    aiDecisionEnvelope: status.aiDecisionEnvelope,
    nextCommand: status.nextCommand,
    nextSetupCommand: after.aiDiscovery?.nextSetupCommand || "npx aienvmap onboard",
    agentPointers: status.agentPointers,
    aiDiscovery: after.aiDiscovery,
    discoveryDecision: after.aiDiscovery?.decision || status.agentPointers?.discoveryDecision || "fallback-required",
    startupChecklist: after.aiDiscovery?.startupChecklist || [],
    resume: after.aiDiscovery?.resume || null,
    sessionUse: after.aiDiscovery?.sessionUse || null,
    aiEntry: after.aiDiscovery?.aiEntry || null,
    fallbackPrompt: after.aiDiscovery?.fallbackPrompt || "",
    copyPastePrompt: after.aiDiscovery?.copyPastePrompt || after.aiDiscovery?.fallbackPrompt || "",
    promptUse: after.aiDiscovery?.promptUse || null,
    reconciliation: { ...summarizeReconciliation(reconciliation), freshness: reconciliationIsFresh ? "fresh" : "unknown-or-stale" },
    externalSbom: status.externalSbom,
    statusText: renderStatusText(status),
    rule: "Use this as the first AI entry command when instruction-file automatic discovery is uncertain. It only writes aienvmap artifacts and keeps local decisions advisory."
  };

  if (args.json) {
    console.log(JSON.stringify(args.compact ? compactStartPreflight(result, status) : result, null, 2));
  } else if (!args.quiet) {
    const counts = status.counts || {};
    const reason = explainReasonCodes(result.aiDecisionEnvelope?.reasonCodes, 1)[0] || result.summary;
    console.log(`aienvmap ${packageVersion}: ${result.decision} | latest command: npx aienvmap@latest start`);
    console.log(`detected: runtimes ${counts.runtimes || 0} | package managers ${counts.packageManagers || 0} | containers ${counts.containers || 0}`);
    console.log(`review: warnings ${counts.warnings || 0} | planned changes ${counts.openIntents || 0}`);
    console.log(`reason: ${reason}`);
    if (result.aiDecisionEnvelope?.userQuestion) console.log(`ask: ${result.aiDecisionEnvelope.userQuestion}`);
    console.log(`next: ${result.nextCommand}`);
    console.log(`details: ${result.startHere} | ${result.reconciliation.artifact}`);
    console.log(`AI prompt: ${result.copyPastePrompt}`);
  }

  return result;
}

function withReconcile(readOrder = []) {
  const filtered = readOrder.filter((item) => item !== ".aienvmap/reconcile.json");
  const statusIndex = filtered.indexOf(".aienvmap/status.json");
  filtered.splice(statusIndex >= 0 ? statusIndex + 1 : 0, 0, ".aienvmap/reconcile.json");
  return filtered;
}
