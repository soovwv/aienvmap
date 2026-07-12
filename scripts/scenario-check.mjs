import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildAiDecision } from "../src/package-managers.js";

const runFile = promisify(execFile);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repository, "bin", "aienvmap.js");
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-scenario-"));

async function run(args) {
  const started = Date.now();
  const result = await runFile(process.execPath, [cli, ...args, "--dir", workspace], { cwd: repository, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  return { stdout: result.stdout, durationMs: Date.now() - started };
}

try {
  await fs.writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "scenario-fixture", private: true, dependencies: { "fixture-package": "1.0.0" } }));
  await fs.writeFile(path.join(workspace, "external.cdx.json"), JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.5", version: 1, components: [{ type: "library", name: "external-fixture", version: "1.0.0", purl: "pkg:npm/external-fixture@1.0.0" }] }));

  const start = await run(["start", "--json"]);
  const portable = await run(["reconcile", "--portable", "--json"]);
  const sbom = await run(["sbom", "--json"]);
  const imported = await run(["sbom", "--import", "external.cdx.json", "--json"]);
  await fs.writeFile(path.join(workspace, "portable.json"), portable.stdout);
  const draft = await run(["reconcile", "--case-summary", "portable.json", "--markdown"]);

  const startJson = JSON.parse(start.stdout);
  const portableJson = JSON.parse(portable.stdout);
  const sbomJson = JSON.parse(sbom.stdout);
  const importJson = JSON.parse(imported.stdout);
  const mixedDecision = buildAiDecision({
    node: [{ path: "active-node", version: "22", active: true }, { path: "inactive-node", version: "20", active: false, source: "fixture" }],
    npm: [], python: [], java: { installations: [{ runtimeVersion: "17.0.12", active: false }, { runtimeVersion: "21.0.4", active: true }], runtimeMetadata: {} }, project: {}, findings: [{ code: "multiple-node-installations", severity: "review" }]
  });
  const acknowledgedDecision = buildAiDecision({
    node: [{ path: "active-node", version: "22.14.0", active: true }, { path: "inactive-node", version: "20.19.0", active: false, source: "fixture" }],
    npm: [], python: [], java: { installations: [{ runtimeVersion: "17.0.12", active: false }, { runtimeVersion: "21.0.4", active: true }], runtimeMetadata: {} }, project: {}, policy: { intentionalNodeVersions: "20,22", intentionalJavaVersions: "17,21" }, findings: []
  });
  const summary = {
    schemaName: "aienvmap-maintainer-scenario-result",
    schemaVersion: 1,
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    stages: {
      start: { pass: true, durationMs: start.durationMs, decision: startJson.discoveryDecision || "unknown", artifacts: (await fs.readdir(path.join(workspace, ".aienvmap"))).length },
      reconcile: { pass: true, durationMs: portable.durationMs, decision: portableJson.decision, counts: { node: portableJson.inventory.node.count, npm: portableJson.inventory.npm.count, python: portableJson.inventory.python.count, java: portableJson.inventory.otherRuntimes.java?.count || 0 }, removalAuthorized: portableJson.consolidation.removalAuthorized },
      lightSbom: { pass: true, durationMs: sbom.durationMs, packages: sbomJson.summary?.packages || 0 },
      externalSbom: { pass: true, durationMs: imported.durationMs, decision: importJson.externalEvidenceDecision?.decision || "unknown", format: importJson.externalEvidenceDecision?.format || "unknown" },
      caseDraft: { pass: draft.stdout.startsWith("# Portable environment case") && !draft.stdout.includes(workspace), durationMs: draft.durationMs },
      intentionalComplexity: { pass: mixedDecision.clarification.required && mixedDecision.clarification.defaultChoice === "need-more-evidence" && mixedDecision.clarification.removalAuthorized === false, status: mixedDecision.clarification.status, choices: mixedDecision.clarification.choices },
      persistedIntent: { pass: !acknowledgedDecision.clarification.required && acknowledgedDecision.clarification.status === "intentional-versions-recorded" && acknowledgedDecision.clarification.policyMatchedKinds.includes("java-installation") && acknowledgedDecision.consolidationPlan.candidates.length === 0, status: acknowledgedDecision.clarification.status, policyMatchedKinds: acknowledgedDecision.clarification.policyMatchedKinds }
    },
    privacy: { workspacePathIncluded: false, packageNamesIncluded: false, rawEvidenceIncluded: false },
    marketEvidence: false
  };
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}
