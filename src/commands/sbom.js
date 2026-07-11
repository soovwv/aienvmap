import { sbomReadOrder } from "../ai-contract.js";
import { readJson, writeJson } from "../fsutil.js";
import fs from "node:fs/promises";
import { cyclonedxSbomPath, externalSbomEvidencePath, manifestPath, sbomJsonPath, workspaceDir } from "../paths.js";
import { compareSbomEvidence, importSbomEvidence, verifySbomEvidence } from "../sbom-evidence.js";

export async function sbomWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  if (args.import && args.clear_import) throw new Error("use either --import or --clear-import, not both");
  if (args.clear_import && !args.write) throw new Error("--clear-import requires --write");
  const evidenceFile = externalSbomEvidencePath(dir);
  if (args.clear_import) await fs.rm(evidenceFile, { force: true });
  const previousEvidence = !args.clear_import ? await readJson(evidenceFile, null) : null;
  const imported = args.import ? await importSbomEvidence(dir, args.import) : null;
  const importedEvidence = imported ? {
    ...imported,
    baselineDigest: previousEvidence?.digest || "",
    baselineDrift: compareSbomEvidence(previousEvidence || {}, imported)
  } : null;
  if (importedEvidence && args.write) await writeJson(evidenceFile, importedEvidence);
  const persistedEvidence = importedEvidence || previousEvidence;
  const externalEvidence = importedEvidence || (persistedEvidence ? await verifySbomEvidence(dir, persistedEvidence) : null) || noExternalEvidence();
  const format = normalizeFormat(args.format);
  const sbom = format === "cyclonedx-lite" ? buildCycloneDxLite(manifest, externalEvidence) : buildSbomArtifact(manifest, externalEvidence);
  const artifact = args.write ? await writeSbomArtifact(dir, sbom, format) : "";
  const output = artifact ? { ...sbom, artifact } : sbom;
  if (args.json || args.write || args.quiet) {
    if (args.json) console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`sbom: ${sbom.riskSummary.level}/${sbom.riskSummary.score}`);
    console.log(`packages: ${sbom.summary.packages || 0}`);
    console.log(`vulnerabilities: ${sbom.summary.vulnerabilities || 0}`);
    console.log(`external evidence: ${externalEvidence.status}${externalEvidence.format ? ` / ${externalEvidence.format}` : ""}`);
    console.log(`dependency: ${sbom.dependencyQuickCheck.status} / ${sbom.dependencyQuickCheck.scannerEvidence}`);
    console.log(`next: ${sbom.dependencyQuickCheck.nextCommand || sbom.riskSummary.next || sbom.nextSafeCommand}`);
  }
  return output;
}

export function buildSbomArtifact(manifest = {}, externalEvidence = noExternalEvidence()) {
  const lightSbom = manifest.lightSbom || {};
  const dependencyReview = lightSbom.aiDependencyReview || aiDependencyReview(lightSbom);
  const nextSafeCommand = dependencyReview.beforeDependencyChange?.[0]
    || lightSbom.riskSummary?.commands?.[0]
    || "aienvmap context --json";
  const aiBootstrap = sbomBootstrap(nextSafeCommand, dependencyReview);
  const scannerGuidance = sbomScannerGuidance(dependencyReview);
  const aiReviewPlan = sbomReviewPlan(lightSbom, dependencyReview, nextSafeCommand);
  const dependencyCoordination = sbomDependencyCoordination(dependencyReview, scannerGuidance, nextSafeCommand);
  const dependencyQuickCheck = sbomDependencyQuickCheck(dependencyReview, dependencyCoordination, scannerGuidance, nextSafeCommand);
  return {
    schemaVersion: 1,
    schemaName: "aienvmap.light-sbom",
    generatedAt: manifest.generatedAt || "",
    workspace: manifest.workspace || {},
    startHere: ".aienvmap/README.md",
    readOrder: sbomReadOrder,
    mode: lightSbom.mode || "light-sbom",
    source: lightSbom.source || {},
    confidence: lightSbom.confidence || {},
    limitations: lightSbom.limitations || [],
    summary: lightSbom.summary || { packages: 0, vulnerabilities: 0 },
    riskSummary: lightSbom.riskSummary || { level: "clear", score: 0, signals: [], commands: [] },
    topRisk: (lightSbom.topRisk || []).slice(0, 20),
    packageManagerPolicy: lightSbom.packageManagerPolicy || {},
    dependencyChangeHints: (lightSbom.dependencyChangeHints || []).slice(0, 20),
    aiBootstrap,
    nextSafeCommand,
    scannerGuidance,
    aiReviewPlan,
    dependencyCoordination,
    dependencyQuickCheck,
    externalEvidence,
    externalEvidenceDecision: externalEvidenceDecision(externalEvidence),
    aiDependencyReview: dependencyReview,
    aiUse: {
      purpose: "Standalone AI-readable light SBOM artifact.",
      readBefore: "Dependency changes, vulnerability remediation, release review, or shared AI handoff.",
      decision: dependencyReview.status || "ready",
      securityConfidence: dependencyReview.securityConfidence || "unknown",
      readFirst: sbomReadOrder,
      nextCommand: nextSafeCommand,
      scannerCommand: scannerGuidance.scannerCommand,
      externalEvidence: externalEvidenceDecision(externalEvidence),
      beforeChange: nextSafeCommand,
      afterChange: dependencyReview.afterDependencyChange?.slice(-1)[0] || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
      mustNotDo: dependencyQuickCheck.mustNotDo,
      rule: scannerGuidance.rule
    }
  };
}

