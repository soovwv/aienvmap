import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { productScorecard } from "../src/scorecard.js";

test("product scorecard separates technical readiness from market validation", () => {
  const result = productScorecard();
  assert.equal(result.schemaName, "aienvmap-product-scorecard");
  assert.equal(result.technicalReadiness.score, 93);
  assert.equal(result.marketValidation.score, 43);
  assert.equal(result.overall.score, 78);
  assert.ok(result.technicalReadiness.score > result.marketValidation.score);
  assert.match(result.limitations.join(" "), /not inferred from feature count/);
});

test("product scorecard gives AI consumers evidence and bounded competitor categories", () => {
  const result = productScorecard();
  assert.ok(result.technicalReadiness.dimensions.every((item) => item.evidence.length > 0 && item.next));
  assert.ok(result.marketValidation.dimensions.every((item) => item.evidence.length > 0 && item.next));
  assert.deepEqual(result.adjacentAlternatives.map((item) => item.name), ["Microsoft APM", "mise", "Devbox", "Flox", "Renovate", "Syft", "CycloneDX"]);
  assert.match(result.rule, /not use overall score alone/);
  assert.equal(result.externalEvidenceRequirements.marketCreditStartsAt, "outcome-verified");
  assert.equal(result.externalEvidenceRequirements.mustBeIndependent, true);
  assert.ok(result.externalEvidenceRequirements.disallowedAsMarketProof.includes("repository fixtures"));
  assert.equal(result.marketResearch.publicSignals.npmDownloadsWindow.requests, 116);
  assert.equal(result.marketResearch.publicSignals.npmDownloadsWindow.start, "2026-06-14");
  assert.equal(result.marketResearch.publicSignals.npmDownloadsWindow.end, "2026-07-13");
  assert.equal(result.marketResearch.adjacentSignals.microsoftApmStars, 3216);
  assert.equal(result.marketResearch.adjacentSignals.miseStars, 30724);
  assert.equal(result.marketResearch.adjacentSignals.miseAiWorktreeRelease, "v2026.7.5");
  assert.match(result.weaknesses.join(" "), /reproducible environments/);
  assert.match(result.marketResearch.interpretation, /not unique users/);
  assert.match(result.marketResearch.scoreImpact, /none until/);
  assert.match(result.strengths.join(" "), /bounded APM skill distribution/);
  assert.match(result.weaknesses.join(" "), /automatic skill pickup remains unverified/);
  const localEvidence = [...result.technicalReadiness.dimensions, ...result.marketValidation.dimensions]
    .flatMap((item) => item.evidence)
    .filter((item) => !item.startsWith("http") && !item.startsWith("aienvmap") && !item.startsWith("npm "))
    .map((item) => item.split("#")[0]);
  assert.deepEqual(localEvidence.filter((item) => !fs.existsSync(path.resolve(item))), []);
});
