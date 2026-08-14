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
  assert.equal(payload.releaseReadiness.target, "0.2.2");
  assert.equal(payload.schemaQualitySignals.status, "published-hardening");
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
    "const releaseReadiness={target:'0.2.2'};",
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

test("renderDashboard emits only the lightweight human dashboard", () => {
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

  assert.match(html, /Development environment/);
  assert.match(html, /Environment overview/);
  assert.match(html, /Planned environment changes/);
  assert.match(html, /Detected development tools/);
  assert.match(html, /id="panel-sbom"/);
  assert.match(html, /function showDashboardTab\(name\)/);
  assert.match(html, /Package risks by runtime/);
  assert.doesNotMatch(html, /AI Collaboration|Release Readiness|Agent Pointers|AI Contract/);
  assert.ok(Buffer.byteLength(html, "utf8") < 30000, "dashboard HTML should stay lightweight");
});

test("renderDashboard tolerates planned changes without timestamps", () => {
  const manifest = {
    generatedAt: new Date().toISOString(),
    trust: { state: "observed" },
    workspace: { name: "sample", path: "C:/sample" },
    os: { platform: "win32", release: "11", arch: "x64" },
    runtimes: { node: "22.0.0" },
    packageManagers: {}, containers: {}, lightSbom: { summary: {} }, agentFiles: {}
  };
  const html = renderDashboard(manifest, [], [], [{ actor: "agent:test", action: "upgrade node", target: "node" }]);
  const data = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)?.[1]
    .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  const clientScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  const app = { innerHTML: "" };
  const overview = { innerHTML: "" };
  const sbom = { innerHTML: "" };
  const tab = { classList: { toggle() {} }, setAttribute() {} };
  const document = { getElementById: (id) => ({ data: { textContent: data }, app, "panel-overview": overview, "panel-sbom": sbom, "tab-overview": tab, "tab-sbom": tab })[id] || null };
  new Function("document", clientScript)(document);
  assert.match(overview.innerHTML, /upgrade node/);
  assert.match(html, /simple-item warning/);
  assert.match(html, /severity-critical/);
  assert.match(html, /severity-high/);
  assert.match(html, /severity-moderate/);
  assert.match(sbom.innerHTML, /Package risks by runtime/);
});

test("dashboard keeps SBOM available when overview rendering fails", () => {
  const manifest = { generatedAt: "now", workspace: { name: "sample" }, lightSbom: { summary: { packages: 2 } } };
  const html = renderDashboard(manifest).replace("const runtimeItems=", "throw new Error('overview failure');const runtimeItems=");
  const data = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)?.[1];
  const clientScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  const app = { innerHTML: "" };
  const overview = { innerHTML: "" };
  const sbom = { innerHTML: "" };
  const tab = { classList: { toggle() {} }, setAttribute() {} };
  const document = { getElementById: (id) => ({ data: { textContent: data }, app, "panel-overview": overview, "panel-sbom": sbom, "tab-overview": tab, "tab-sbom": tab })[id] || null };
  new Function("document", clientScript)(document);
  assert.match(overview.innerHTML, /Environment overview could not be displayed/);
  assert.match(sbom.innerHTML, /Package risks by runtime/);
  assert.match(sbom.innerHTML, />2</);
});

test("dashWorkspace renders a concise environment overview and separate SBOM tab", async () => {
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

  assert.match(html, /Environment overview/);
  assert.match(html, /id="panel-sbom"/);
  assert.match(html, /showDashboardTab/);
  assert.match(html, /requirements\.txt/);
  assert.match(html, /uv\.lock/);

  const data = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)?.[1]
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const clientScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  const app = { innerHTML: "" };
  const overview = { innerHTML: "" };
  const sbom = { innerHTML: "" };
  const tab = { classList: { toggle() {} }, setAttribute() {} };
  const document = {
    getElementById(id) {
      if (id === "data") return { textContent: data };
      if (id === "app") return app;
      if (id === "panel-overview") return overview;
      if (id === "panel-sbom") return sbom;
      if (id === "tab-overview" || id === "tab-sbom") return tab;
      return null;
    }
  };
  new Function("document", clientScript)(document);
  assert.match(app.innerHTML, /Development environment/);
  assert.match(overview.innerHTML, /Environment status: review required/);
  assert.match(overview.innerHTML, /Node\.js/);
  assert.match(overview.innerHTML, /24\.0\.0/);
  assert.match(overview.innerHTML, /Runtimes/);
  assert.match(overview.innerHTML, /Package managers/);
  assert.match(overview.innerHTML, /Containers/);
  assert.match(sbom.innerHTML, /Package risks by runtime/);
  assert.match(sbom.innerHTML, /requirements\.txt/);
  assert.match(sbom.innerHTML, /uv\.lock/);
  assert.doesNotMatch(app.innerHTML + overview.innerHTML + sbom.innerHTML, /AI Plan Artifacts|CI Readiness|Enforcement Mode|Agent Pointers/);
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
