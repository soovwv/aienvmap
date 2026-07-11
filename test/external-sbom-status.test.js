import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { externalSbomWarnings, loadExternalSbomStartupSignal } from "../src/external-sbom-status.js";
import { importSbomEvidence } from "../src/sbom-evidence.js";
import { writeJson } from "../src/fsutil.js";

test("external SBOM startup signal stays optional when no evidence is imported", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-external-status-"));
  try {
    const signal = await loadExternalSbomStartupSignal(dir);
    assert.equal(signal.decision, "no-external-evidence");
    assert.equal(signal.requiresReview, false);
    assert.deepEqual(externalSbomWarnings(signal), []);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("external SBOM startup signal exposes drift without copying component samples", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-external-status-"));
  try {
    const source = path.join(dir, "scanner.cdx.json");
    await writeJson(source, { bomFormat: "CycloneDX", components: [{ name: "alpha", version: "2", purl: "pkg:npm/alpha@2" }] });
    const evidence = await importSbomEvidence(dir, source);
    evidence.baselineDrift = {
      status: "changed",
      comparable: true,
      counts: { added: 0, removed: 0, versionChanged: 1 },
      sample: { versionChanged: [{ name: "alpha", before: ["1"], after: ["2"] }] }
    };
    await writeJson(path.join(dir, ".aienvmap", "external-sbom-evidence.json"), evidence);
    const signal = await loadExternalSbomStartupSignal(dir);
    assert.equal(signal.decision, "component-drift-review");
    assert.equal(signal.requiresReview, true);
    assert.deepEqual(signal.baselineDrift.counts, { added: 0, removed: 0, versionChanged: 1 });
    assert.doesNotMatch(JSON.stringify(signal), /"sample"|"alpha"/);
    assert.equal(externalSbomWarnings(signal)[0].code, "external-sbom-component-drift");
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("external SBOM startup signal detects source digest drift", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-external-status-"));
  try {
    const source = path.join(dir, "scanner.cdx.json");
    await writeJson(source, { bomFormat: "CycloneDX", components: [] });
    const evidence = await importSbomEvidence(dir, source);
    await writeJson(path.join(dir, ".aienvmap", "external-sbom-evidence.json"), evidence);
    await writeJson(source, { bomFormat: "CycloneDX", components: [{ name: "changed" }] });
    const signal = await loadExternalSbomStartupSignal(dir);
    assert.equal(signal.decision, "refresh-import-required");
    assert.equal(signal.verification, "digest-mismatch");
    assert.equal(externalSbomWarnings(signal)[0].code, "external-sbom-stale");
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
