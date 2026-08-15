import { publishedReleaseEvidence, releaseState } from "./release-state.js";

const technicalDimensions = [
  dimension("lightweight-runtime", 15, 15, ["package.json#dependencies", "npm pack --dry-run"], "Keep zero runtime dependencies and a bounded package."),
  dimension("ai-readable-contract", 14, 15, ["aienvmap schema --json", "src/ai-decision-envelope.js"], "Stabilize the additive contract at 0.2.0."),
  dimension("environment-inventory", 19, 20, ["aienvmap reconcile --json --full-packages", "aienvmap reconcile --portable --json", "test/reconcile.test.js"], "Validate portable reports and consolidation plans against external, mixed-manager environments."),
  dimension("multi-ai-coordination", 13, 15, ["aienvmap demo --json", "test/demo.test.js", "test/fsutil.test.js#independent-process-cas"], "Validate the workflow in an external multi-user case study."),
  dimension("sbom-interoperability", 12, 15, ["aienvmap sbom --json", "test/sbom.test.js"], "Validate imported CycloneDX and SPDX evidence against more generators."),
  dimension("safety-and-quality", 19, 20, ["npm run release:check", "npm run pack:install-check", "test/reconcile.test.js", ".github/workflows/ci.yml", "aienvmap@0.1.1 dist.attestations"], "Validate the 0.2.0 package and probe boundaries in independent external environments.")
];

const marketReadinessDimensions = [
  dimension("positioning", 17, 20, ["README.md#why", "MARKET.md"], "Validate the boundary with external users who also use adjacent environment tools."),
  dimension("distribution", 14, 20, [".apm/skills/aienvmap/SKILL.md", "scripts/apm-consumer-check.mjs", "action.yml"], "Verify actual host pickup after the immutable release tag exists."),
  dimension("onboarding", 17, 20, ["aienvmap start --json", "aienvmap trial --json", "AI_TESTING.md"], "Run first-use tests with users unfamiliar with the project."),
  dimension("release-operations", 15, 20, ["npm run release:check", ".github/workflows/release.yml", "SECURITY.md"], "Verify npm-side trusted publishing and protected-main release governance."),
  dimension("external-proof-flow", 10, 20, ["TESTER_INVITE.md", "CASE_REVIEW.md", "examples/portable-environment-case-guide.md"], "Collect at least five public submissions before case promotion and classify independent outcome evidence separately.")
];

const marketValidationDimensions = [
  dimension("independent-problem-evidence", 0, 25, ["evidence/market-snapshot-2026-07-15.json"], "Collect reproducible external environment-drift cases."),
  dimension("verified-adoption", 2, 25, ["https://www.npmjs.com/package/aienvmap", "https://github.com/soovwv/aienvmap"], "Verify successful use without treating downloads as users."),
  dimension("outcome-evidence", 0, 25, ["CASE_REVIEW.md"], "Obtain independent before/after or no-change outcome verification."),
  dimension("retention-and-contribution", 0, 25, ["https://github.com/soovwv/aienvmap"], "Observe repeat use or an external contribution.")
];

const releaseAxes = [
  releaseAxis("coreFeatureCompleteness", 92, 90, ["aienvmap start --json", "aienvmap reconcile --json", "aienvmap sbom --json"]),
  releaseAxis("stabilityAndTesting", 94, 90, ["npm run release:check", ".github/workflows/ci.yml", "VALIDATION.md", "test/fsutil.test.js#independent-process-cas", "test/temp-hygiene.test.js", "test/windows-launcher-guidance.test.js"]),
  releaseAxis("lightweight", 93, 90, ["package.json#dependencies", "npm run pack:install-check", "src/performance-budget.js"]),
  releaseAxis("aiUsability", 92, 90, ["README.md#10-second-use", "src/ai-decision-envelope.js", "test/ai-decision-envelope.test.js", "aienvmap schema --json"], "One compact envelope now supplies an evidence-backed action, bounded user question, explicit non-authority, and next safe command without adding another command.", "Real automatic pickup still needs host-specific external proof."),
  releaseAxis("differentiation", 91, 90, ["MARKET.md#competitive-position", "aienvmap schema --json", "examples/ai-workspace-case-study.md"], "The machine-readable unique job, choose-instead map, and composition order distinguish observation and handoff from installation, activation, context packaging, and full scanning.", "Independent users must still prove that this combined workflow is valuable in practice."),
  releaseAxis("marketReadiness", 73, 70, ["AI_TESTING.md", "TESTER_INVITE.md", ".apm/skills/aienvmap/SKILL.md"])
];

