import test from "node:test";
import assert from "node:assert/strict";
import { recommendedActions } from "../src/actions.js";

test("recommendedActions returns a simple default project-local action", () => {
  const actions = recommendedActions({}, { warnings: [], intents: [] });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, "continue-project-local");
  assert.equal(actions[0].category, "workflow");
});

test("recommendedActions prioritizes security remediation with fix versions", () => {
  const actions = recommendedActions({
    security: {
      enabled: true,
      summary: { total: 2, critical: 0, high: 1, moderate: 1, low: 0, info: 0 },
      topPackages: [{
        name: "lodash",
        severity: "high",
        remediationPriority: { level: "high", score: 90, reasons: [] },
        fixAvailable: true,
        fixVersions: ["4.17.21"],
        advisories: [{ id: "GHSA-test" }]
      }]
    }
  }, { warnings: [{ code: "security-vulnerabilities", message: "high risk" }], intents: [] });

  assert.equal(actions[0].id, "review-security-remediation");
  assert.equal(actions[0].priority, "high");
  assert.equal(actions[0].command, "aienvmap intent --actor agent:id --action planned-change --target dependency");
  assert.match(actions[0].summary, /dependency read set and protocol/);
  assert.match(actions[0].summary, /lodash/);
  assert.match(actions[0].summary, /high\/90/);
  assert.match(actions[0].summary, /4\.17\.21/);
});

test("recommendedActions reports coordination work for open intents", () => {
  const actions = recommendedActions({}, {
    warnings: [{ code: "conflicting-open-intents", message: "conflict" }],
    intents: [{ actor: "agent:codex", action: "install node", target: "node" }]
  });

  assert.deepEqual(actions.map((item) => item.id).slice(0, 2), ["review-open-intents", "coordinate-agents"]);
  assert.match(actions[1].command, /resolve --actor agent:id --target <target>/);
});

test("recommendedActions reports multi-agent record review", () => {
  const actions = recommendedActions({}, {
    warnings: [{ code: "multi-agent-records", message: "activity" }],
    intents: []
  });

  assert.equal(actions[0].id, "review-agent-activity");
  assert.match(actions[0].command, /handoff/);
});

test("recommendedActions reports light SBOM risk scans", () => {
  const actions = recommendedActions({
    lightSbom: {
      riskSummary: {
        level: "low",
        scanner: "off",
        vulnerabilityCount: 0
      }
    }
  }, { warnings: [], intents: [] });

  assert.equal(actions[0].id, "scan-sbom-risk");
  assert.equal(actions[0].command, "aienvmap sync --security");
});

test("recommendedActions plans medium light SBOM risk before dependency changes", () => {
  const actions = recommendedActions({
    lightSbom: {
      riskSummary: {
        level: "medium",
        scanner: "enabled",
        signals: ["moderate vulnerable dependency"]
      }
    }
  }, { warnings: [], intents: [] });

  assert.equal(actions[0].id, "review-sbom-risk");
  assert.equal(actions[0].priority, "medium");
  assert.equal(actions[0].command, "aienvmap plan --write");
});

test("recommendedActions suggests agent pointer installation without blocking", () => {
  const actions = recommendedActions({
    agentFiles: {
      agents: { exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet codex --write" },
      claude: { exists: true, hasAienvmapPointer: false, installCommand: "aienvmap snippet claude --write" },
      gemini: { exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet gemini --write" }
    }
  }, { warnings: [], intents: [] });

  assert.equal(actions[0].id, "install-agent-pointer");
  assert.equal(actions[0].priority, "low");
  assert.equal(actions[0].category, "agent-instructions");
  assert.equal(actions[0].command, "aienvmap snippet codex --write");
});
