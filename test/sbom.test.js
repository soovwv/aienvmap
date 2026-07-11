import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildCycloneDxLite, buildSbomArtifact, sbomWorkspace } from "../src/commands/sbom.js";
import { writeJson } from "../src/fsutil.js";

test("buildSbomArtifact creates standalone AI-readable light SBOM", () => {
  const sbom = buildSbomArtifact({
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { path: "/tmp/work", name: "work" },
    lightSbom: {
      mode: "light-sbom",
      summary: { packages: 1, vulnerabilities: 0 },
      riskSummary: { level: "high", score: 80, commands: ["aienvmap sync --security"], reviewTargets: ["package.json", "express"] },
      topRisk: [{ name: "express" }],
      packageManagerPolicy: { status: "review-required" },
      dependencyChangeHints: [{ manifest: "package.json" }],
      confidence: { vulnerabilities: "not-scanned" }
    }
  });

  assert.equal(sbom.schemaName, "aienvmap.light-sbom");
  assert.equal(sbom.startHere, ".aienvmap/README.md");
  assert.equal(sbom.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(sbom.readOrder[1], ".aienvmap/sbom.json");
  assert.equal(sbom.readOrder[2], ".aienvmap/status.json");
  assert.equal(sbom.summary.packages, 1);
  assert.equal(sbom.riskSummary.level, "high");
  assert.equal(sbom.aiBootstrap.readFirst, ".aienvmap/sbom.json");
  assert.equal(sbom.aiBootstrap.detailCommand, "aienvmap context --json");
  assert.equal(sbom.aiBootstrap.nextSafeCommand, "aienvmap sync --security");
  assert.equal(sbom.aiBootstrap.nextSafeCommandSource, "dependency-review");
  assert.match(sbom.aiBootstrap.nextSafeCommandReason, /requires review/);
  assert.equal(sbom.aiBootstrap.environmentChanges, "review-first");
  assert.equal(sbom.nextSafeCommand, "aienvmap sync --security");
  assert.equal(sbom.scannerGuidance.mode, "optional-read-only");
  assert.equal(sbom.scannerGuidance.decision, "run-scanner-before-security-work");
  assert.match(sbom.scannerGuidance.reason, /Scanner confidence is low/);
  assert.equal(sbom.scannerGuidance.defaultCommand, "aienvmap sbom --json");
  assert.equal(sbom.scannerGuidance.scannerCommand, "aienvmap sync --security");
  assert.equal(sbom.scannerGuidance.securityConfidence, "scanner-off");
  assert.ok(sbom.scannerGuidance.useLightSbomFor.includes("AI environment coordination"));
  assert.ok(sbom.scannerGuidance.requireScannerFor.includes("security claims"));
  assert.ok(sbom.scannerGuidance.externalTools.some((tool) => tool.tool === "syft"));
  assert.ok(sbom.scannerGuidance.externalTools.some((tool) => tool.tool === "trivy"));
  assert.ok(sbom.scannerGuidance.externalTools.some((tool) => tool.tool === "dependency-track"));
  assert.match(sbom.scannerGuidance.evidenceWorkflow.join(" "), /Read \.aienvmap\/discovery\.json/);
  assert.match(sbom.scannerGuidance.evidenceWorkflow.join(" "), /\.aienvmap\/sbom\.json/);
  assert.match(sbom.scannerGuidance.evidenceWorkflow.join(" "), /dedicated scanner/);
  assert.match(sbom.scannerGuidance.evidenceWorkflow.join(" "), /Checkpoint and hand off/);
  assert.match(sbom.scannerGuidance.interoperabilityRule, /AI coordination layer/);
  assert.match(sbom.scannerGuidance.interoperabilityRule, /Do not install or run external tools automatically/);
  assert.ok(sbom.scannerGuidance.whenToRun.includes("before security claims"));
  assert.match(sbom.scannerGuidance.rule, /default SBOM lightweight/);
  assert.equal(sbom.aiReviewPlan.status, "review");
  assert.equal(sbom.aiReviewPlan.risk, "high/80");
  assert.equal(sbom.aiReviewPlan.securityConfidence, "scanner-off");
  assert.equal(sbom.aiReviewPlan.packageManagerPolicy, "review-required");
  assert.equal(sbom.aiReviewPlan.beforeChange, "aienvmap sync --security");
  assert.match(sbom.aiReviewPlan.afterChange, /checkpoint/);
  assert.equal(sbom.dependencyCoordination.mode, "advisory");
  assert.equal(sbom.dependencyCoordination.nextCommand, "aienvmap sync --security");
  assert.deepEqual(sbom.dependencyCoordination.reviewTargets, ["package.json", "express"]);
  assert.match(sbom.dependencyCoordination.beforeChange.join(" "), /dependency-review/);
  assert.match(sbom.dependencyCoordination.afterChange.join(" "), /checkpoint/);
  assert.match(sbom.dependencyCoordination.mustNotDo.join(" "), /audit fix/);
  assert.equal(sbom.dependencyCoordination.scannerEvidence, "run-scanner-before-security-work");
  assert.match(sbom.dependencyCoordination.rule, /coordinate dependency work/);
  assert.equal(sbom.dependencyQuickCheck.status, "review");
  assert.equal(sbom.dependencyQuickCheck.nextCommand, "aienvmap sync --security");
  assert.equal(sbom.dependencyQuickCheck.scannerEvidence, "run-scanner-before-security-work");
  assert.deepEqual(sbom.dependencyQuickCheck.reviewTargets, ["package.json", "express"]);
  assert.match(sbom.dependencyQuickCheck.mustNotDo.join(" "), /lockfile rewrite/);
  assert.match(sbom.dependencyQuickCheck.rule, /first AI dependency-work decision/);
  assert.equal(sbom.aiDependencyReview.status, "review");
  assert.equal(sbom.aiDependencyReview.securityConfidence, "scanner-off");
  assert.match(sbom.aiDependencyReview.statusReason, /requires dependency review/);
  assert.deepEqual(sbom.aiDependencyReview.reviewTargets, ["package.json", "express"]);
  assert.match(sbom.aiDependencyReview.safeActions[1], /without installing/);
  assert.ok(sbom.aiDependencyReview.beforeDependencyChange.includes("aienvmap plan --write"));
  assert.equal(sbom.aiDependencyReview.beforeDependencyChange.some((command) => command.includes("checkpoint")), false);
  assert.match(sbom.aiDependencyReview.afterDependencyChange[1], /checkpoint/);
  assert.equal(sbom.aiUse.nextCommand, "aienvmap sync --security");
  assert.equal(sbom.aiUse.decision, "review");
  assert.equal(sbom.aiUse.securityConfidence, "scanner-off");
  assert.equal(sbom.aiUse.scannerCommand, "aienvmap sync --security");
  assert.deepEqual(sbom.aiUse.readFirst, [".aienvmap/discovery.json", ".aienvmap/sbom.json", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"]);
  assert.equal(sbom.aiUse.beforeChange, sbom.nextSafeCommand);
  assert.match(sbom.aiUse.afterChange, /checkpoint/);
  assert.match(sbom.aiUse.mustNotDo.join(" "), /security claims/);
  assert.equal(sbom.aiUse.rule, sbom.scannerGuidance.rule);
  assert.equal(sbom.externalEvidence.status, "not-imported");
  assert.equal(sbom.aiDecisionEnvelope.removalAuthorized, false);
  assert.ok(sbom.aiDecisionEnvelope.evidenceRefs.includes(".aienvmap/sbom.json"));
  assert.equal(sbom.externalEvidenceDecision.decision, "no-external-evidence");
  assert.equal(sbom.aiUse.externalEvidence.decision, "no-external-evidence");
});

test("buildCycloneDxLite exports project manifest packages with limitations", () => {
  const cdx = buildCycloneDxLite({
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { path: "/tmp/work", name: "work" },
    generatedBy: { version: "0.1.48" },
    dependencySnapshot: {
      packages: [{
        ecosystem: "npm",
        manager: "npm",
        manifest: "package.json",
        group: "dependencies",
        name: "express",
        version: "^4.18.0"
      }]
    },
    lightSbom: {
      source: { dependencies: "project manifests" },
      confidence: { transitiveDependencies: "not-resolved" },
      riskSummary: { level: "high", score: 80 },
      topRisk: [{
        ecosystem: "npm",
        name: "express",
        version: "^4.18.0",
        severity: "high",
        priority: "high",
        score: 80,
        directDependency: true,
        manifest: "package.json"
      }]
    }
  });

  assert.equal(cdx.bomFormat, "CycloneDX");
  assert.equal(cdx.specVersion, "1.6");
  assert.equal(cdx.components[0].name, "express");
  assert.match(cdx.components[0].purl, /^pkg:npm\/express@/);
  assert.equal(cdx.vulnerabilities[0].ratings[0].severity, "high");
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:startHere"), ".aienvmap/README.md");
  assert.match(propertyValue(cdx.metadata.properties, "aienvmap:readOrder"), /^\.aienvmap\/discovery\.json -> \.aienvmap\/sbom\.json/);
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:readFirst"), ".aienvmap/sbom.json");
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:detailCommand"), "aienvmap context --json");
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:nextSafeCommand"), "aienvmap intent --actor agent:id --action dependency-review --target dependency");
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:nextSafeCommandSource"), "dependency-review");
  assert.match(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:nextSafeCommandReason"), /requires review/);
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:localMode"), "advisory");
  assert.equal(propertyValue(cdx.metadata.properties, "aienvmap:aiBootstrap:environmentChanges"), "review-first");
  assert.match(propertyValue(cdx.properties, "aienvmap:aiBootstrap:rule"), /Review SBOM risk/);
  assert.equal(propertyValue(cdx.properties, "aienvmap:externalEvidence:status"), "not-imported");
  assert.equal(propertyValue(cdx.properties, "aienvmap:externalEvidence:verification"), "not-imported");
  assert.equal(propertyValue(cdx.properties, "aienvmap:aiDecisionEnvelope:decision"), "review");
  assert.match(propertyValue(cdx.properties, "aienvmap:aiDecisionEnvelope:reasonCodes"), /sbom-risk-high/);
  assert.match(propertyValue(cdx.properties, "aienvmap:aiDecisionEnvelope:requiresHumanApprovalBefore"), /removal/);
  assert.equal(propertyValue(cdx.properties, "aienvmap:scannerGuidance:mode"), "optional-read-only");
  assert.equal(propertyValue(cdx.properties, "aienvmap:scannerGuidance:command"), "aienvmap sync --security");
  assert.equal(propertyValue(cdx.properties, "aienvmap:scannerGuidance:externalTools"), "syft,trivy,grype,dependency-track");
  assert.match(propertyValue(cdx.properties, "aienvmap:scannerGuidance:evidenceWorkflow"), /dedicated scanner/);
  assert.match(propertyValue(cdx.properties, "aienvmap:scannerGuidance:interoperabilityRule"), /dedicated SBOM or security scanners/);
  assert.match(propertyValue(cdx.properties, "aienvmap:scannerGuidance:rule"), /optional read-only scanners/);
  assert.equal(propertyValue(cdx.properties, "aienvmap:dependencyCoordination:nextCommand"), "aienvmap intent --actor agent:id --action dependency-review --target dependency");
  assert.match(propertyValue(cdx.properties, "aienvmap:dependencyCoordination:rule"), /record intent/);
  assert.equal(propertyValue(cdx.properties, "aienvmap:dependencyQuickCheck:status"), "review");
  assert.equal(propertyValue(cdx.properties, "aienvmap:dependencyQuickCheck:nextCommand"), "aienvmap intent --actor agent:id --action dependency-review --target dependency");
  assert.equal(propertyValue(cdx.properties, "aienvmap:dependencyQuickCheck:scannerEvidence"), "light-sbom-ok-for-coordination");
  assert.match(cdx.properties[0].value, /Light SBOM/);
});

test("sbomWorkspace can write .aienvmap/sbom.json", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-sbom-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { path: dir, name: path.basename(dir) },
    lightSbom: {
      summary: { packages: 1, vulnerabilities: 0 },
      riskSummary: { level: "clear", score: 0, commands: [] }
    }
  });

  const result = await sbomWorkspace({ dir, write: true, quiet: true });
  assert.match(result.artifact, /\.aienvmap[\\\/]sbom\.json$/);

  const written = JSON.parse(await fs.readFile(result.artifact, "utf8"));
  assert.equal(written.schemaName, "aienvmap.light-sbom");
  assert.equal(written.startHere, ".aienvmap/README.md");
  assert.equal(written.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(written.summary.packages, 1);
  assert.equal(written.aiBootstrap.nextSafeCommand, "aienvmap intent --actor agent:id --action dependency-review --target dependency");
  assert.equal(written.nextSafeCommand, written.aiBootstrap.nextSafeCommand);
  assert.equal(written.aiReviewPlan.status, "ready");
  assert.equal(written.aiReviewPlan.risk, "clear/0");
  assert.equal(written.aiReviewPlan.beforeChange, written.nextSafeCommand);
  assert.equal(written.scannerGuidance.mode, "optional-read-only");
  assert.equal(written.scannerGuidance.decision, "light-sbom-ok-for-coordination");
  assert.match(written.scannerGuidance.reason, /light SBOM is enough for coordination/);
  assert.ok(written.scannerGuidance.externalTools.some((tool) => tool.tool === "grype"));
  assert.match(written.scannerGuidance.evidenceWorkflow.join(" "), /Record intent/);
  assert.equal(written.dependencyCoordination.nextCommand, written.nextSafeCommand);
  assert.match(written.dependencyCoordination.rule, /checkpoint and hand off/);
  assert.equal(written.dependencyQuickCheck.status, "ready");
  assert.equal(written.dependencyQuickCheck.nextCommand, written.nextSafeCommand);
  assert.equal(written.dependencyQuickCheck.scannerEvidence, "light-sbom-ok-for-coordination");
  assert.equal(written.aiDependencyReview.status, "ready");
  assert.equal(written.aiDependencyReview.securityConfidence, "scanner-summary");
  assert.ok(written.aiDependencyReview.readFirst.includes("riskSummary"));
  assert.equal(written.aiUse.decision, "ready");
  assert.equal(written.aiUse.securityConfidence, "scanner-summary");
  assert.equal(written.aiUse.scannerCommand, "aienvmap sync --security");
  assert.equal(written.aiUse.beforeChange, written.nextSafeCommand);
  assert.match(written.aiUse.mustNotDo.join(" "), /audit fix/);
});

test("sbomWorkspace text shows the dependency quick check", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-sbom-text-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { path: dir, name: path.basename(dir) },
    lightSbom: {
      summary: { packages: 2, vulnerabilities: 0 },
      riskSummary: { level: "clear", score: 0, commands: [] }
    }
  });

  const originalLog = console.log;
  const lines = [];
  console.log = (value) => { lines.push(value); };
  try {
    await sbomWorkspace({ dir });
  } finally {
    console.log = originalLog;
  }

  assert.match(lines.join("\n"), /dependency: ready \/ light-sbom-ok-for-coordination/);
  assert.match(lines.join("\n"), /next: aienvmap intent --actor agent:id --action dependency-review --target dependency/);
  assert.equal(lines.some((line) => /undefined/.test(line)), false);
});

