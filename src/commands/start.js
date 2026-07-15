import { discoverWorkspace } from "./discover.js";
import { statusWorkspace, renderStatusText } from "./status.js";
import { syncWorkspace } from "./sync.js";
import { reconcileWorkspace, summarizeReconciliation } from "./reconcile.js";
import { readJson } from "../fsutil.js";
import { reconcileJsonPath, workspaceDir } from "../paths.js";

export async function startWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const before = await discoverWorkspace({ ...args, quiet: true, json: false });
  const needsSync = !before.detected || ["stale", "unknown"].includes(before.freshness);

  if (needsSync) {
    await syncWorkspace({ ...args, quiet: true, json: false });
  }

  let reconciliation = await readJson(reconcileJsonPath(dir), null);
  if (needsSync || !reconciliationFresh(reconciliation)) {
    reconciliation = await reconcileWorkspace({ ...args, dir, quiet: true, json: false, write: true, quick: true, automatic_snapshot: true });
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
    reconciliation: { ...summarizeReconciliation(reconciliation), freshness: reconciliationFresh(reconciliation) ? "fresh" : "unknown-or-stale" },
    externalSbom: status.externalSbom,
    statusText: renderStatusText(status),
    rule: "Use this as the first AI entry command when instruction-file automatic discovery is uncertain. It only writes aienvmap artifacts and keeps local decisions advisory."
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!args.quiet) {
    console.log(`aienvmap start: ${result.mode}`);
    console.log(`decision: ${result.decision}: ${result.summary}`);
    if (result.aiDecisionEnvelope?.userQuestion) console.log(`ask user: ${result.aiDecisionEnvelope.userQuestion}`);
    console.log(`read: ${result.readOrder.join(" -> ")}`);
    console.log(`next: ${result.nextCommand}`);
    console.log(`setup: ${result.nextSetupCommand}`);
    console.log(`reconcile: ${result.reconciliation.decision} / ${result.reconciliation.artifact}`);
    console.log(`AI discovery: ${result.discoveryDecision} / ${result.agentPointers?.discovery || after.agentPointers.discovery}`);
    console.log(`aiEntry: ${result.startHere} / follow aiEntry.readFirst, nextCommand, intent, checkpoint, and handoff`);
    console.log(`discovery: ${result.agentPointers?.discovery || after.agentPointers.discovery}`);
    console.log(`AI fallback: ${result.fallbackPrompt}`);
    console.log(`copy-paste prompt: ${result.copyPastePrompt}`);
  }

  return result;
}

function reconciliationFresh(value = {}) {
  const generated = Date.parse(value.generatedAt || "");
  return Number.isFinite(generated) && Date.now() - generated < 24 * 60 * 60 * 1000;
}

function withReconcile(readOrder = []) {
  const filtered = readOrder.filter((item) => item !== ".aienvmap/reconcile.json");
  const statusIndex = filtered.indexOf(".aienvmap/status.json");
  filtered.splice(statusIndex >= 0 ? statusIndex + 1 : 0, 0, ".aienvmap/reconcile.json");
  return filtered;
}