function noExternalEvidence() {
  return {
    status: "not-imported",
    mode: "summary-reference",
    securityEvidence: "none",
    removalAuthorized: false,
    rule: "Import an existing workspace-local CycloneDX/SPDX JSON file explicitly; aienvmap never installs or runs its generator."
  };
}

function externalEvidenceDecision(evidence = {}) {
  const imported = evidence.status === "imported";
  const stale = evidence.status === "stale";
  const drifted = imported && evidence.baselineDrift?.status === "changed";
  return {
    decision: drifted ? "component-drift-review" : imported ? "read-original-before-claims" : stale ? "refresh-import-required" : "no-external-evidence",
    artifact: imported || stale ? evidence.artifact : "",
    digest: imported || stale ? evidence.digest : "",
    format: imported || stale ? evidence.format : "",
    securityEvidence: evidence.securityEvidence || "none",
    baselineDrift: evidence.baselineDrift || { status: "baseline-unavailable", comparable: false },
    nextCommand: imported ? `review ${evidence.artifact}` : stale ? `aienvmap sbom --import ${evidence.artifact} --write` : "aienvmap sbom --import <workspace-sbom.json> --write",
    rule: imported
      ? "Use this summary for coordination only; read and validate the original external SBOM before security, compliance, remediation, or release claims."
      : stale
        ? "The source changed or became unavailable after import; explicitly review and re-import before relying on it."
      : "External evidence is optional and must be generated outside aienvmap before explicit import."
  };
}

function sbomDependencyQuickCheck(review = {}, coordination = {}, scannerGuidance = {}, nextSafeCommand = "aienvmap context --json") {
  const status = review.status === "review" || scannerGuidance.decision === "run-scanner-before-security-work" ? "review" : "ready";
  const targets = (review.reviewTargets || coordination.reviewTargets || []).slice(0, 5);
  return {
    status,
    purpose: "10-second AI check before dependency, lockfile, package manager, security, or release-affecting dependency work.",
    readFirst: sbomReadOrder,
    nextCommand: nextSafeCommand,
    reviewTargets: targets,
    scannerEvidence: scannerGuidance.decision || "light-sbom-ok-for-coordination",
    beforeChange: (coordination.beforeChange || review.beforeDependencyChange || [nextSafeCommand]).slice(0, 3),
    afterChange: (coordination.afterChange || review.afterDependencyChange || ["aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"]).slice(-2),
    mustNotDo: (coordination.mustNotDo || [
      "do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status",
      "do not switch package managers only because another AI prefers one",
      "do not make security claims from the light SBOM alone when scanner confidence is low"
    ]).slice(0, 3),
    rule: "Use this compact block as the first AI dependency-work decision; it is advisory and does not replace full scanner evidence."
  };
}

