const technicalDimensions = [
  dimension("lightweight-runtime", 15, 15, ["package.json#dependencies", "npm pack --dry-run"], "Keep zero runtime dependencies and a bounded package."),
  dimension("ai-readable-contract", 14, 15, ["aienvmap schema --json", "src/ai-decision-envelope.js"], "Stabilize the additive contract at 0.2.0."),
  dimension("environment-inventory", 18, 20, ["aienvmap reconcile --json --full-packages", "test/reconcile.test.js"], "Validate consolidation plans against external, mixed-manager environments."),
  dimension("multi-ai-coordination", 13, 15, ["aienvmap demo --json", "test/multi-agent-demo.test.js"], "Validate the workflow in an external multi-user case study."),
  dimension("sbom-interoperability", 12, 15, ["aienvmap sbom --json", "test/sbom.test.js"], "Validate imported CycloneDX and SPDX evidence against more generators."),
  dimension("safety-and-quality", 17, 20, ["npm test", "npm run perf:check", ".github/workflows/ci.yml"], "Add signed release provenance and validate performance budgets with more environments.")
];

const marketDimensions = [
  dimension("differentiation", 15, 20, ["README.md#why", "examples/ai-workspace-case-study.md"], "Publish side-by-side workflows against adjacent tools."),
  dimension("problem-evidence", 7, 20, ["examples/multi-agent-conflict.md"], "Collect reproducible external environment-drift cases."),
  dimension("adoption-evidence", 2, 20, ["https://www.npmjs.com/package/aienvmap", "https://github.com/soovwv/aienvmap"], "Track real users, repeat usage, and external contributors."),
  dimension("ecosystem-integration", 7, 20, [".agents/skills/aienvmap/SKILL.md", "action.yml"], "Publish verified host-specific AI integration examples."),
  dimension("onboarding-and-proof", 12, 20, ["aienvmap start --json", "aienvmap demo --json"], "Run first-use tests with users unfamiliar with the project.")
];

const adjacentAlternatives = [
  alternative("mise", "runtime and tool version management", "aienvmap observes and coordinates; it does not replace a version manager", "https://mise.jdx.dev/"),
  alternative("Renovate", "automated dependency updates", "aienvmap coordinates AI intent and environment evidence before and after changes", "https://docs.renovatebot.com/"),
  alternative("Syft", "full software inventory and SBOM generation", "aienvmap provides a light manifest view and imports external evidence", "https://github.com/anchore/syft"),
  alternative("CycloneDX", "SBOM standard and ecosystem", "aienvmap emits a lite projection and interoperates with richer artifacts", "https://cyclonedx.org/capabilities/sbom/")
];

export function productScorecard() {
  const technical = category("technicalReadiness", technicalDimensions);
  const market = category("marketValidation", marketDimensions);
  const overall = Math.round(technical.score * 0.7 + market.score * 0.3);
  return {
    schemaName: "aienvmap-product-scorecard",
    schemaVersion: 1,
    status: "evidence-limited",
    overall: { score: overall, maximum: 100, confidence: "medium", weights: { technicalReadiness: 0.7, marketValidation: 0.3 } },
    technicalReadiness: technical,
    marketValidation: market,
    positioning: "AI workspace coordination and environment evidence layer; not a package manager, vulnerability scanner, or full SBOM generator.",
    adjacentAlternatives,
    strengths: ["zero-runtime-dependency local operation", "AI-readable environment and decision contracts", "read-only multi-install discovery", "light SBOM interoperability", "explicit approval boundaries"],
    weaknesses: ["limited independent adoption evidence", "few external case studies", "information-only depth for several toolchains", "pre-0.2.0 contract stability"],
    nextPriorities: [
      { priority: 1, outcome: "external problem evidence", proof: "at least three reproducible user environments and before/after reports" },
      { priority: 2, outcome: "AI-host integration evidence", proof: "verified examples for major coding-agent hosts" },
      { priority: 3, outcome: "release provenance", proof: "signed npm provenance and reproducible release evidence for a meaningful batched version" }
    ],
    limitations: ["Market scores are not inferred from feature count.", "Repository-owned examples are not independent adoption evidence.", "Scores change only with cited evidence; unknown evidence receives no credit."],
    rule: "AI consumers should compare category scores and evidence, not use overall score alone as permission to recommend, install, publish, or modify an environment."
  };
}

function dimension(id, score, maximum, evidence, next) {
  return { id, score, maximum, evidence, next };
}

function category(name, dimensions) {
  const earned = dimensions.reduce((sum, item) => sum + item.score, 0);
  const maximum = dimensions.reduce((sum, item) => sum + item.maximum, 0);
  return { name, score: Math.round((earned / maximum) * 100), earned, maximum, dimensions };
}

function alternative(name, category, boundary, official) {
  return { name, category, boundary, official };
}
