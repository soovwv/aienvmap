import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const runFile = promisify(execFile);

test("maintainer scenario runner proves the first-start, SBOM bridge, and clarification path", async () => {
  const result = await runFile(process.execPath, [path.resolve("scripts/scenario-check.mjs")], { cwd: path.resolve("."), timeout: 90_000, maxBuffer: 1024 * 1024 });
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.schemaName, "aienvmap-maintainer-scenario-result");
  for (const stage of ["start", "reconcile", "lightSbom", "externalSbom", "caseDraft", "intentionalComplexity", "persistedIntent"]) assert.equal(summary.stages[stage].pass, true);
  assert.equal(summary.stages.reconcile.removalAuthorized, false);
  assert.equal(summary.stages.externalSbom.decision, "read-original-before-claims");
  assert.equal(summary.stages.intentionalComplexity.status, "ask-user-before-consolidation");
  assert.equal(summary.stages.intentionalComplexity.choices.includes("keep-intentional"), true);
  assert.equal(summary.stages.persistedIntent.status, "intentional-versions-recorded");
  assert.equal(summary.stages.persistedIntent.policyMatchedKinds.includes("java-installation"), true);
  assert.equal(summary.marketEvidence, false);
  assert.deepEqual(summary.privacy, { workspacePathIncluded: false, packageNamesIncluded: false, rawEvidenceIncluded: false });
});
