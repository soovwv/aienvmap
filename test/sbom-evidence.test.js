import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compareSbomEvidence, importSbomEvidence, MAX_COMPONENT_IDENTITIES, parseExternalSbom } from "../src/sbom-evidence.js";

test("CycloneDX evidence parser keeps bounded coordination facts", () => {
  const result = parseExternalSbom({
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    metadata: {
      timestamp: "2026-07-12T00:00:00Z",
      tools: { components: [{ name: "syft", version: "1.44.0" }] }
    },
    components: [{ name: "one" }, { name: "two" }],
    services: [{ name: "api" }],
    dependencies: [{ ref: "one" }],
    vulnerabilities: []
  });
  assert.equal(result.format, "cyclonedx-json");
  assert.equal(result.specVersion, "1.6");
  assert.deepEqual(result.generatorTools, [{ name: "syft", version: "1.44.0" }]);
  assert.deepEqual(result.summary, { components: 2, services: 1, dependencies: 1, vulnerabilities: 0 });
  assert.equal(result.securityEvidence, "vulnerability-section-declared");
});

test("external SBOM comparison reports bounded component and version drift", () => {
  const before = parseExternalSbom({ bomFormat: "CycloneDX", components: [
    { type: "library", name: "alpha", version: "1.0.0" },
    { type: "library", name: "removed", version: "1.0.0" }
  ] });
  const after = parseExternalSbom({ bomFormat: "CycloneDX", components: [
    { type: "library", name: "alpha", version: "2.0.0" },
    { type: "library", name: "added", version: "1.0.0" }
  ] });
  const drift = compareSbomEvidence(before, after);
  assert.equal(drift.status, "changed");
  assert.deepEqual(drift.counts, { added: 1, removed: 1, versionChanged: 1 });
  assert.deepEqual(drift.sample.versionChanged[0].before, ["1.0.0"]);
  assert.deepEqual(drift.sample.versionChanged[0].after, ["2.0.0"]);
});

test("external SBOM inventory is bounded and marks partial comparisons", () => {
  const components = Array.from({ length: MAX_COMPONENT_IDENTITIES + 1 }, (_, index) => ({ name: `pkg-${index}`, version: "1" }));
  const parsed = parseExternalSbom({ bomFormat: "CycloneDX", components });
  assert.equal(parsed.componentInventory.retained, MAX_COMPONENT_IDENTITIES);
  assert.equal(parsed.componentInventory.truncated, true);
  assert.equal(compareSbomEvidence(parsed, parsed).status, "no-change-in-retained-sample");
});

test("SPDX evidence parser summarizes inventory and generator", () => {
  const result = parseExternalSbom({
    spdxVersion: "SPDX-2.3",
    creationInfo: { created: "2026-07-12T00:00:00Z", creators: ["Tool: syft-1.44.0", "Organization: Example"] },
    packages: [{ name: "one" }],
    files: [{ fileName: "one" }, { fileName: "two" }],
    relationships: [{ relationshipType: "CONTAINS" }]
  });
  assert.equal(result.format, "spdx-json");
  assert.deepEqual(result.generatorTools, [{ name: "syft", version: "1.44.0" }]);
  assert.deepEqual(result.summary, { packages: 1, files: 2, relationships: 1, vulnerabilities: null });
  assert.equal(result.securityEvidence, "inventory-only");
});

test("external evidence import stores relative path and digest only", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-evidence-"));
  try {
    const file = path.join(dir, "scanner.cdx.json");
    await fs.writeFile(file, JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.6", components: [{}] }));
    const result = await importSbomEvidence(dir, file);
    assert.equal(result.artifact, "scanner.cdx.json");
    assert.match(result.digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(result.summary.components, 1);
    assert.equal(JSON.stringify(result).includes(path.resolve(dir)), false);
    assert.equal(result.removalAuthorized, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("external evidence import rejects files outside the workspace", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-evidence-root-"));
  const outside = path.join(os.tmpdir(), `aienvmap-outside-${Date.now()}.json`);
  try {
    await fs.writeFile(outside, JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.6" }));
    await assert.rejects(() => importSbomEvidence(dir, outside), /must be inside the workspace/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(outside, { force: true });
  }
});

test("external evidence parser rejects unrelated JSON", () => {
  assert.equal(parseExternalSbom({ packages: [] }), null);
});
