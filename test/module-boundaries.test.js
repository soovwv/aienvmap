import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import * as facade from "../src/package-managers.js";
import * as runtimeLinks from "../src/runtime-links.js";
import * as packageComparison from "../src/package-comparison.js";
import * as environmentDecision from "../src/environment-decision.js";
import * as runtimeFindings from "../src/runtime-findings.js";
import * as environmentAssessment from "../src/environment-assessment.js";
import * as runtimeManagerEvidence from "../src/runtime-manager-evidence.js";
import { agentPointerSummary as facadeAgentPointerSummary } from "../src/preflight.js";
import { agentPointerSummary } from "../src/agent-pointers.js";

test("extracted modules preserve compatibility facade identities", () => {
  assert.equal(facade.linkNodeNpmRuntimes, runtimeLinks.linkNodeNpmRuntimes);
  assert.equal(facade.linkPythonPipRuntimes, runtimeLinks.linkPythonPipRuntimes);
  assert.equal(facade.analyzeRuntimeLinks, runtimeLinks.analyzeRuntimeLinks);
  assert.equal(facade.comparePythonPackages, packageComparison.comparePythonPackages);
  assert.equal(facade.compareNpmGlobalPackages, packageComparison.compareNpmGlobalPackages);
  assert.equal(facade.summarizePythonPackages, packageComparison.summarizePythonPackages);
  assert.equal(facade.buildConsolidationPlan, environmentDecision.buildConsolidationPlan);
  assert.equal(facade.buildEnvironmentClarification, environmentDecision.buildEnvironmentClarification);
  assert.equal(facade.applyIntentionalRuntimePolicy, environmentDecision.applyIntentionalRuntimePolicy);
  assert.equal(facade.analyzeNodeInstallations, runtimeFindings.analyzeNodeInstallations);
  assert.equal(facade.analyzeNpmInstallations, runtimeFindings.analyzeNpmInstallations);
  assert.equal(facade.analyzePythonInstallations, runtimeFindings.analyzePythonInstallations);
  assert.equal(facade.buildAiDecision, environmentAssessment.buildAiDecision);
  assert.equal(facade.attachNvmManagerEvidence, runtimeManagerEvidence.attachNvmManagerEvidence);
  assert.equal(facade.attachFnmManagerEvidence, runtimeManagerEvidence.attachFnmManagerEvidence);
  assert.equal(facade.parseMiseRuntimeInventory, runtimeManagerEvidence.parseMiseRuntimeInventory);
  assert.equal(facade.attachMiseNodeEvidence, runtimeManagerEvidence.attachMiseNodeEvidence);
  assert.equal(facade.attachMisePythonEvidence, runtimeManagerEvidence.attachMisePythonEvidence);
  assert.equal(facade.attachVoltaManagerEvidence, runtimeManagerEvidence.attachVoltaManagerEvidence);
  assert.equal(facadeAgentPointerSummary, agentPointerSummary);
});

test("refactored responsibilities stay bounded instead of returning to monoliths", async () => {
  const budgets = {
    "src/package-managers.js": 1300,
    "src/preflight.js": 900,
    "src/runtime-links.js": 120,
    "src/package-comparison.js": 100,
    "src/agent-pointers.js": 120,
    "src/environment-decision.js": 120,
    "src/runtime-findings.js": 130,
    "src/environment-assessment.js": 210,
    "src/reason-explanations.js": 80,
    "src/runtime-manager-evidence.js": 250
  };
  const failures = [];
  for (const [file, maximum] of Object.entries(budgets)) {
    const lines = (await fs.readFile(path.resolve(file), "utf8")).split(/\r?\n/).length;
    if (lines > maximum) failures.push(`${file}: ${lines} > ${maximum}`);
  }
  assert.deepEqual(failures, []);
});
