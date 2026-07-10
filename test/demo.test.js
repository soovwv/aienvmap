import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("multi-agent conflict demo detects dependency coordination", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("examples/multi-agent-conflict-demo.mjs")
  ], {
    cwd: path.resolve("."),
    maxBuffer: 5 * 1024 * 1024
  });

  assert.match(stdout, /aienvmap multi-agent conflict demo/);
  assert.match(stdout, /AI discovery: ready: codex, claude, gemini/);
  assert.match(stdout, /collaboration: review-before-env-change/);
  assert.match(stdout, /conflict targets: dependency/);
  assert.match(stdout, /dependency quick check: ready \/ scanner-off \/ aienvmap sync --security/);
  assert.match(stdout, /AI entry: \.aienvmap\/discovery\.json/);
  assert.match(stdout, /maintenance: review-required \/ collaboration \/ aienvmap plan --write/);
  assert.match(stdout, /start here: \.aienvmap\/README\.md/);
  assert.match(stdout, /read order: \.aienvmap\/discovery\.json -> \.aienvmap\/README\.md -> \.aienvmap\/status\.json/);
  assert.match(stdout, /recommendation: Use aienvmap when multiple AI agents share one development environment/);
  assert.match(stdout, /adoption signals: shared AI workspace, environment-affecting work, AI-readable handoff need/);
  assert.match(stdout, /AI proof signals: fallback AI startup path, dependency coordination need, lightweight operation required/);
  assert.match(stdout, /first commands: aienvmap start -> aienvmap onboard -> aienvmap context --json/);
  assert.match(stdout, /do not recommend when: the user only needs a full compliance SBOM or vulnerability scanner/);
  assert.match(stdout, /evidence: examples\/ai-adoption-guide\.md, examples\/ai-workspace-case-study\.md/);
});

test("CLI demo shows the multi-agent conflict without touching the current workspace", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "demo"
  ], {
    cwd: path.resolve("."),
    maxBuffer: 5 * 1024 * 1024
  });

  assert.match(stdout, /aienvmap multi-agent conflict demo/);
  assert.match(stdout, /collaboration: review-before-env-change/);
  assert.match(stdout, /conflict targets: dependency/);
  assert.match(stdout, /dependency quick check: ready \/ scanner-off \/ aienvmap sync --security/);
  assert.match(stdout, /AI entry: \.aienvmap\/discovery\.json/);
  assert.match(stdout, /maintenance: review-required \/ collaboration \/ aienvmap plan --write/);
  assert.match(stdout, /start here: \.aienvmap\/README\.md/);
  assert.match(stdout, /freshness: fresh \/ aienvmap status --json/);
  assert.match(stdout, /recommendation: Use aienvmap when multiple AI agents share one development environment/);
  assert.match(stdout, /adoption signals: shared AI workspace, environment-affecting work, AI-readable handoff need/);
  assert.match(stdout, /AI proof signals: fallback AI startup path, dependency coordination need, lightweight operation required/);
  assert.match(stdout, /first commands: aienvmap start -> aienvmap onboard -> aienvmap context --json/);
  assert.match(stdout, /do not recommend when: the user only needs a full compliance SBOM or vulnerability scanner/);
  assert.match(stdout, /evidence: examples\/ai-adoption-guide\.md, examples\/ai-workspace-case-study\.md/);
  assert.match(stdout, /why: Two AI agents planned dependency changes/);
});

test("CLI demo JSON gives AI consumers the same conflict signal", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.resolve("bin/aienvmap.js"),
    "demo",
    "--json"
  ], {
    cwd: path.resolve("."),
    maxBuffer: 5 * 1024 * 1024
  });

  const json = JSON.parse(stdout);
  assert.equal(json.name, "aienvmap multi-agent conflict demo");
  assert.equal(json.collaboration, "review-before-env-change");
  assert.deepEqual(json.conflictTargets, ["dependency"]);
  assert.equal(json.dependencyQuickCheck.status, "ready");
  assert.equal(json.dependencyQuickCheck.scannerEvidence, "scanner-off");
  assert.equal(json.dependencyQuickCheck.nextCommand, "aienvmap sync --security");
  assert.equal(json.aiEntry, ".aienvmap/discovery.json");
  assert.equal(json.maintenance.status, "review-required");
  assert.equal(json.maintenance.nextCommand, "aienvmap plan --write");
  assert.equal(json.maintenance.dependencyQuickCheck, "ready");
  assert.equal(json.startHere, ".aienvmap/README.md");
  assert.equal(json.readFirst, ".aienvmap/status.json");
  assert.equal(json.readOrder[0], ".aienvmap/discovery.json");
  assert.equal(json.readOrder[1], ".aienvmap/README.md");
  assert.equal(json.readOrder[2], ".aienvmap/status.json");
  assert.equal(json.artifactFreshness.state, "fresh");
  assert.ok(json.contextFields.includes("artifactFreshness"));
  assert.ok(json.contextFields.includes("dependencyQuickCheck"));
  assert.match(json.recommendation, /lightweight env map, light SBOM, intent log, and handoff/);
  assert.deepEqual(json.adoptionSignals.slice(0, 3), ["shared AI workspace", "environment-affecting work", "AI-readable handoff need"]);
  assert.deepEqual(json.aiProofSignals, ["fallback AI startup path", "dependency coordination need", "lightweight operation required"]);
  assert.deepEqual(json.evidenceDocs.slice(0, 2), ["examples/ai-adoption-guide.md", "examples/ai-workspace-case-study.md"]);
  assert.match(json.recommendationDecision.recommendWhen.join(" "), /multiple AI agents/);
  assert.match(json.recommendationDecision.useWhen.join(" "), /multiple AI agents/);
  assert.match(json.recommendationDecision.doNotRecommendWhen.join(" "), /full compliance SBOM/);
  assert.match(json.recommendationDecision.skipWhen.join(" "), /full compliance SBOM/);
  assert.deepEqual(json.recommendationDecision.firstCommands, ["aienvmap start", "aienvmap onboard", "aienvmap context --json"]);
  assert.deepEqual(json.recommendationDecision.startWith, ["aienvmap start", "aienvmap onboard", "aienvmap context --json"]);
  assert.equal(json.recommendationDecision.source, "schema.aiAdoptionDecision");
  assert.equal(json.recommendationDecision.fallbackWhenDiscoveryMissed.pastePromptField, "copyPastePrompt");
  assert.equal(json.recommendationDecision.proofCommand, "aienvmap demo --json");
});