const adjacentAlternatives = [
  alternative("Microsoft APM", "agent context dependency management", "APM declares, locks, audits, governs, and exports SBOMs for agent context; aienvmap supplies observed host runtime and coordination evidence", "https://github.com/microsoft/apm"),
  alternative("mise", "runtime, tool, task, and config-trust management", "mise exposes managed tools and environment data to AI through MCP; aienvmap observes mixed active routing and coordinates changes without trusting config, installing, or switching tools", "https://mise.jdx.dev/"),
  alternative("asdf", "extensible multi-runtime version management", "asdf selects declared tool versions; aienvmap observes active and duplicate routes without installing or switching them", "https://asdf-vm.com/"),
  alternative("envinfo", "active development environment reporting", "envinfo quickly reports common active binaries and system details; aienvmap adds bounded multi-path evidence, AI decisions, and change handoff", "https://github.com/tabrindle/envinfo"),
  alternative("Devbox", "isolated reproducible development environments", "Devbox creates a declared portable environment; aienvmap observes mixed existing installations without replacing the shell", "https://github.com/jetify-com/devbox"),
  alternative("Flox", "declared reusable development environments", "Flox aligns humans and AI on an activated reproducible environment; aienvmap maps and coordinates the non-clean host state already present", "https://github.com/flox/flox"),
  alternative("Dev Containers", "containerized development environment construction", "Dev Containers defines and runs a structured container environment; aienvmap observes an existing host and shared change intent without requiring a container", "https://containers.dev/"),
  alternative("Renovate", "automated dependency updates", "aienvmap coordinates AI intent and environment evidence before and after changes", "https://docs.renovatebot.com/"),
  alternative("Syft", "full software inventory and SBOM generation", "aienvmap provides a light manifest view and imports external evidence", "https://github.com/anchore/syft"),
  alternative("Trivy", "vulnerability, secret, misconfiguration, license, and SBOM scanning", "aienvmap does not maintain security databases and should preserve Trivy output as external provenance-labelled evidence", "https://trivy.dev/"),
  alternative("GitHub Copilot repository instructions", "static repository and agent guidance", "instruction files provide conventions and build guidance; aienvmap adds generated host evidence, pending intent, and handoff state", "https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions"),
  alternative("CycloneDX", "SBOM standard and ecosystem", "aienvmap emits a lite projection and interoperates with richer artifacts", "https://cyclonedx.org/capabilities/sbom/")
];

const capabilityAssessment = [
  capability("existing-environment-observation", 91, 94, ["src/package-managers.js", "test/reconcile.test.js"], "Strong mixed-host and multi-path evidence; more independent manager combinations remain."),
  capability("multi-ai-handoff", 90, 95, ["test/demo.test.js", "test/fsutil.test.js"], "Intent, checkpoint, handoff, leases, and compare-and-swap are implemented; external multi-user proof remains."),
  capability("usability", 82, 92, ["src/commands/start.js", "src/commands/status.js", "test/start.test.js"], "Default output is compact and action-first; unfamiliar-user completion evidence remains limited."),
  capability("interoperability", 81, 90, ["src/project-expectations.js", "src/version-constraint.js", "src/sbom-evidence.js"], "Multiple declaration sources and environment-definition summaries remain visible without activation; more real tool combinations remain."),
  capability("distribution-and-adoption", 74, 88, ["action.yml", "scripts/installed-package-check.mjs", ".apm/skills/aienvmap/SKILL.md"], "npm, GitHub Action, and bounded skill distribution exist; host pickup, first-run conversion, and retention are unverified."),
  capability("imitation-resistance", 60, 78, ["contracts/ai-json-root-fields.v1.json", "test/project-expectations.test.js", "test/version-constraint.test.js"], "Stable contracts, multi-source declaration conflict evidence, coordination semantics, and fixtures raise replication cost, but ecosystem and independent case data remain small."),
  capability("lightweight-operation", 96, 96, ["package.json", "src/performance-budget.js"], "Zero runtime dependencies and enforced performance budgets are at target."),
  capability("security-sbom-depth", 43, 55, ["src/sbom-evidence.js", "README.md"], "Intentionally lightweight and scanner-complementary; the target does not imply building a vulnerability database.")
];