function sbomDependencyCoordination(review = {}, scannerGuidance = {}, nextSafeCommand = "aienvmap context --json") {
  return {
    mode: "advisory",
    appliesWhen: "Before dependency, lockfile, vulnerability remediation, package manager, or release-affecting dependency work.",
    readFirst: sbomReadOrder,
    reviewTargets: (review.reviewTargets || []).slice(0, 8),
    nextCommand: nextSafeCommand,
    beforeChange: review.beforeDependencyChange || [nextSafeCommand],
    afterChange: review.afterDependencyChange || [
      "run the narrowest relevant project validation",
      "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
    ],
    mustNotDo: [
      "do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status",
      "do not switch package managers only because another AI prefers one",
      "do not make security claims from the light SBOM alone when scanner confidence is low"
    ],
    scannerEvidence: scannerGuidance.decision || "light-sbom-ok-for-coordination",
    rule: "Use the light SBOM to coordinate dependency work; record intent before dependency or lockfile changes, use optional scanners for security evidence, then checkpoint and hand off."
  };
}

function sbomScannerGuidance(review = {}) {
  const confidence = review.securityConfidence || "unknown";
  const lowConfidence = ["scanner-off", "unknown", "not-scanned"].includes(confidence);
  return {
    mode: "optional-read-only",
    decision: lowConfidence ? "run-scanner-before-security-work" : "light-sbom-ok-for-coordination",
    reason: lowConfidence
      ? "Scanner confidence is low, so security claims, remediation, releases, and risky dependency changes need read-only scanner evidence."
      : "Scanner summary is present; the light SBOM is enough for coordination unless findings changed or a human asks for fresh evidence.",
    defaultCommand: "aienvmap sbom --json",
    scannerCommand: "aienvmap sync --security",
    securityConfidence: confidence,
    useLightSbomFor: ["AI environment coordination", "dependency read set", "package manager policy", "intent and handoff planning"],
    requireScannerFor: ["security claims", "vulnerability remediation", "release decisions", "dependency changes when scanner confidence is low"],
    externalTools: externalSbomTools(),
    evidenceWorkflow: [
      "Read .aienvmap/discovery.json, .aienvmap/sbom.json, .aienvmap/status.json, and aienvmap context --json first.",
      "Use the light SBOM for coordination and dependency read set only.",
      "Run a dedicated scanner such as Syft, Trivy, Grype, Dependency-Track, npm audit, or pip-audit only when security confidence matters.",
      "Record intent before dependency or lockfile remediation.",
      "Checkpoint and hand off after accepted dependency or security changes."
    ],
    interoperabilityRule: "Use aienvmap as the AI coordination layer and use dedicated SBOM or security scanners for full evidence. Do not install or run external tools automatically unless the user, CI, or release process asks.",
    whenToRun: lowConfidence
      ? [
        "before security claims",
        "before vulnerability remediation",
        "before release decisions",
        "before dependency changes when scanner confidence is low"
      ]
      : [
        "when security findings changed",
        "before release decisions",
        "when a human or CI asks for fresh scanner evidence"
      ],
    rule: "Keep the default SBOM lightweight for AI coordination; use optional read-only scanners only when security confidence matters."
  };
}

function externalSbomTools() {
  return [
    {
      tool: "syft",
      category: "full-sbom",
      command: "syft dir:. -o cyclonedx-json",
      useWhen: "full SBOM generation is required",
      aienvmapRole: "keep AI coordination fields, intent, handoff, and local env context beside the full SBOM"
    },
    {
      tool: "trivy",
      category: "vulnerability-scan",
      command: "trivy fs --format cyclonedx .",
      useWhen: "security scan evidence is needed before release or remediation",
      aienvmapRole: "use scanner evidence to raise security confidence before security claims"
    },
    {
      tool: "grype",
      category: "vulnerability-match",
      command: "grype dir:.",
      useWhen: "CVE matching is needed against the filesystem or a generated SBOM",
      aienvmapRole: "record the dependency intent and checkpoint the environment decision around remediation"
    },
    {
      tool: "dependency-track",
      category: "continuous-sbom-risk",
      command: "upload CycloneDX SBOM to Dependency-Track",
      useWhen: "continuous component analysis or governance is required",
      aienvmapRole: "keep local AI workspace coordination separate from long-running governance"
    }
  ];
}

