import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { schemaContract } from "../src/contract.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "bin", "aienvmap.js");

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-conflict-demo-"));

await run("onboard", ["--json"]);
await run("intent", ["--actor", "agent:codex", "--action", "upgrade test runner", "--target", "dependency"]);
await run("intent", ["--actor", "agent:claude", "--action", "replace package manager", "--target", "dependency"]);
await run("sync", ["--quiet"]);

const status = JSON.parse(await run("status", ["--json"]));
const context = JSON.parse(await run("context", ["--json"]));

const conflictTargets = status.coordination?.conflictTargets || [];
const collaboration = status.collaboration?.status || "unknown";
const discovery = status.agentPointers?.discovery || "unknown";
const dependencyQuickCheck = status.dependencyQuickCheck || context.dependencyQuickCheck || {};
const recommendation = schemaContract().recommendation;
const adoptionSignals = (recommendation.adoptionChecklist || []).map((item) => item.signal);
const aiProofSignals = adoptionSignals.filter((item) => [
  "fallback AI startup path",
  "dependency coordination need",
  "lightweight operation required"
].includes(item));

if (!conflictTargets.includes("dependency")) {
  throw new Error("demo failed: dependency conflict was not detected");
}

console.log("aienvmap multi-agent conflict demo");
console.log(`workspace: ${workspace}`);
console.log(`AI discovery: ${discovery}`);
console.log(`collaboration: ${collaboration}`);
console.log(`conflict targets: ${conflictTargets.join(", ")}`);
console.log(`dependency quick check: ${dependencyQuickCheck.status || "unknown"} / ${dependencyQuickCheck.scannerEvidence || "unknown"} / ${dependencyQuickCheck.nextCommand || "aienvmap sbom --json"}`);
console.log(`next command: ${status.nextSafeCommand || status.nextCommand}`);
console.log(`AI entry: ${status.artifacts?.discovery || ".aienvmap/discovery.json"}`);
console.log(`maintenance: ${status.maintenanceLoop?.state || status.state || "unknown"} / ${status.maintenanceLoop?.nextCommandSource || "status"} / ${status.maintenanceLoop?.nextCommand || status.nextSafeCommand || status.nextCommand || "aienvmap status --json"}`);
console.log(`start here: ${status.artifacts?.startHere || ".aienvmap/README.md"}`);
const readOrder = status.aiSession?.readFirst || status.readOrder || [
  ".aienvmap/README.md",
  status.aiBootstrap?.readFirst || ".aienvmap/status.json"
];
console.log(`read order: ${readOrder.join(" -> ")}`);
console.log(`context fields: ${Object.keys(context).filter((key) => ["status", "aiBootstrap", "collaboration", "coordination", "agentPointers", "dependencyQuickCheck", "lightSbom"].includes(key)).join(", ")}`);
console.log(`recommendation: ${recommendation.shortPitch}`);
console.log(`adoption signals: ${adoptionSignals.slice(0, 3).join(", ")}`);
console.log(`AI proof signals: ${aiProofSignals.join(", ")}`);
console.log(`first commands: ${(recommendation.firstCommands || ["aienvmap start", "aienvmap onboard", "aienvmap context --json"]).join(" -> ")}`);
console.log(`do not recommend when: ${(recommendation.doNotRecommendWhen || [])[0]}`);
console.log(`evidence: ${recommendation.evidenceDocs.slice(0, 2).join(", ")}`);

async function run(command, args = []) {
  const { stdout } = await execFileAsync(process.execPath, [bin, "--dir", workspace, command, ...args], {
    cwd: root,
    maxBuffer: 5 * 1024 * 1024
  });
  return stdout.trim();
}
