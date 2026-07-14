const technicalDimensions = [
  dimension("lightweight-runtime", 15, 15, ["package.json#dependencies", "npm pack --dry-run"], "Keep zero runtime dependencies and a bounded package."),
  dimension("ai-readable-contract", 14, 15, ["aienvmap schema --json", "src/ai-decision-envelope.js"], "Stabilize the additive contract at 0.2.0."),
  dimension("environment-inventory", 19, 20, ["aienvmap reconcile --json --full-packages", "aienvmap reconcile --portable --json", "test/reconcile.test.js"], "Validate portable reports and consolidation plans against external, mixed-manager environments."),
  dimension("multi-ai-coordination", 13, 15, ["aienvmap demo --json", "test/demo.test.js"], "Validate the workflow in an external multi-user case study."),
  dimension("sbom-interoperability", 12, 15, ["aienvmap sbom --json", "test/sbom.test.js"], "Validate imported CycloneDX and SPDX evidence against more generators."),
  dimension("safety-and-quality", 20, 20, ["npm test", "npm run perf:check", "test/reconcile.test.js", ".github/workflows/ci.yml", "aienvmap@0.1.1 dist.attestations"], "Validate performance budgets and release safety with more external environments.")
];

const marketDimensions = [
  dimension("differentiation", 15, 20, ["README.md#why", "examples/ai-workspace-case-study.md"], "Publish side-by-side workflows against adjacent tools."),
  dimension("problem-evidence", 7, 20, ["examples/multi-agent-conflict.md"], "Collect reproducible external environment-drift cases."),
  dimension("adoption-evidence", 2, 20, ["https://www.npmjs.com/package/aienvmap", "https://github.com/soovwv/aienvmap"], "Track real users, repeat usage, and external contributors."),
  dimension("ecosystem-integration", 7, 20, [".apm/skills/aienvmap/SKILL.md", "scripts/apm-consumer-check.mjs", "action.yml"], "Publish verified host-specific AI integration examples."),
  dimension("onboarding-and-proof", 12, 20, ["aienvmap start --json", "aienvmap demo --json"], "Run first-use tests with users unfamiliar with the project.")
];

const adjacentAlternatives = [
  alternative("Microsoft APM", "agent context dependency management", "APM declares and reproduces instructions, skills, prompts, plugins, and MCP servers; aienvmap supplies observed host runtime and coordination evidence", "https://github.com/microsoft/apm"),
  alternative("mise", "runtime, tool, task, and config-trust management", "mise increasingly supports AI-agent worktrees and Codex installation; aienvmap observes mixed active routing and coordinates changes without trusting config, installing, or switching tools", "https://mise.jdx.dev/"),
  alternative("Devbox", "isolated reproducible development environments", "Devbox creates a declared portable environment; aienvmap observes mixed existing installations without replacing the shell", "https://github.com/jetify-com/devbox"),
  alternative("Flox", "declared reusable development environments", "Flox aligns humans and AI on an activated reproducible environment; aienvmap maps and coordinates the non-clean host state already present", "https://github.com/flox/flox"),
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
    marketResearch: {
      report: "MARKET.md",
      observedAt: "2026-07-14",
      publicSignals: { githubStars: 0, githubForks: 0, independentOutcomeVerifiedCases: 0, npmDownloadsWindow: { requests: 116, start: "2026-06-14", end: "2026-07-13" } },
      adjacentSignals: { observedAt: "2026-07-14", microsoftApmStars: 3216, devboxStars: 12166, floxStars: 4047, miseStars: 30724, miseAiWorktreeRelease: "v2026.7.5" },
      interpretation: "npm downloads are requests, not unique users, retention, successful setups, or recommendation evidence.",
      scoreImpact: "none until independent outcome-verified evidence exists"
    },
    adjacentAlternatives,
    strengths: ["zero-runtime-dependency local operation", "AI-readable environment and decision contracts", "read-only multi-install discovery", "bounded APM skill distribution with consumer-install regression coverage", "light SBOM interoperability", "explicit approval boundaries"],
    weaknesses: ["limited independent adoption evidence", "few external case studies", "AI-host automatic skill pickup remains unverified", "cross-user versions require owning-user verification", "adjacent tools increasingly combine AI context, agent worktrees, runtime setup, and reproducible environments", "pre-0.2.0 contract stability"],
    nextPriorities: [
      { priority: 1, outcome: "external problem evidence", proof: "at least three reproducible user environments, including one shared-server owner-verified report" },
      { priority: 2, outcome: "AI-host integration evidence", proof: "verified automatic-pickup and fallback examples for major coding-agent hosts" },
      { priority: 3, outcome: "release authentication hardening", proof: "npm trusted publisher configured and verified before the next release; 0.1.1 provenance remains registry-verifiable" }
    ],
    externalEvidenceRequirements: {
      guide: "examples/portable-environment-case-guide.md",
      intake: ".github/ISSUE_TEMPLATE/environment_case.md",
      levels: ["submitted", "reproducible", "outcome-verified", "longitudinal"],
      marketCreditStartsAt: "outcome-verified",
      mustBeIndependent: true,
      disallowedAsMarketProof: ["repository fixtures", "maintainer-only examples", "copied reports", "unreviewed portable evidence", "feature count"],
      privacyRule: "Submission is manual; review portable output and prose, and never submit raw reconciliation artifacts, paths, identities, secrets, or proprietary details."
    },
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