function sbomBootstrap(nextSafeCommand, review = {}) {
  const reviewCommand = review.beforeDependencyChange?.[0];
  return {
    purpose: "Shortest AI entry point for dependency and SBOM review.",
    readFirst: ".aienvmap/sbom.json",
    detailCommand: "aienvmap context --json",
    nextSafeCommand,
    nextSafeCommandSource: reviewCommand && nextSafeCommand === reviewCommand ? "dependency-review" : "sbom-risk",
    nextSafeCommandReason: review.status === "review"
      ? "SBOM risk or package manager policy requires review before dependency changes."
      : "No blocking SBOM signal is present; record intent before dependency or lockfile changes.",
    localMode: "advisory",
    projectLocalWork: "allowed",
    environmentChanges: review.status === "review" ? "review-first" : "intent-first",
    rule: review.rule || "Read SBOM risk first; record intent before dependency or lockfile changes."
  };
}

function sbomReviewPlan(lightSbom = {}, review = {}, nextSafeCommand = "aienvmap context --json") {
  const risk = lightSbom.riskSummary || {};
  const policy = lightSbom.packageManagerPolicy || {};
  const summary = lightSbom.summary || {};
  return {
    status: review.status || "ready",
    risk: `${risk.level || "clear"}/${risk.score || 0}`,
    securityConfidence: review.securityConfidence || "unknown",
    packageManagerPolicy: policy.status || "not-detected",
    packages: Number(summary.packages || 0),
    vulnerabilities: Number(summary.vulnerabilities || 0),
    reviewTargets: (review.reviewTargets || risk.reviewTargets || []).slice(0, 8),
    beforeChange: nextSafeCommand,
    afterChange: review.afterDependencyChange?.slice(-1)[0] || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
    rule: review.status === "review"
      ? "Review SBOM risk and package manager policy before dependency changes."
      : "Record dependency intent before dependency or lockfile changes; security claims still need scanner verification."
  };
}

function aiDependencyReview(lightSbom = {}) {
  const risk = lightSbom.riskSummary || {};
  const hints = lightSbom.dependencyChangeHints || [];
  const policy = lightSbom.packageManagerPolicy || {};
  const level = risk.level || "clear";
  const reviewTargets = (risk.reviewTargets || []).length
    ? risk.reviewTargets
    : hints.map((item) => item.manifest).filter(Boolean);
  const review = ["urgent", "high", "medium"].includes(level) || policy.status === "review-required";
  const scannerOff = risk.scanner === "off" || lightSbom.source?.vulnerabilities === "not scanned" || lightSbom.confidence?.vulnerabilities === "not-scanned";
  return {
    status: review ? "review" : "ready",
    statusReason: review
      ? "SBOM risk or package manager policy requires dependency review before changes."
      : scannerOff
        ? "No scanned vulnerability finding is present because the security scanner is off; run read-only security scan before security decisions."
        : "No light SBOM signal requires dependency review.",
    securityConfidence: scannerOff ? "scanner-off" : "scanner-summary",
    mode: "advisory",
    readFirst: ["riskSummary", "dependencyChangeHints", "packageManagerPolicy", "topRisk"],
    reviewTargets: [...new Set(reviewTargets)].slice(0, 8),
    safeActions: [
      "read SBOM, status, summary, context, and dependency manifests before dependency changes",
      "plan remediation without installing, upgrading, downgrading, or switching package managers",
      "record intent before dependency or lockfile changes when another AI may be working"
    ],
    beforeDependencyChange: uniqueCommands([
      ...planningCommands(risk.commands || []),
      "aienvmap intent --actor agent:id --action dependency-review --target dependency",
      "aienvmap plan --write"
    ]),
    afterDependencyChange: [
      "run the narrowest relevant project validation",
      "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
    ],
    rule: review
      ? "Review SBOM risk and package manager policy before dependency changes; default behavior is advisory and non-blocking."
      : "No light SBOM signal requires action; still record intent before dependency or lockfile changes."
  };
}