test("sbomWorkspace can write CycloneDX-lite artifact", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-sbom-cdx-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { path: dir, name: path.basename(dir) },
    dependencySnapshot: {
      packages: [{ ecosystem: "npm", manager: "npm", manifest: "package.json", group: "dependencies", name: "express", version: "^4.18.0" }]
    },
    lightSbom: {
      riskSummary: { level: "low", score: 5 }
    }
  });

  const result = await sbomWorkspace({ dir, write: true, quiet: true, format: "cyclonedx-lite" });
  assert.match(result.artifact, /\.aienvmap[\\\/]sbom\.cdx\.json$/);

  const written = JSON.parse(await fs.readFile(result.artifact, "utf8"));
  assert.equal(written.bomFormat, "CycloneDX");
  assert.equal(written.components[0].name, "express");
  assert.equal(propertyValue(written.metadata.properties, "aienvmap:aiBootstrap:nextSafeCommand"), "aienvmap intent --actor agent:id --action dependency-review --target dependency");
});

test("sbomWorkspace imports, persists, reuses, and clears external evidence", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-sbom-import-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    generatedAt: "2026-07-12T00:00:00.000Z",
    workspace: { path: dir, name: path.basename(dir) },
    lightSbom: { summary: { packages: 0, vulnerabilities: 0 }, riskSummary: { level: "clear", score: 0 } }
  });
  await writeJson(path.join(dir, "syft.cdx.json"), {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    metadata: { tools: { components: [{ name: "syft", version: "1.44.0" }] } },
    components: [{ name: "demo" }]
  });

  const imported = await sbomWorkspace({ dir, import: "syft.cdx.json", write: true, quiet: true });
  assert.equal(imported.externalEvidence.status, "imported");
  assert.equal(imported.externalEvidence.artifact, "syft.cdx.json");
  assert.equal(imported.externalEvidenceDecision.decision, "read-original-before-claims");
  assert.equal(imported.externalEvidence.summary.components, 1);
  assert.equal(imported.externalEvidence.baselineDrift.status, "baseline-unavailable");
  assert.equal(await fs.stat(path.join(dir, ".aienvmap", "external-sbom-evidence.json")).then(() => true), true);

  const reused = await sbomWorkspace({ dir, quiet: true });
  assert.equal(reused.externalEvidence.digest, imported.externalEvidence.digest);
  assert.equal(reused.externalEvidence.verification, "digest-match");

  await writeJson(path.join(dir, "syft.cdx.json"), { bomFormat: "CycloneDX", specVersion: "1.6", components: [{}, {}] });
  const stale = await sbomWorkspace({ dir, quiet: true });
  assert.equal(stale.externalEvidence.status, "stale");
  assert.equal(stale.externalEvidence.verification, "digest-mismatch");
  assert.notEqual(stale.externalEvidence.currentDigest, stale.externalEvidence.digest);
  assert.equal(stale.externalEvidenceDecision.decision, "refresh-import-required");

  const refreshed = await sbomWorkspace({ dir, import: "syft.cdx.json", write: true, quiet: true });
  assert.equal(refreshed.externalEvidence.status, "imported");
  assert.equal(refreshed.externalEvidence.summary.components, 2);
  assert.equal(refreshed.externalEvidence.baselineDigest, imported.externalEvidence.digest);
  assert.equal(refreshed.externalEvidence.baselineDrift.status, "changed");
  assert.equal(refreshed.externalEvidenceDecision.decision, "component-drift-review");
  assert.equal(refreshed.aiDecisionEnvelope.decision, "review");
  assert.ok(refreshed.aiDecisionEnvelope.reasonCodes.includes("external-sbom-component-drift"));

  const cdx = await sbomWorkspace({ dir, format: "cyclonedx-lite", quiet: true });
  assert.equal(propertyValue(cdx.properties, "aienvmap:externalEvidence:artifact"), "syft.cdx.json");
  assert.equal(propertyValue(cdx.properties, "aienvmap:externalEvidence:digest"), refreshed.externalEvidence.digest);
  assert.equal(propertyValue(cdx.properties, "aienvmap:externalEvidence:verification"), "digest-match");
  assert.match(propertyValue(cdx.properties, "aienvmap:externalEvidence:baselineDrift"), /"status":"changed"/);

  const cleared = await sbomWorkspace({ dir, clear_import: true, write: true, quiet: true });
  assert.equal(cleared.externalEvidence.status, "not-imported");
  await assert.rejects(() => fs.stat(path.join(dir, ".aienvmap", "external-sbom-evidence.json")), /ENOENT/);
});

test("sbomWorkspace import preview does not persist evidence", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-sbom-preview-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), { lightSbom: {} });
  await writeJson(path.join(dir, "sbom.spdx.json"), { spdxVersion: "SPDX-2.3", packages: [] });
  const preview = await sbomWorkspace({ dir, import: "sbom.spdx.json", quiet: true });
  assert.equal(preview.externalEvidence.format, "spdx-json");
  await assert.rejects(() => fs.stat(path.join(dir, ".aienvmap", "external-sbom-evidence.json")), /ENOENT/);
});

function propertyValue(properties = [], name) {
  return properties.find((item) => item.name === name)?.value;
}