export function productScorecard() {
  const technical = category("technicalReadiness", technicalDimensions);
  const marketReadiness = category("marketReadiness", marketReadinessDimensions);
  const marketValidation = category("marketValidation", marketValidationDimensions);
  const overall = Math.round(technical.score * 0.7 + marketReadiness.score * 0.3);
  const releaseAssessment = {
    target: releaseState.version,
    releaseStatus: releaseState.status,
    qualified: releaseAxes.every((axis) => axis.pass),
    qualificationScope: "published code-and-repository release",
    publishReady: false,
    publishEligibility: "not-applicable-already-published",
    publishBlockers: [],
    releaseEvidence: publishedReleaseEvidence(),
    axes: releaseAxes,
    rule: "Every code-quality axis must meet its threshold. Published engineering integrity and independent market validation remain separate."
  };
  return {
    schemaName: "aienvmap-product-scorecard",
    schemaVersion: 1,
    status: "evidence-limited",
    overall: { score: overall, maximum: 100, confidence: "medium", weights: { technicalReadiness: 0.7, marketReadiness: 0.3 }, excludes: ["marketValidation"] },
    technicalReadiness: technical,
    marketReadiness,
    marketValidation,
    releaseAssessment,
    capabilityAssessment: {
      observedAt: "2026-08-15",
      basis: "Repository capability evidence only; these scores do not measure adoption, retention, or product-market fit.",
      dimensions: capabilityAssessment,
      rule: "Raise implementation scores only with cited regression evidence and raise market validation only with independent outcomes."
    },
    positioning: "Cross-host local environment evidence and explicit change handoff for coding agents; not a package manager, vulnerability scanner, or full SBOM generator.",
    marketResearch: {
      report: "MARKET.md",
      observedAt: "2026-08-15",
      snapshot: "evidence/market-snapshot-2026-08-15.json",
      publicSignals: { githubStars: 0, githubForks: 0, publicEnvironmentSubmissions: 2, independentOutcomeVerifiedCases: 0, npmDownloadsWindow: { requests: 586, start: "2026-07-11", end: "2026-08-09" } },
      adjacentSignals: { observedAt: "2026-08-15", microsoftApmStars: 3540, microsoftApmRelease: "v0.28.0", devboxStars: 12272, devboxRelease: "0.17.5", floxStars: 4090, floxRelease: "v1.14.1", miseStars: 32422, miseRelease: "v2026.8.6", syftStars: 9400, syftRelease: "v1.51.0", envinfoStars: 793, envinfoRelease: "v7.22.0" },
      interpretation: "npm downloads are requests, not unique users, retention, successful setups, or recommendation evidence.",
      scoreImpact: "none until independent outcome-verified evidence exists"
    },
    adjacentAlternatives,
    strengths: ["zero-runtime-dependency local operation", "AI-readable environment and decision contracts", "read-only multi-install discovery", "bounded APM skill distribution with consumer-install regression coverage", "light SBOM interoperability", "explicit approval boundaries"],
    weaknesses: ["limited independent adoption evidence", "few external case studies", "coordination value depends on participating agents consuming a pointer, skill, or explicit fallback prompt", "AI-host automatic skill pickup remains unverified", "cross-user versions require owning-user verification", "third-party runtime version probes cannot guarantee side-effect-free executables", "adjacent tools increasingly combine AI context, agent worktrees, runtime setup, and reproducible environments"],
    nextPriorities: [
      { priority: 1, outcome: "external problem evidence", proof: "at least five public submissions before case promotion, with independent outcome maturity classified separately and one shared-server owner-verified report" },
      { priority: 2, outcome: "AI-host integration evidence", proof: "verified automatic-pickup and fallback examples for major coding-agent hosts" },
      { priority: 3, outcome: "release authentication maintenance", proof: "npm trusted publishing remains the only supported release path and provenance stays registry-verifiable" }
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

function capability(id, current, target, evidence, remainingGap) {
  return { id, current, target, evidence, remainingGap };
}

function releaseAxis(id, score, threshold, evidence, rationale = "", remainingGap = "") {
  return { id, score, threshold, pass: score >= threshold, evidence, ...(rationale ? { rationale } : {}), ...(remainingGap ? { remainingGap } : {}) };
}