export async function writeSbomArtifact(dir, sbom) {
  const out = sbom.bomFormat === "CycloneDX" ? cyclonedxSbomPath(dir) : sbomJsonPath(dir);
  await writeJson(out, sbom);
  return out;
}

export function buildCycloneDxLite(manifest = {}, externalEvidence = noExternalEvidence()) {
  const snapshot = manifest.dependencySnapshot || {};
  const packages = snapshot.packages || [];
  const lightSbom = manifest.lightSbom || {};
  const dependencyReview = lightSbom.aiDependencyReview || aiDependencyReview(lightSbom);
  const nextSafeCommand = dependencyReview.beforeDependencyChange?.[0]
    || lightSbom.riskSummary?.commands?.[0]
    || "aienvmap context --json";
  const aiBootstrap = sbomBootstrap(nextSafeCommand, dependencyReview);
  const scannerGuidance = sbomScannerGuidance(dependencyReview);
  const dependencyCoordination = sbomDependencyCoordination(dependencyReview, scannerGuidance, nextSafeCommand);
  const dependencyQuickCheck = sbomDependencyQuickCheck(dependencyReview, dependencyCoordination, scannerGuidance, nextSafeCommand);
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:aienvmap-${hashText(`${manifest.workspace?.path || ""}:${manifest.generatedAt || ""}`)}`,
    version: 1,
    metadata: {
      timestamp: manifest.generatedAt || "",
      tools: {
        components: [{
          type: "application",
          name: "aienvmap",
          version: manifest.generatedBy?.version || "unknown"
        }]
      },
      component: {
        type: "application",
        name: manifest.workspace?.name || "workspace",
        bomRef: "workspace"
      },
      properties: [
        { name: "aienvmap:format", value: "cyclonedx-lite" },
        { name: "aienvmap:source", value: lightSbom.source?.dependencies || "project manifests" },
        { name: "aienvmap:confidence:transitiveDependencies", value: lightSbom.confidence?.transitiveDependencies || "not-resolved" },
        { name: "aienvmap:risk:level", value: lightSbom.riskSummary?.level || "clear" },
        { name: "aienvmap:risk:score", value: String(lightSbom.riskSummary?.score || 0) },
        { name: "aienvmap:startHere", value: ".aienvmap/README.md" },
        { name: "aienvmap:readOrder", value: sbomReadOrder.join(" -> ") },
        { name: "aienvmap:aiBootstrap:readFirst", value: aiBootstrap.readFirst },
        { name: "aienvmap:aiBootstrap:detailCommand", value: aiBootstrap.detailCommand },
        { name: "aienvmap:aiBootstrap:nextSafeCommand", value: aiBootstrap.nextSafeCommand },
        { name: "aienvmap:aiBootstrap:nextSafeCommandSource", value: aiBootstrap.nextSafeCommandSource },
        { name: "aienvmap:aiBootstrap:nextSafeCommandReason", value: aiBootstrap.nextSafeCommandReason },
        { name: "aienvmap:aiBootstrap:localMode", value: aiBootstrap.localMode },
        { name: "aienvmap:aiBootstrap:environmentChanges", value: aiBootstrap.environmentChanges }
      ]
    },
    components: packages.slice(0, 200).map(cycloneComponent),
    vulnerabilities: (lightSbom.topRisk || []).slice(0, 50).map(cycloneVulnerability),
    properties: [
      { name: "aienvmap:limitation", value: "Light SBOM from project manifests only; no install or dependency resolver was run." },
      { name: "aienvmap:verifyWith", value: "CycloneDX, Syft, Trivy, npm audit, pip-audit, or another dedicated scanner before security claims." },
      { name: "aienvmap:scannerGuidance:mode", value: scannerGuidance.mode },
      { name: "aienvmap:scannerGuidance:command", value: scannerGuidance.scannerCommand },
      { name: "aienvmap:scannerGuidance:externalTools", value: scannerGuidance.externalTools.map((tool) => tool.tool).join(",") },
      { name: "aienvmap:scannerGuidance:evidenceWorkflow", value: scannerGuidance.evidenceWorkflow.join(" -> ") },
      { name: "aienvmap:scannerGuidance:interoperabilityRule", value: scannerGuidance.interoperabilityRule },
      { name: "aienvmap:scannerGuidance:rule", value: scannerGuidance.rule },
      { name: "aienvmap:dependencyCoordination:nextCommand", value: dependencyCoordination.nextCommand },
      { name: "aienvmap:dependencyCoordination:rule", value: dependencyCoordination.rule },
      { name: "aienvmap:dependencyQuickCheck:status", value: dependencyQuickCheck.status },
      { name: "aienvmap:dependencyQuickCheck:nextCommand", value: dependencyQuickCheck.nextCommand },
      { name: "aienvmap:dependencyQuickCheck:scannerEvidence", value: dependencyQuickCheck.scannerEvidence },
      { name: "aienvmap:externalEvidence:status", value: externalEvidence.status || "not-imported" },
      { name: "aienvmap:externalEvidence:verification", value: externalEvidence.verification || "not-imported" },
      { name: "aienvmap:externalEvidence:artifact", value: externalEvidence.artifact || "" },
      { name: "aienvmap:externalEvidence:digest", value: externalEvidence.digest || "" },
      { name: "aienvmap:externalEvidence:currentDigest", value: externalEvidence.currentDigest || "" },
      { name: "aienvmap:externalEvidence:format", value: externalEvidence.format || "" },
      { name: "aienvmap:externalEvidence:specVersion", value: externalEvidence.specVersion || "" },
      { name: "aienvmap:externalEvidence:summary", value: JSON.stringify(externalEvidence.summary || {}) },
      { name: "aienvmap:externalEvidence:baselineDrift", value: JSON.stringify(externalEvidence.baselineDrift || {}) },
      { name: "aienvmap:aiBootstrap:rule", value: aiBootstrap.rule }
    ]
  };
}

function cycloneComponent(pkg = {}) {
  const version = String(pkg.version || "unspecified");
  return {
    type: "library",
    name: pkg.name || "unknown",
    version,
    purl: packageUrl(pkg, version),
    bomRef: `${pkg.ecosystem || "pkg"}:${pkg.name || "unknown"}@${version}`,
    properties: [
      { name: "aienvmap:ecosystem", value: pkg.ecosystem || "unknown" },
      { name: "aienvmap:manager", value: pkg.manager || "unknown" },
      { name: "aienvmap:manifest", value: pkg.manifest || "" },
      { name: "aienvmap:group", value: pkg.group || "" }
    ]
  };
}

function cycloneVulnerability(pkg = {}) {
  return {
    id: pkg.name || "unknown",
    source: { name: "aienvmap-light-sbom" },
    ratings: [{ severity: pkg.severity || "unknown" }],
    affects: [{
      ref: `${pkg.ecosystem || "pkg"}:${pkg.name || "unknown"}@${pkg.version || "unspecified"}`
    }],
    properties: [
      { name: "aienvmap:priority", value: pkg.priority || "low" },
      { name: "aienvmap:score", value: String(pkg.score || 0) },
      { name: "aienvmap:directDependency", value: String(pkg.directDependency === true) },
      { name: "aienvmap:manifest", value: pkg.manifest || "" }
    ]
  };
}

function packageUrl(pkg = {}, version = "") {
  const type = pkg.ecosystem === "python" ? "pypi" : "npm";
  return `pkg:${type}/${encodeURIComponent(pkg.name || "unknown")}@${encodeURIComponent(version)}`;
}

function normalizeFormat(format = "") {
  const value = String(format || "aienvmap").toLowerCase();
  if (["cyclonedx", "cyclonedx-lite", "cdx"].includes(value)) return "cyclonedx-lite";
  return "aienvmap";
}

function uniqueCommands(commands = []) {
  return [...new Set(commands.filter(Boolean))];
}

function planningCommands(commands = []) {
  return commands.filter((command) => !String(command).includes(" checkpoint "));
}

function hashText(text = "") {
  let hash = 0;
  for (const ch of String(text)) hash = ((hash << 5) - hash + ch.charCodeAt(0)) >>> 0;
  return `${hash.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
}
