import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { dashWorkspace, dashboardOpenCommand, openDashboardFile } from "../src/commands/dash.js";
import { writeJson } from "../src/fsutil.js";
import { dashboardAgentClientScript, dashboardAiUseClientScript, dashboardAiUseHtmlClientScript, dashboardCardClientScript, dashboardCardPriority, dashboardDependencyCoordinationClientScript, dashboardDependencyHintsClientScript, dashboardDependencyProtocolClientScript, dashboardDependencyReadSetClientScript, dashboardDependencyReviewClientScript, dashboardDiscoveryFallback, dashboardDiscoveryFallbackClientScript, dashboardDocument, dashboardEnvironmentProtocolClientScript, dashboardEssentialCards, dashboardEssentialSurfaceClientScript, dashboardEssentialSurfaces, dashboardLayoutClientScripts, dashboardMainCardsClientScript, dashboardOperationalCardsClientScript, dashboardPayload, dashboardQualityDefaults, dashboardReleaseClientScripts, dashboardReleaseDefaults, dashboardStyle, dashboardSurfaceBudget, dashboardPackageManagerPolicyClientScript, dashboardPriorityClientScript, dashboardQualitySignalsClientScript, dashboardReleaseReadinessClientScript, dashboardReviewPlanClientScript, dashboardReviewPlanHtmlClientScript, dashboardRiskSummaryClientScript, dashboardSbomClientScripts, dashboardScannerGuidanceClientScript, dashboardScannerGuidanceHtmlClientScript, dashboardStateCardsClientScript, dashboardSupportCardsClientScript, renderDashboard } from "../src/render.js";

test("dashboardPayload centralizes schema-backed dashboard data", () => {
  const payload = dashboardPayload(
    { workspace: { name: "sample" }, preflight: {} },
    [{ type: "record" }],
    [{ message: "review" }],
    [{ actor: "agent:codex" }],
    { node: "24" }
  );

  assert.equal(payload.manifest.workspace.name, "sample");
  assert.equal(payload.timeline.length, 1);
  assert.equal(payload.warnings.length, 1);
  assert.equal(payload.intents.length, 1);
  assert.equal(payload.policy.node, "24");
  assert.equal(payload.releaseReadiness.target, "0.2.0");
  assert.equal(payload.schemaQualitySignals.status, "release-candidate");
  assert.equal(payload.schemaAiAdoptionDecision.proofCommand, "aienvmap demo --json");
  assert.match(payload.schemaAiAdoptionDecision.position, /Environment map and explicit change handoff/);
  assert.equal(payload.schemaAgentDiscovery.sessionUse.decisionField, "aiDiscovery.decision");
  assert.equal(payload.schemaAgentDiscovery.sessionUse.fallbackPromptField, "copyPastePrompt");
});

test("dashboardDocument wraps escaped payload and client script", () => {
  const html = dashboardDocument('{"name":"<sample>"}', "window.__aienvmap=true;");

  assert.match(html, /<!doctype html>/);
  assert.match(html, /<main class="shell" id="app"><\/main>/);
  assert.match(html, /\{"name":"&lt;sample&gt;"\}/);
  assert.match(html, /window\.__aienvmap=true;/);
  assert.match(html, /<\/html>$/);
});