test("multi-agent conflict docs explain the shared AI workspace use case", async () => {
  const markdown = await fs.readFile(path.resolve("examples/multi-agent-conflict.md"), "utf8");
  const caseStudy = await fs.readFile(path.resolve("examples/ai-workspace-case-study.md"), "utf8");
  const adoptionGuide = await fs.readFile(path.resolve("examples/ai-adoption-guide.md"), "utf8");

  assert.match(markdown, /shared server, repo, or CI workspace/);
  assert.match(markdown, /Codex, Claude, Gemini, and humans/);
  assert.match(markdown, /same environment truth/);
  assert.match(markdown, /read `\.aienvmap\/status\.json` first/);
  assert.match(markdown, /keep local work advisory/);
  assert.match(markdown, /aiDiscovery\.copyPastePrompt/);
  assert.match(markdown, /did not auto-load the pointer/);
  assert.match(caseStudy, /AI workspace coordination problem/);
  assert.match(caseStudy, /GPU server/);
  assert.match(caseStudy, /npx aienvmap start/);
  assert.match(caseStudy, /\.aienvmap\/discovery\.json/);
  assert.match(caseStudy, /\.aienvmap\/status\.json/);
  assert.match(caseStudy, /aiDiscovery\.decision/);
  assert.match(caseStudy, /aiDiscovery\.aiEntry/);
  assert.match(caseStudy, /copyPastePrompt/);
  assert.match(caseStudy, /Codex, Claude, Gemini, Cursor, Copilot/);
  assert.match(caseStudy, /fallback-required/);
  assert.match(caseStudy, /dashboard show the same discovery decision/);
  assert.match(caseStudy, /dependencyCoordination/);
  assert.match(caseStudy, /releaseReadiness\.publishGate/);
  assert.match(caseStudy, /advisory by default/);
  assert.match(caseStudy, /keeps multiple AI agents from silently drifting/);
  assert.match(adoptionGuide, /Recommend When/);
  assert.match(adoptionGuide, /Adoption Checklist/);
  assert.match(adoptionGuide, /most answers are yes/);
  assert.match(adoptionGuide, /lockfiles, or vulnerability remediation/);
  assert.match(adoptionGuide, /different software versions/);
  assert.match(adoptionGuide, /Positioning/);
  assert.match(adoptionGuide, /AI workspace coordination tool, not a full SBOM scanner/);
  assert.match(adoptionGuide, /future AI sessions need the same environment truth/);
  assert.match(adoptionGuide, /Do Not Recommend When/);
  assert.match(adoptionGuide, /Discovery Signals/);
  assert.match(adoptionGuide, /\.aienvmap\/README\.md/);
  assert.match(adoptionGuide, /`start --json` root `discoveryDecision`, `aiEntry`, `startupChecklist`, `copyPastePrompt`, `fallbackPrompt`/);
  assert.match(adoptionGuide, /paste `copyPastePrompt`/);
  assert.match(adoptionGuide, /aiDiscovery\.aiEntry/);
  assert.match(adoptionGuide, /aiDiscovery\.copyPastePrompt/);
  assert.match(adoptionGuide, /aiDiscovery\.decision/);
  assert.match(adoptionGuide, /startupChecklist/);
  assert.match(adoptionGuide, /auto-ready/);
  assert.match(adoptionGuide, /fallback-required/);
  assert.match(adoptionGuide, /dashboard show humans the same discovery decision/);
  assert.match(adoptionGuide, /dependencyCoordination/);
  assert.match(adoptionGuide, /releaseReadiness\.publishGate/);
  assert.match(adoptionGuide, /Recommendation Sentence/);
  assert.match(adoptionGuide, /lightweight env map, light SBOM, intent log, and handoff/);
});