test("dashboardStyle keeps essential dashboard surfaces responsive", () => {
  const css = dashboardStyle();

  assert.match(css, /:root\{color-scheme:dark/);
  assert.match(css, /\.control\{/);
  assert.match(css, /\.cockpit-grid\{/);
  assert.match(css, /\.brief\{/);
  assert.match(css, /\.card\.essential/);
  assert.match(css, /@media \(max-width:520px\)/);
});

test("dashboardCardClientScript keeps card priority markup centralized", () => {
  const script = dashboardCardClientScript();

  assert.match(script, /function card\(/);
  assert.match(script, /cardPriority\(title\)/);
  assert.match(script, /data-dashboard-priority/);
  assert.match(script, /card-head/);
});

test("dashboard card helpers are hoisted before generated card groups execute", () => {
  const script = [
    "const releaseReadiness={target:'0.2.0'};",
    "const qualitySignals={status:'ready'};",
    "const ciHasFailure=false;",
    "const enforcementHtml='';",
    "const releaseReadinessHtml='';",
    "const qualitySignalsHtml='';",
    "const ciReadinessHtml='';",
    "const esc=value=>String(value);",
    dashboardOperationalCardsClientScript(),
    dashboardPriorityClientScript(),
    dashboardCardClientScript(),
    "return operationalCardsHtml;"
  ].join("\n");

  const html = new Function(script)();
  assert.match(html, /Enforcement Mode/);
  assert.match(html, /Release Readiness/);
});

test("dashboardMainCardsClientScript keeps main grid cards data-driven", () => {
  const script = dashboardMainCardsClientScript();

  assert.match(script, /const mainCards=\[/);
  assert.match(script, /'Runtimes'/);
  assert.match(script, /'Dependency Snapshot'/);
  assert.match(script, /'Light SBOM'/);
  assert.match(script, /'Security Summary'/);
  assert.match(script, /const mainCardsHtml=mainCards\.map/);
});

test("dashboardOperationalCardsClientScript groups release and enforcement cards", () => {
  const script = dashboardOperationalCardsClientScript();

  assert.match(script, /const operationalCards=\[/);
  assert.match(script, /'Enforcement Mode'/);
  assert.match(script, /'Release Readiness'/);
  assert.match(script, /'Quality Signals'/);
  assert.match(script, /'CI Readiness'/);
  assert.match(script, /const operationalCardsHtml=operationalCards\.map/);
});

test("dashboardSupportCardsClientScript groups secondary side cards", () => {
  const script = dashboardSupportCardsClientScript();

  assert.match(script, /const supportCards=\[/);
  assert.match(script, /'Recommended Actions'/);
  assert.match(script, /'AI Intent Targets'/);
  assert.match(script, /'Environment Protocol'/);
  assert.match(script, /'Dependency Protocol'/);
  assert.match(script, /'Light SBOM Artifact'/);
  assert.match(script, /'Environment Steps'/);
  assert.match(script, /const supportCardsHtml=supportCards\.map/);
});

test("dashboardStateCardsClientScript groups state and handoff side cards", () => {
  const script = dashboardStateCardsClientScript();

  assert.match(script, /const stateCards=\[/);
  assert.match(script, /'Environment Health'/);
  assert.match(script, /'Version Policy'/);
  assert.match(script, /'Agent Intents'/);
  assert.match(script, /'AI Handoff'/);
  assert.match(script, /'Agent Pointers'/);
  assert.match(script, /'Snapshot'/);
  assert.match(script, /const stateCardsHtml=stateCards\.map/);
});

test("renderDashboard includes the audit summary surface", () => {
  const html = renderDashboard({
    generatedAt: "2026-07-08T00:00:00.000Z",
    workspace: { name: "sample", path: "/tmp/sample" },
    os: { platform: "linux", release: "test", arch: "x64", shell: "bash" },
    runtimes: { node: "24.0.0" },
    packageManagers: { npm: "11.0.0" },
    containers: {},
    projectHints: {},
    agentFiles: {
      agents: { path: "AGENTS.md", exists: true, hasAienvmapPointer: true, installCommand: "aienvmap snippet codex --write" },
      claude: { path: "CLAUDE.md", exists: true, hasAienvmapPointer: false, installCommand: "aienvmap snippet claude --write" },
      gemini: { path: "GEMINI.md", exists: false, hasAienvmapPointer: false, installCommand: "aienvmap snippet gemini --write" }
    },
    dependencySnapshot: {
      mode: "snapshot",
      enabled: true,
      manifests: ["package.json"],
      summary: { ecosystems: ["npm"], manifests: 1, packages: 1 },
      packages: [{ ecosystem: "npm", name: "express", version: "^4.18.0", manifest: "package.json", group: "dependencies" }]
    },
    lightSbom: {
      mode: "light-sbom",
      summary: {
        manifests: ["package.json"],
        lockfiles: [{ file: "package-lock.json", ecosystem: "npm", manager: "npm" }],
        packages: 1,
        vulnerabilities: 1,
        directVulnerablePackages: 1,
        transitiveOrUnmatchedVulnerablePackages: 0
      },
      topRisk: [{
        name: "express",
        ecosystem: "npm",
        severity: "high",
        directDependency: true,
        manifest: "package.json",
        version: "^4.18.0",
        priority: "high",
        score: 90,
        fixAvailable: true,
        fixVersions: ["4.18.3"]
      }],
      riskSummary: {
        level: "high",
        score: 80,
        scanner: "enabled",
        next: "Review dependency read set and topRisk before remediation; do not auto-fix without user approval.",
        signals: ["1 high vulnerability finding(s)", "1 vulnerable direct dependency package(s)"],
        reviewTargets: ["package.json", "express"]
      },
      aiDependencyReview: {
        status: "review",
        statusReason: "SBOM risk or package manager policy requires dependency review before changes.",
        securityConfidence: "scanner-summary",
        mode: "advisory",
        readFirst: ["riskSummary", "dependencyChangeHints", "packageManagerPolicy", "topRisk"],
        reviewTargets: ["package.json", "express"],
        beforeDependencyChange: [
          "aienvmap sync --security",
          "aienvmap intent --actor agent:id --action dependency-review --target dependency",
          "aienvmap plan --write"
        ],
        afterDependencyChange: [
          "run the narrowest relevant project validation",
          "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
        ],
        rule: "Review SBOM risk and package manager policy before dependency changes; default behavior is advisory and non-blocking."
      },
      aiReviewPlan: {
        status: "review",
        risk: "high/80",
        securityConfidence: "scanner-summary",
        packageManagerPolicy: "clear",
        beforeChange: "aienvmap sync --security",
        afterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
        rule: "Review SBOM risk and package manager policy before dependency changes."
      },
      packageManagerPolicy: {
        status: "clear",
        ecosystems: {
          npm: {
            managers: ["npm"],
            lockfiles: ["package-lock.json"],
            status: "single-manager",
            recommendedManager: "npm",
            guidance: "Use the detected package manager for dependency changes unless the user says otherwise."
          }
        },
        guidance: "Preserve existing lockfile and package manager choices during dependency changes."
      },
      dependencyChangeHints: [{
        manifest: "package.json",
        ecosystem: "npm",
        manager: "npm",
        groups: ["dependencies"],
        lockfiles: [{ file: "package-lock.json", ecosystem: "npm", manager: "npm" }],
        packages: 1,
        riskPackages: [{ name: "express", severity: "high", priority: "high", fixAvailable: true }]
      }],
      dependencyCoordination: {
        mode: "advisory",
        readFirst: [".aienvmap/discovery.json", ".aienvmap/sbom.json", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
        reviewTargets: ["package.json", "express"],
        nextCommand: "aienvmap sync --security",
        beforeChange: ["aienvmap intent --actor agent:id --action dependency-review --target dependency", "aienvmap plan --write"],
        afterChange: ["run the narrowest relevant project validation", "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"],
        mustNotDo: ["do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status"],
        scannerEvidence: "run-scanner-before-security-work",
        rule: "Use the light SBOM to coordinate dependency work; record intent before dependency or lockfile changes, use optional scanners for security evidence, then checkpoint and hand off."
      },
      dependencyQuickCheck: {
        status: "review",
        readFirst: [".aienvmap/discovery.json", ".aienvmap/sbom.json", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
        nextCommand: "aienvmap sync --security",
        reviewTargets: ["package.json", "express"],
        scannerEvidence: "run-scanner-before-security-work",
        mustNotDo: ["do not run broad install, update, audit fix, or lockfile rewrite commands before reading SBOM and status"],
        rule: "Use this compact block as the first AI dependency-work decision."
      }
    },
    security: {
      mode: "security",
      enabled: true,
      summary: { total: 1, critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
      topPackages: [{
        name: "express",
        severity: "high",
        remediationPriority: { level: "high", score: 90, reasons: [] },
        fixAvailable: true,
        directDependency: true,
        dependency: { ecosystem: "npm", manifest: "package.json", group: "dependencies", version: "^4.18.0" }
      }]
    },
    recommendedActions: [{
      id: "review-security-remediation",
      priority: "high",
      category: "security",
      summary: "Review express before dependency changes.",
      command: "aienvmap context --json"
    }],
    planArtifacts: {
      markdown: ".aienvmap/plan.md",
      json: ".aienvmap/plan.json"
    },
    planRemediation: [{
      package: "express",
      severity: "high",
      remediationPriority: { level: "high", score: 90, reasons: [] },
      fixVersions: ["4.17.21"],
      fixAvailable: true,
      advisories: ["GHSA-test"],
      directDependency: true,
      dependency: { ecosystem: "npm", manifest: "package.json", group: "dependencies", version: "^4.18.0" }
    }],
    planEnvironment: [{
      code: "node-version-mismatch",
      category: "runtime",
      summary: ".nvmrc requests 20, but detected node is 24.0.0."
    }],
    ciReadiness: [{
      scope: "security",
      status: "pass",
      matchedWarningCodes: []
    }, {
      scope: "policy",
      status: "fail",
      matchedWarningCodes: ["node-version-mismatch"]
    }, {
      scope: "coordination",
      status: "pass",
      matchedWarningCodes: []
    }, {
      scope: "all",
      status: "fail",
      matchedWarningCodes: ["node-version-mismatch"]
    }],
    preflight: {
      aiSession: {
        purpose: "Shortest repeatable startup routine for AI agents in this workspace.",
        readFirst: [".aienvmap/status.json", ".aienvmap/summary.md"],
        start: ["aienvmap status --json", "aienvmap sync"],
        ifMissingOrStale: "aienvmap sync",
        beforeEnvironmentChange: "aienvmap intent --actor agent:id --action planned-change --target dependency",
        afterEnvironmentChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
        handoff: "aienvmap handoff --record --actor agent:id",
        localWork: "allowed",
        environmentChanges: "intent-review-handoff-first",
        rule: "Read status first, sync only when missing or stale, continue project-local work when allowed, and record intent before shared environment changes."
      },
      aiBootstrap: {
        readFirst: ".aienvmap/status.json",
        detailCommand: "aienvmap context --json",
        nextSafeCommand: "aienvmap sync",
        localMode: "advisory",
        projectLocalWork: "allowed",
        environmentChanges: "review-first",
        rule: "Review context before shared environment changes; local checks remain non-blocking."
      },
      contract: {
        name: "aienvmap-preflight",
        version: 1,
        stability: "additive",
        aiEntryFields: ["state", "nextAgent", "coordination", "agentActivity", "dependencyReadSet"],
        rule: "Consumers should ignore unknown fields."
      },
      intentTargets: [{
        target: "dependency",
        reason: "Security findings are dependency-related; record dependency intent before remediation.",
        sources: ["security"],
        command: "aienvmap intent --actor agent:id --action planned-change --target dependency"
      }],
      nextAgent: {
        readFirst: ".aienvmap/status.json",
        dependencyFiles: ["package.json", "package-lock.json"],
        rule: "Next AI may continue project-local work; record intent before environment changes."
      },
      coordination: {
        openIntentCount: 2,
        conflictTargets: ["dependency"],
        targets: [{
          target: "dependency",
          count: 2,
          actors: ["agent:codex", "agent:claude"],
          actions: ["update dependency", "fix vulnerable package"],
          conflict: true
        }]
      },
      followUps: [{
        at: "2026-07-08T00:00:00.000Z",
        actor: "agent:codex",
        target: "dependency",
        summary: "dependency-change",
        reason: "Dependency or security records should refresh the env map and handoff context.",
        commands: ["aienvmap sync", "aienvmap status --write", "aienvmap handoff --record --actor agent:id"]
      }],
      followUpPlan: {
        status: "pending",
        count: 1,
        targets: ["dependency"],
        nextCommand: "aienvmap sync",
        rule: "Run the follow-up command before another AI changes the same environment target."
      },
      agentActivity: {
        environmentRecordCount: 2,
        multiActorTargets: ["dependency"],
        next: "Run handoff and review follow-ups before another environment change.",
        targets: [{
          target: "dependency",
          count: 2,
          actors: ["agent:codex", "agent:claude"],
          latestSummary: "dependency remediation",
          multiActor: true
        }]
      },
      aiReadiness: {
        level: "review",
        next: "Review listed signals before another AI changes runtimes or dependencies.",
        signals: ["open intent conflicts"],
        mode: "advisory"
      },
      collaboration: {
        status: "review-before-env-change",
        mode: "advisory",
        activeTargets: ["dependency"],
        reviewSignals: ["open intent conflict", "multi-agent environment record"],
        projectLocalWork: "allowed",
        environmentChanges: "intent-review-handoff-first",
        nextCommand: "aienvmap handoff --record --actor agent:id",
        rule: "Do not install shared tools until collaboration signals are reviewed."
      },
      maintenanceLoop: {
        nextCommand: "aienvmap sync",
        rule: "Keep local operation advisory and lightweight."
      },
      environmentChangeProtocol: {
        mode: "advisory",
        appliesWhen: "Before installing, removing, upgrading, downgrading, or switching runtimes, dependencies, package managers, Docker, or global tools.",
        readFirst: [".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
        commands: {
          recordIntent: "aienvmap intent --actor agent:id --action planned-change --target dependency",
          checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency",
          handoff: "aienvmap handoff --record --actor agent:id"
        },
        mustNotDo: ["Do not run broad install, update, audit fix, or lockfile rewrite commands without reading the env map first."],
        rule: "Project-local work can continue; use this advisory protocol before shared environment changes."
      },
      dependencyReadSet: [{
        manifest: "package.json",
        ecosystem: "npm",
        manager: "npm",
        groups: ["dependencies"],
        lockfiles: ["package-lock.json"],
        riskPackages: ["express"],
        reason: "Read before dependency or security remediation; vulnerable packages are linked to this manifest."
      }],
      dependencyChangeProtocol: {
        mode: "advisory",
        packageManagerPolicy: "clear",
        commands: {
          recordIntent: "aienvmap intent --actor agent:id --action planned-change --target dependency",
          refreshAfterChange: "aienvmap sync",
          recordAfterChange: "aienvmap record --actor agent:id --summary dependency-change --target dependency",
          checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
        },
        mustNotDo: ["Do not switch package managers because another lockfile exists without user approval."]
      },
      strictRecommendation: {
        mode: "advisory-local-strict-optional",
        localCommand: "aienvmap doctor --json",
        localBehavior: "warn-only",
        shouldFailLocal: false,
        recommendedScope: "policy",
        ciCommand: "aienvmap doctor --strict policy --json",
        releaseCommand: "aienvmap doctor --strict all --json",
        rule: "Keep local operation advisory; use the first failing scope only when CI or the user wants a gate."
      },
      enforcementProfile: {
        defaultMode: "advisory",
        localOperation: "non-blocking",
        strictUse: "CI or explicit human-requested checks only",
        strictPlan: {
          recommendedStrictScope: "policy",
          recommendedStrictCommand: "aienvmap doctor --strict policy",
          ciCommand: "aienvmap doctor --strict policy --json",
          rule: "Use the narrowest failing strict scope first; keep local operation advisory unless CI or the user explicitly requests failure."
        },
        strictDecision: {
          local: "warn-only",
          localCommand: "aienvmap doctor --json",
          recommendedCommand: "aienvmap doctor --strict policy",
          ciCommand: "aienvmap doctor --strict policy --json",
          rule: "Keep local operation advisory; use the first failing scope only when CI or the user wants a gate."
        },
        gate: {
          defaultMode: "advisory",
          strictMode: "off",
          localDefault: "warn-only",
          failCondition: "never in default mode",
          exitCode: "0 unless the command itself errors",
          rule: "Do not block local or shared machine operation unless --strict or --ci is explicitly requested."
        },
        recommendedStrictCommand: "aienvmap doctor --strict policy",
        reason: "Avoid disrupting shared servers or developer machines while still making drift visible.",
        strictCommands: [
          "aienvmap doctor --strict security",
          "aienvmap doctor --strict policy",
          "aienvmap doctor --strict coordination",
          "aienvmap doctor --strict all"
        ]
      }
    }
  }, [], [], [], {});

  assert.match(html, /Audit summary/);
  assert.match(html, /AI control strip/);
  assert.match(html, /10-second review/);
  assert.match(html, /For humans: check this before any shared environment change/);
  assert.match(html, /\.cockpit/);
  assert.match(html, /const primaryReviewTarget=reviewTargets\[0\]\|\|'none'/);
  assert.match(html, /Next command/);
  assert.match(html, /First read/);
  assert.match(html, /Start here/);
  assert.match(html, /AI bootstrap/);
  assert.match(html, /\.nextbar/);
  assert.match(html, /\.brief/);
  assert.match(html, /const maintenanceLoop=manifest\.preflight\?\.maintenanceLoop\|\|\{\}/);
  assert.match(html, /const \{manifest,timeline,warnings,intents,policy,releaseReadiness,schemaQualitySignals,schemaAiAdoptionDecision,schemaAgentDiscovery\}=JSON\.parse/);
  assert.match(html, /const aiSession=manifest\.preflight\?\.aiSession\|\|\{\}/);
  assert.match(html, /const aiSessionStart=aiSession\.start\|\|\['aienvmap status --json','aienvmap context --json'\]/);
  assert.match(html, /const aiBootstrap=manifest\.preflight\?\.aiBootstrap\|\|\{\}/);
  assert.match(html, /const artifactFreshness=manifest\.preflight\?\.artifactFreshness\|\|\{\}/);
  assert.match(html, /const strictRecommendation=manifest\.preflight\?\.strictRecommendation\|\|\{\}/);
  assert.match(html, /const releaseChecks=releaseReadiness\?\.requiredBeforeStable\|\|\[\]/);
  assert.match(html, /const qualitySignals=manifest\.preflight\?\.qualitySignals\|\|schemaQualitySignals\|\|\{\}/);
  assert.match(html, /schemaAiAdoptionDecision/);
  assert.match(html, /Release Readiness/);
  assert.match(html, /Quality Signals/);
  assert.match(html, /release-candidate/);
  assert.match(html, /publishDecision=releaseReadiness\?\.publishDecision\|\|\{\}/);
  assert.match(html, /Decision/);
  assert.match(html, /meaningful changes are batched/);
  assert.match(html, /npm run release:check passes locally/);
  assert.match(html, /Batch meaningful changes before one npm publish/);
  assert.match(html, /const artifactFreshnessValue=artifactFreshness\.state\|\|'unknown'/);
  assert.match(html, /const artifactFreshnessNext=artifactFreshness\.nextCommand\|\|artifactFreshness\.refreshCommand\|\|'aienvmap sync'/);
  assert.match(html, /const nextCommand=aiBootstrap\.nextSafeCommand\|\|manifest\.preflight\?\.nextSafeCommand/);
  assert.match(html, /const nextReason=topAction\.summary\|\|aiBootstrap\.rule\|\|maintenanceLoop\.rule/);
  assert.match(html, /const aiEntry=manifest\.preflight\?\.artifacts\?\.discovery\|\|'\.aienvmap\/discovery\.json'/);
  assert.match(html, /const startHere=manifest\.preflight\?\.artifacts\?\.startHere\|\|'\.aienvmap\/README\.md'/);
  assert.match(html, /const firstRead=aiBootstrap\.readFirst\|\|nextAgent\.readFirst\|\|'\.aienvmap\/status\.json'/);
  assert.match(html, /const bootstrapState=\[aiBootstrap\.projectLocalWork\|\|'allowed',aiBootstrap\.environmentChanges\|\|'intent-first'\]/);
  assert.match(html, /const agentDiscovery=manifest\.preflight\?\.agentPointers\?\.discovery/);
  assert.match(html, /const dashboardDiscoveryFallback=/);
  assert.match(html, /const agentDiscoveryFallbackRead=manifest\.preflight\?\.agentPointers\?\.fallbackRead/);
  assert.match(html, /agentDiscoveryDecision/);
  assert.match(html, /agentDiscoveryEntry/);
  assert.match(html, /agentDiscoverySetup/);
  assert.match(html, /agentDiscoveryAiEntryFields/);
  assert.match(html, /<th>aiEntry<\/th>/);
  assert.match(html, /startup/);
  assert.match(html, /aienvmap start --json/);
  assert.match(html, /fallback-required/);
  assert.match(html, /auto-ready/);
  assert.match(html, /AI discovery/);
  assert.match(html, /AI entry/);
  assert.match(html, /Maintenance/);
  assert.match(html, /AI Session/);
  assert.match(html, /Before env/);
  assert.match(html, /<th>Avoid<\/th>/);
  assert.match(html, /aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.deepEqual(dashboardEssentialCards, [
    "AI Session",
    "Environment Health",
    "AI Collaboration",
    "Light SBOM",
    "Agent Pointers",
    "Agent Intents",
    "Environment Ledger",
    "Enforcement Mode",
    "Release Readiness"
  ]);
  assert.equal(dashboardCardPriority("AI Session"), "essential");
  assert.equal(dashboardCardPriority("Runtimes"), "support");
  assert.deepEqual(dashboardEssentialSurfaces.controlStrip, ["AI readiness", "Freshness", "Collaboration", "SBOM risk"]);
  assert.deepEqual(dashboardEssentialSurfaces.tenSecondReview, ["AI entry", "Next command", "Review target", "Mode"]);
  assert.equal(dashboardDiscoveryFallback.command, "aienvmap start --json");
  assert.equal(dashboardDiscoveryFallback.entry, ".aienvmap/discovery.json");
  assert.deepEqual(dashboardDiscoveryFallback.decisionValues, ["auto-ready", "fallback-required"]);
  assert.equal(dashboardDiscoveryFallback.nextSetupCommand, "aienvmap onboard");
  assert.equal(dashboardDiscoveryFallback.sessionUse.decisionField, "aiDiscovery.decision");
  assert.equal(dashboardDiscoveryFallback.sessionUse.fallbackPromptField, "copyPastePrompt");
  assert.ok(dashboardDiscoveryFallback.aiEntryFields.includes("copyPastePrompt"));
  assert.ok(dashboardDiscoveryFallback.aiEntryFields.includes("beforeEnvironmentChange"));
  assert.match(dashboardDiscoveryFallback.startupChecklist.join(" "), /dependencyQuickCheck/);
  assert.match(dashboardDiscoveryFallback.startupChecklist.join(" "), /checkpoint and hand off/);
  assert.deepEqual(dashboardDiscoveryFallback.read, [".aienvmap/discovery.json", ".aienvmap/README.md", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"]);
  assert.match(dashboardDiscoveryFallbackClientScript(), /aienvmap start --json/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /agentDiscoveryEntry/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /agentDiscoveryDecision=/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /fallback-required/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /agentDiscoverySetup/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /agentDiscoveryAiEntryFields/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /agentSessionUse/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /<th>sessionUse<\/th>/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /<th>aiEntry<\/th>/);
  assert.match(dashboardDiscoveryFallbackClientScript(), /startup/);
  assert.ok(dashboardEssentialSurfaces.firstRead.includes("Start here"));
  assert.ok(dashboardEssentialSurfaces.firstRead.includes("AI entry"));
  assert.ok(dashboardEssentialSurfaces.firstRead.includes("Maintenance"));
  assert.equal(dashboardEssentialSurfaces.nextCommand, "Next command");
  assert.ok(dashboardEssentialSurfaces.essentialCards.includes("Light SBOM"));
  assert.match(dashboardEssentialSurfaces.rule, /AI startup contract/);
  assert.equal(dashboardSurfaceBudget.mode, "essential-first");
  assert.equal(dashboardSurfaceBudget.primaryReviewTime, "10 seconds");
  assert.ok(dashboardSurfaceBudget.defaultPriority.includes("firstRead"));
  assert.match(dashboardSurfaceBudget.supportCardRule, /must not hide or replace/);
  assert.match(dashboardSurfaceBudget.noGrowthRule, /before adding new dashboard cards/);
  assert.match(dashboardEssentialSurfaceClientScript(), /const essentialSurfaces=/);
  assert.match(dashboardPriorityClientScript(), /const essentialCards=\["AI Session"/);
  assert.match(dashboardPriorityClientScript(), /function cardPriority\(title\)/);
  assert.match(dashboardAgentClientScript(), /const agentNames=\{agents:'Codex',claude:'Claude',gemini:'Gemini'\}/);
  assert.match(dashboardAgentClientScript(), /agentNames\.cursor='Cursor'/);
  assert.match(dashboardAgentClientScript(), /aienvmap pointer installed/);
  assert.match(dashboardAgentClientScript(), /agentPointerCount=entries\(manifest\.agentFiles\)/);
  assert.match(dashboardScannerGuidanceClientScript(), /const scannerGuidance=lightSbom\.scannerGuidance/);
  assert.match(dashboardScannerGuidanceClientScript(), /optional-read-only/);
  assert.match(dashboardScannerGuidanceClientScript(), /aienvmap sync --security/);
  assert.match(dashboardScannerGuidanceClientScript(), /dependency-track/);
  assert.match(dashboardScannerGuidanceClientScript(), /dedicated scanners for full evidence/);
  assert.match(dashboardReviewPlanClientScript(), /const aiReviewPlan=lightSbom\.aiReviewPlan/);
  assert.match(dashboardReviewPlanClientScript(), /packageManagerPolicy/);
  assert.match(dashboardReviewPlanClientScript(), /aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(dashboardAiUseClientScript(), /const aiUse=lightSbom\.aiUse/);
  assert.match(dashboardAiUseClientScript(), /shortest AI dependency\/security safety summary/);
  assert.match(dashboardAiUseHtmlClientScript(), /const aiUseHtml=/);
  assert.match(dashboardAiUseHtmlClientScript(), /Scanner/);
  assert.match(dashboardReviewPlanHtmlClientScript(), /const aiReviewPlanHtml=aiReviewPlan\.status/);
  assert.match(dashboardReviewPlanHtmlClientScript(), /No AI review plan available/);
  assert.match(dashboardReviewPlanHtmlClientScript(), /aienvmap sbom --json/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /const scannerGuidanceHtml=/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /optional-read-only/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /Decision/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /Tools/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /Evidence rule/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /scannerGuidance\.externalTools/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /const scannerWorkflow=scannerGuidance\.evidenceWorkflow/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /evidence/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /scannerGuidance\.decision/);
  assert.match(dashboardScannerGuidanceHtmlClientScript(), /security-sensitive decisions/);
  assert.match(dashboardSbomClientScripts(), /const scannerGuidance=lightSbom\.scannerGuidance/);
  assert.match(dashboardSbomClientScripts(), /const aiUse=lightSbom\.aiUse/);
  assert.match(dashboardSbomClientScripts(), /const dependencyCoordination=lightSbom\.dependencyCoordination/);
  assert.match(dashboardRiskSummaryClientScript(), /const riskSummaryHtml=riskSummary\.level/);
  assert.match(dashboardRiskSummaryClientScript(), /No SBOM action required/);
  assert.match(dashboardRiskSummaryClientScript(), /No risk summary available/);
  assert.match(dashboardPackageManagerPolicyClientScript(), /const pmPolicyHtml=/);
  assert.match(dashboardPackageManagerPolicyClientScript(), /No lockfile policy detected/);
  assert.match(dashboardDependencyHintsClientScript(), /const dependencyHintsHtml=dependencyHints\.length/);
  assert.match(dashboardDependencyHintsClientScript(), /No dependency change hints available/);
  assert.match(dashboardDependencyHintsClientScript(), /lockfiles/);
  assert.match(dashboardDependencyReadSetClientScript(), /const dependencyReadSetHtml=dependencyReadSet\.length/);
  assert.match(dashboardDependencyReadSetClientScript(), /No dependency files detected/);
  assert.match(dashboardDependencyProtocolClientScript(), /const dependencyProtocolHtml=dependencyProtocol\.commands/);
  assert.match(dashboardDependencyProtocolClientScript(), /No dependency change protocol available/);
  assert.match(dashboardDependencyReviewClientScript(), /const aiDependencyReviewHtml=aiDependencyReview\.status/);
  assert.match(dashboardDependencyReviewClientScript(), /Security confidence/);
  assert.match(dashboardDependencyReviewClientScript(), /aienvmap intent --actor agent:id --action dependency-review --target dependency/);
  assert.match(dashboardDependencyCoordinationClientScript(), /const dependencyCoordination=lightSbom\.dependencyCoordination/);
  assert.match(dashboardDependencyCoordinationClientScript(), /const dependencyQuickCheck=lightSbom\.dependencyQuickCheck/);
  assert.match(dashboardDependencyCoordinationClientScript(), /const dependencyQuickCheckHtml=/);
  assert.match(dashboardDependencyCoordinationClientScript(), /Scanner evidence/);
  assert.match(dashboardDependencyCoordinationClientScript(), /audit fix/);
  assert.match(dashboardEnvironmentProtocolClientScript(), /const environmentProtocol=manifest\.preflight\?\.environmentChangeProtocol/);
  assert.match(dashboardEnvironmentProtocolClientScript(), /Before shared environment changes/);
  assert.match(dashboardEnvironmentProtocolClientScript(), /mustNotDo/);
  assert.match(dashboardReleaseReadinessClientScript(), /const releaseChecks=releaseReadiness\?\.requiredBeforeStable\|\|\[\]/);
  assert.match(dashboardReleaseReadinessClientScript(), /const dashboardReleaseDefaults=/);
  assert.match(dashboardReleaseReadinessClientScript(), /const currentBatch=releaseReadiness\?\.currentBatch\|\|\{\}/);
  assert.match(dashboardReleaseReadinessClientScript(), /const releaseEvidence=releaseReadiness\?\.evidenceCommands\|\|\[\]/);
  assert.match(dashboardReleaseReadinessClientScript(), /const releaseFocus=releaseReadiness\?\.stabilizationFocus\|\|\[\]/);
  assert.match(dashboardReleaseReadinessClientScript(), /const publishGate=releaseReadiness\?\.publishGate\|\|\{\}/);
  assert.match(dashboardReleaseReadinessClientScript(), /const contractReview=releaseReadiness\?\.contractReview\|\|\{\}/);
  assert.match(dashboardReleaseReadinessClientScript(), /publishDecision=releaseReadiness\?\.publishDecision\|\|\{\}/);
  assert.match(dashboardReleaseReadinessClientScript(), /Contract review/);
  assert.match(dashboardReleaseReadinessClientScript(), /contractReview\.surfaces/);
  assert.match(dashboardReleaseReadinessClientScript(), /single AI-readable/);
  assert.match(dashboardReleaseReadinessClientScript(), /Batch meaningful changes before one npm publish/);
  assert.match(dashboardReleaseReadinessClientScript(), /currentBatch\.themes/);
  assert.match(dashboardReleaseClientScripts(), /const releaseReadinessHtml=/);
  assert.match(dashboardReleaseClientScripts(), /const qualitySignalsHtml=/);
  assert.match(dashboardReleaseClientScripts(), /const operationalCards=/);
  assert.equal(dashboardReleaseDefaults.target, "0.2.0");
  assert.equal(dashboardReleaseDefaults.evidence, "npm run release:check");
  assert.equal(dashboardReleaseDefaults.contractReviewStatus, "freeze-candidate-verified");
  assert.match(dashboardQualitySignalsClientScript(), /const qualitySignals=manifest\.preflight\?\.qualitySignals/);
  assert.match(dashboardQualitySignalsClientScript(), /const aiAdoptionDecision=schemaAiAdoptionDecision\|\|\{\}/);
  assert.match(dashboardQualitySignalsClientScript(), /const dashboardQualityDefaults=/);
  assert.match(dashboardQualitySignalsClientScript(), /AI-friendly/);
  assert.equal(dashboardQualityDefaults.evidence, "aienvmap start --json && aienvmap context --json");
  assert.match(dashboardQualitySignalsClientScript(), /Adoption/);
  assert.match(dashboardQualitySignalsClientScript(), /aiAdoptionDecision\.useWhen/);
  assert.match(dashboardQualitySignalsClientScript(), /aienvmap demo --json/);
  assert.match(dashboardQualitySignalsClientScript(), /First check/);
  assert.match(dashboardQualitySignalsClientScript(), /do not require background services/);
  for (const title of dashboardEssentialCards) {
    assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(html, /const mainCards=\[/);
  assert.match(html, /const supportCards=\[/);
  assert.match(html, /const stateCards=\[/);
  assert.match(html, /const operationalCards=\[/);
  assert.match(html, /const essentialCards=\["AI Session","Environment Health","AI Collaboration","Light SBOM","Agent Pointers","Agent Intents","Environment Ledger","Enforcement Mode","Release Readiness"\]/);
  assert.match(html, /const essentialSurfaces=\{"controlStrip":\["AI readiness","Freshness","Collaboration","SBOM risk"\],"tenSecondReview":\["AI entry","Next command","Review target","Mode"\]/);
  assert.match(html, /data-dashboard-priority=/);
  assert.match(html, /cardPriority\(title\)/);
  assert.match(html, /const agentNames=\{agents:'Codex',claude:'Claude',gemini:'Gemini'\}/);
  assert.match(html, /agentNames\.copilot='Copilot'/);
  assert.match(html, /const scannerGuidance=lightSbom\.scannerGuidance/);
  assert.match(html, /const scannerTools=/);
  assert.match(html, /const aiReviewPlan=lightSbom\.aiReviewPlan/);
  assert.match(html, /const aiUse=lightSbom\.aiUse/);
  assert.match(html, /const aiUseHtml=/);
  assert.match(html, /AI Use/);
  assert.match(html, /const aiReviewPlanHtml=aiReviewPlan\.status/);
  assert.match(html, /const scannerGuidanceHtml=/);
  assert.match(html, /const dependencyCoordinationHtml=/);
  assert.match(html, /const dependencyQuickCheckHtml=/);
  assert.match(html, /Dependency Quick Check/);
  assert.match(html, /Dependency Coordination/);
  assert.match(html, /const riskSummaryHtml=riskSummary\.level/);
  assert.match(html, /const pmPolicyHtml=/);
  assert.match(html, /const dependencyHintsHtml=dependencyHints\.length/);
  assert.match(html, /const dependencyReadSetHtml=dependencyReadSet\.length/);
  assert.match(html, /const dependencyProtocolHtml=dependencyProtocol\.commands/);
  assert.match(html, /const aiDependencyReviewHtml=aiDependencyReview\.status/);
  assert.match(html, /const environmentProtocol=manifest\.preflight\?\.environmentChangeProtocol/);
  assert.match(html, /const releaseReadinessHtml=/);
  assert.match(html, /const qualitySignalsHtml=/);
  assert.match(html, /const currentBatch=releaseReadiness\?\.currentBatch/);
  assert.match(html, /const publishGate=releaseReadiness\?\.publishGate/);
  assert.match(html, /const contractReview=releaseReadiness\?\.contractReview/);
  assert.match(html, /releaseEvidence=releaseReadiness\?\.evidenceCommands/);
  assert.match(html, /releaseFocus=releaseReadiness\?\.stabilizationFocus/);
  assert.match(html, /Environment Protocol/);
  assert.match(html, /broad install/);
  assert.match(html, /\.card\.essential/);
  assert.match(html, /const reviewTargets=\[\.\.\.new Set/);
  assert.match(html, /\.control-card\.review/);
  assert.match(html, /controlCard\('AI readiness'/);
  assert.match(html, /controlCard\('Freshness'/);
  assert.match(html, /controlCard\('Collaboration'/);
  assert.match(html, /controlCard\('SBOM risk'/);
  assert.match(html, /AI readiness/);
  assert.match(html, /Collaboration/);
  assert.match(html, /SBOM risk/);
  assert.match(html, /sbomRiskValue\+sbomRiskScore/);
  assert.match(html, /"score":80/);
  assert.match(html, /aienvmap handoff --record --actor agent:id/);
  assert.match(html, /Review dependency read set and topRisk/);
  assert.match(html, /Review targets/);
  assert.match(html, /Review target/);
  assert.match(html, /Freshness/);
  assert.match(html, /Local mode/);
  assert.match(html, /AI decision/);
  assert.match(html, /AI readiness/);
  assert.match(html, /Review listed signals/);
  assert.match(html, /Signals: /);
  assert.match(html, /open intent conflicts/);
  assert.match(html, /Runtime drift/);
  assert.match(html, /Open env changes/);
  assert.match(html, /Trust/);
  assert.match(html, /AI Handoff/);
  assert.match(html, /Read first/);
  assert.match(html, /\.aienvmap\/status\.json/);
  assert.match(dashboardLayoutClientScripts(), /const essentialSurfaces=/);
  assert.match(dashboardLayoutClientScripts(), /function card\(/);
  assert.match(dashboardLayoutClientScripts(), /const mainCards=/);
  assert.match(dashboardLayoutClientScripts(), /const supportCards=/);
  assert.match(html, /Dependency files/);
  assert.match(html, /Conflicts/);
  assert.match(html, /Recommended Actions/);
  assert.match(html, /Review express/);
  assert.match(html, /AI Intent Targets/);
  assert.match(html, /Follow-ups/);
  assert.match(html, /followUpPlan=manifest\.preflight\?\.followUpPlan/);
  assert.match(html, /<th>Targets<\/th><td>\$\{esc\(\(followUpPlan\.targets/);
  assert.match(html, /Run the follow-up command before another AI changes the same environment target/);
  assert.match(html, /dependency-change/);
  assert.match(html, /aienvmap status --write/);
  assert.match(html, /Agent Activity/);
  assert.match(html, /dependency remediation/);
  assert.match(html, /multi-agent/);
  assert.match(html, /AI Collaboration/);
  assert.match(html, /review-before-env-change/);
  assert.match(html, /intent-review-handoff-first/);
  assert.match(html, /shared environment changes/);
  assert.match(html, /AI Contract/);
  assert.match(html, /aienvmap-preflight/);
  assert.match(html, /nextAgent/);
  assert.match(html, /dependency/);
  assert.match(html, /planned-change --target dependency/);
  assert.match(html, /Dependency Read Set/);
  assert.match(html, /package-lock\.json/);
  assert.match(html, /Dependency Protocol/);
  assert.match(html, /checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(html, /AI Plan Artifacts/);
  assert.match(html, /plan\.md/);
  assert.match(html, /Remediation Steps/);
  assert.match(html, /4\.17\.21/);
  assert.match(html, /"level":"high"/);
  assert.match(html, /"score":90/);
  assert.match(html, /Environment Steps/);
  assert.match(html, /node-version-mismatch/);
  assert.match(html, /CI Readiness/);
  assert.match(html, /Enforcement Mode/);
  assert.match(html, /advisory/);
  assert.match(html, /warn-only/);
  assert.match(html, /Fail local/);
  assert.match(html, /Recommended scope/);
  assert.match(html, /Release/);
  assert.match(html, /doctor --strict policy/);
  assert.match(html, /aienvmap doctor --json/);
  assert.match(html, /doctor --strict policy --json/);
  assert.match(html, /doctor --strict all --json/);
  assert.match(html, /Keep local operation advisory/);
  assert.match(html, /security/);
  assert.match(html, /policy/);
  assert.match(html, /Global Inventory/);
  assert.match(html, /Dependency Snapshot/);
  assert.match(html, /Light SBOM/);
  assert.match(html, /Light SBOM Artifact/);
  assert.match(html, /sbom\.json/);
  assert.match(html, /sbom\.cdx\.json/);
  assert.match(html, /AI Review Plan/);
  assert.match(html, /high\/80/);
  assert.match(html, /AI Dependency Review/);
  assert.match(html, /Security confidence/);
  assert.match(html, /scanner-summary/);
  assert.match(html, /requires dependency review/);
  assert.match(html, /dependency-review --target dependency/);
  assert.match(html, /checkpoint --actor agent:id --summary dependency-change --target dependency/);
  assert.match(html, /Risk summary/);
  assert.match(html, /vulnerable direct dependency/);
  assert.match(html, /Direct vulnerable/);
  assert.match(html, /Dependency change hints/);
  assert.match(html, /Package manager policy/);
  assert.match(html, /package-lock\.json/);
  assert.match(html, /express/);
  assert.match(html, /Security Summary/);
  assert.match(html, /package\.json/);
  assert.match(html, /express/);
  assert.match(html, /Agent Pointers/);
  assert.match(html, /<th>sessionUse<\/th><td><code>\$\{esc\(agentSessionUse\.proofCommand\|\|'aienvmap discover --json'\)\}<\/code>/);
  assert.match(html, /<th>Decision<\/th><td><code>\$\{esc\(agentDiscoveryDecision\)\}<\/code><\/td>/);
  assert.match(html, /<th>Setup<\/th><td><code>\$\{esc\(agentDiscoverySetup\)\}<\/code><\/td>/);
  assert.match(html, /aienvmap pointer installed/);
  assert.match(html, /file detected, pointer missing/);
  assert.match(html, /aienvmap onboard/);
  assert.match(html, /aienvmap snippet claude --write/);
});

test("dashWorkspace links written plan artifacts", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-dash-plan-"));
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await writeJson(path.join(dir, ".aienvmap", "manifest.json"), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    trust: { state: "observed", verified: false },
    workspace: { path: dir, name: path.basename(dir) },
    os: { platform: "test", release: "test", arch: "x64" },
    runtimes: { node: "24.0.0" },
    packageManagers: {},
    containers: {},
    projectHints: { nvmrc: "20" },
    dependencySnapshot: {
      mode: "snapshot",
      enabled: true,
      manifests: ["requirements.txt"],
      summary: { ecosystems: ["python"], manifests: 1, packages: 1 },
      packages: [{ ecosystem: "python", name: "django", version: "==3.2.0", manifest: "requirements.txt", group: "requirements" }]
    },
    lightSbom: {
      mode: "light-sbom",
      summary: { manifests: ["requirements.txt"], lockfiles: [{ file: "uv.lock", ecosystem: "python", manager: "uv" }], packages: 1, vulnerabilities: 0, directVulnerablePackages: 0, transitiveOrUnmatchedVulnerablePackages: 0 },
      topRisk: [],
      dependencyChangeHints: [{
        manifest: "requirements.txt",
        ecosystem: "python",
        manager: "pip",
        groups: ["requirements"],
        lockfiles: [{ file: "uv.lock", ecosystem: "python", manager: "uv" }],
        packages: 1,
        riskPackages: []
      }],
      scannerGuidance: {
        mode: "optional-read-only",
        defaultCommand: "aienvmap sbom --json",
        scannerCommand: "aienvmap sync --security",
        securityConfidence: "scanner-off",
        whenToRun: ["before security claims", "before release decisions"],
        rule: "Keep the default SBOM lightweight for AI coordination; use optional read-only scanners only when security confidence matters."
      }
    },
    agentFiles: {}
  });
  await fs.writeFile(path.join(dir, ".aienvmap", "plan.md"), "# plan\n", "utf8");
  await fs.writeFile(path.join(dir, ".aienvmap", "plan.json"), JSON.stringify({
    remediationSteps: [{
      package: "django",
      severity: "unknown",
      fixAvailable: true,
      fixVersions: ["3.2.25"],
      advisories: [{ id: "PYSEC-1" }]
    }],
    environmentSteps: [{
      code: "mixed-node-lockfiles",
      category: "package-manager",
      summary: "Multiple Node lockfiles detected."
    }]
  }), "utf8");

  await dashWorkspace({ dir, quiet: true });
  const html = await fs.readFile(path.join(dir, ".aienvmap", "dashboard.html"), "utf8");

  assert.match(html, /AI Plan Artifacts/);
  assert.match(html, /AI Intent Targets/);
  assert.match(html, /planned-change --target node/);
  assert.match(html, /Dependency Read Set/);
  assert.match(html, /Dependency Protocol/);
  assert.match(html, /href="plan\.md"/);
  assert.match(html, /href="plan\.json"/);
  assert.match(html, /Remediation Steps/);
  assert.match(html, /django/);
  assert.match(html, /3\.2\.25/);
  assert.match(html, /Environment Steps/);
  assert.match(html, /mixed-node-lockfiles/);
  assert.match(html, /CI Readiness/);
  assert.match(html, /Enforcement Mode/);
  assert.match(html, /doctor --strict policy/);
  assert.match(html, /node-version-mismatch/);
  assert.match(html, /Dependency Snapshot/);
  assert.match(html, /Light SBOM/);
  assert.match(html, /Scanner Guidance/);
  assert.match(html, /optional-read-only/);
  assert.match(html, /aienvmap sync --security/);
  assert.match(html, /before security claims/);
  assert.match(html, /Dependency change hints/);
  assert.match(html, /requirements\.txt/);
  assert.match(html, /uv\.lock/);
  assert.match(html, /django/);

  const data = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)?.[1]
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const clientScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  const app = { innerHTML: "" };
  const document = {
    getElementById(id) {
      if (id === "data") return { textContent: data };
      if (id === "app") return app;
      return null;
    }
  };
  new Function("document", clientScript)(document);
  assert.match(app.innerHTML, /AI environment map/);
  assert.match(app.innerHTML, /Environment Health/);
});

test("dashboard opener avoids a command shell and reports launch failure", async () => {
  const file = "C:\\workspace & shared\\.aienvmap\\dashboard.html";
  assert.deepEqual(dashboardOpenCommand(file, "win32"), { command: "explorer.exe", args: [file] });
  assert.deepEqual(dashboardOpenCommand("/tmp/dashboard.html", "darwin"), { command: "open", args: ["/tmp/dashboard.html"] });
  assert.deepEqual(dashboardOpenCommand("/tmp/dashboard.html", "linux"), { command: "xdg-open", args: ["/tmp/dashboard.html"] });
  await assert.rejects(
    openDashboardFile("/tmp/dashboard.html", { platform: "linux", run: async () => { throw new Error("missing opener"); } }),
    (error) => error.code === "AIENVMAP_DASHBOARD_OPEN_FAILED" && /could not be opened with xdg-open/.test(error.message)
  );
});
