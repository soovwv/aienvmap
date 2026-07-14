import { dashboardAgentClientScript, dashboardDependencyProtocolClientScript, dashboardDependencyReadSetClientScript, dashboardEnvironmentProtocolClientScript, dashboardLayoutClientScripts, dashboardPayload, dashboardReleaseClientScripts, dashboardSbomClientScripts, dashboardStateCardsClientScript } from "./dashboard.js";
import { markerBegin, markerEnd } from "./agent-pointer.js";

export { markerBegin, markerEnd };
export { dashboardAgentClientScript, dashboardAiUseClientScript, dashboardAiUseHtmlClientScript, dashboardCardClientScript, dashboardCardPriority, dashboardDependencyCoordinationClientScript, dashboardDependencyHintsClientScript, dashboardDependencyProtocolClientScript, dashboardDependencyReadSetClientScript, dashboardDependencyReviewClientScript, dashboardDiscoveryFallback, dashboardDiscoveryFallbackClientScript, dashboardEnvironmentProtocolClientScript, dashboardEssentialCards, dashboardEssentialSurfaceClientScript, dashboardEssentialSurfaces, dashboardLayoutClientScripts, dashboardMainCardsClientScript, dashboardOperationalCardsClientScript, dashboardPayload, dashboardQualityDefaults, dashboardReleaseClientScripts, dashboardReleaseDefaults, dashboardSurfaceBudget, dashboardPackageManagerPolicyClientScript, dashboardPriorityClientScript, dashboardQualitySignalsClientScript, dashboardReleaseReadinessClientScript, dashboardReviewPlanClientScript, dashboardReviewPlanHtmlClientScript, dashboardRiskSummaryClientScript, dashboardSbomClientScripts, dashboardScannerGuidanceClientScript, dashboardScannerGuidanceHtmlClientScript, dashboardStateCardsClientScript, dashboardSupportCardsClientScript } from "./dashboard.js";

export function renderAIEnv(manifest, timeline = [], warnings = [], intents = [], policy = {}) {
  const lines = [];
  lines.push("# AI Environment Protocol", "");
  lines.push("This workspace uses `aienvmap`.");
  lines.push("AI coding agents should read this environment map and explicit change handoff before changing shared development environment state.", "");
  lines.push("## Read Me First", "");
  lines.push("Before changing runtimes, dependencies, package managers, Docker settings, or global packages:");
  lines.push("1. Read `.aienvmap/discovery.json` and `.aienvmap/status.json`.");
  lines.push("2. Run `aienvmap discover` if you need to verify whether aienvmap artifacts exist.");
  lines.push("3. Treat automatic discovery as best-effort; if an instruction-file pointer was not loaded, follow the fallback read order.");
  lines.push("4. Run `aienvmap context --json` for the full AI preflight.");
  lines.push("5. Prefer project-local version files such as `.nvmrc`, `.python-version`, `mise.toml`, and `.tool-versions`.");
  lines.push("6. Ask the user before changing global environment state.");
  lines.push("7. Record planned environment changes with `aienvmap intent --actor agent:id --action planned-change`.");
  lines.push("8. After environment changes, run `aienvmap checkpoint --actor agent:id --summary what-changed --target environment`.", "");
  lines.push("Fallback prompt for AI sessions that did not auto-load an instruction-file pointer:");
  lines.push("Use aienvmap as the workspace env map. Read `.aienvmap/discovery.json`, then `.aienvmap/status.json`, then run `aienvmap context --json` before environment changes.", "");
  lines.push(...preflightLines(manifest.preflight), "");
  lines.push("## Current Policy", "");
  lines.push(...policyLines(policy));
  lines.push("- Enforcement: non-blocking by default; warnings require review but do not lock the machine.");
  lines.push("- Project-local dependency installs: allowed when required by the user task.", "");
  lines.push("## Trust State", "");
  lines.push(`- State: ${manifest.trust?.state || "observed"}`);
  lines.push("- Rule: AI agents may observe, plan, and record changes, but verified requires human or CI review.", "");
  lines.push("## AI Preflight Summary", "");
  lines.push(...contextLines(manifest, warnings, intents), "");
  lines.push("## Runtime Map", "");
  pushMap(lines, "Runtimes", manifest.runtimes);
  pushMap(lines, "Package Managers", manifest.packageManagers);
  pushMap(lines, "Containers", manifest.containers);
  lines.push("## Global Tool Inventory", "");
  lines.push(...inventoryLines(manifest.inventory), "");
  lines.push("## Dependency Snapshot", "");
  lines.push(...dependencyLines(manifest.dependencySnapshot), "");
  lines.push("## Light SBOM", "");
  lines.push(...lightSbomLines(manifest.lightSbom), "");
  lines.push("## Security Summary", "");
  lines.push(...securityLines(manifest.security), "");
  lines.push("## Project Requirements And Hints", "");
  pushMap(lines, "Detected", manifest.projectHints);
  lines.push("## Drift And Warnings", "");
  if (warnings.length) {
    for (const warning of warnings) lines.push(`- ${warning.message}`);
  } else {
    lines.push("- No blocking environment warnings detected.");
  }
  lines.push("", "## Pending Agent Intents", "");
  if (intents.length) {
    for (const intent of intents.slice(-8).reverse()) {
      lines.push(`- ${intent.at}: ${intent.actor} plans ${intent.action}${intent.target ? ` (${intent.target})` : ""}`);
    }
  } else {
    lines.push("- No pending agent intents recorded.");
  }
  lines.push("", "## Environment Ledger", "");
  if (timeline.length) {
    for (const item of timeline.slice(-8).reverse()) {
      lines.push(`- ${item.at}: ${formatTimeline(item)}`);
    }
  } else {
    lines.push("- No previous environment changes recorded.");
  }
  lines.push("", "## Snapshot", "");
  lines.push(`- Generated: ${manifest.generatedAt}`);
  lines.push(`- Workspace: ${manifest.workspace.path}`);
  lines.push(`- OS: ${manifest.os.platform} ${manifest.os.release} ${manifest.os.arch}`);
  lines.push("");
  return lines.join("\n");
}

function preflightLines(preflight = {}) {
  const quickstart = preflight.quickstart;
  const aiBootstrap = preflight.aiBootstrap || {};
  const aiSession = preflight.aiSession || {};
  const followUpPlan = preflight.followUpPlan || {};
  const targets = preflight.intentTargets || [];
  const maintenanceLoop = preflight.maintenanceLoop || {};
  const lines = ["## 10-Second AI Flow", ""];
  if (aiSession.start?.length) {
    lines.push(`- AI session: \`${aiSession.start.join(" -> ")}\``);
    lines.push(`- If stale: \`${aiSession.ifMissingOrStale || "aienvmap sync"}\``);
    lines.push(`- Before env change: \`${aiSession.beforeEnvironmentChange || "aienvmap intent --actor agent:id --action planned-change --target environment"}\``);
    lines.push(`- After env change: \`${aiSession.afterEnvironmentChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}\``);
    if (aiSession.avoid?.length) lines.push(`- Avoid: ${aiSession.avoid.slice(0, 2).join("; ")}`);
    lines.push(`- Rule: ${aiSession.rule || "Read status first, sync only when stale or missing, and record intent before shared environment changes."}`);
  }
  if (aiBootstrap.nextSafeCommand || aiBootstrap.readFirst) {
    lines.push(`- AI bootstrap: ${aiBootstrap.projectLocalWork || "allowed"} / ${aiBootstrap.environmentChanges || "intent-first"} / ${aiBootstrap.localMode || "advisory"}`);
    lines.push(`- Next safe command: \`${aiBootstrap.nextSafeCommand || preflight.nextSafeCommand || preflight.nextCommand || "aienvmap status --json"}\``);
    lines.push(`- Read first: \`${aiBootstrap.readFirst || ".aienvmap/status.json"}\``);
    lines.push(`- Detail: \`${aiBootstrap.detailCommand || "aienvmap context --json"}\``);
    lines.push(`- Rule: ${aiBootstrap.rule || "Read status first, use context for details, and keep local checks advisory."}`);
  } else if (quickstart) {
    lines.push(`- Read first: \`${quickstart.readFirst}\``);
    lines.push(`- Detail: \`${quickstart.detailCommand}\``);
    lines.push(`- Before env change: \`${quickstart.beforeEnvironmentChange}\``);
    lines.push(`- After env change: \`${quickstart.afterEnvironmentChange}\``);
    lines.push(`- Handoff: \`${quickstart.handoff}\``);
    lines.push(`- Rule: ${quickstart.rule}`);
  } else {
    lines.push("- Run `aienvmap status --write`, then `aienvmap context --json` before environment changes.");
  }
  if (maintenanceLoop.nextCommand) {
    lines.push(`- Maintenance loop: \`${maintenanceLoop.nextCommand}\` - ${maintenanceLoop.rule || "refresh, inspect, record intent, checkpoint, and hand off"}`);
  }
  if (followUpPlan.status) {
    lines.push(`- Follow-up plan: ${followUpPlan.status} / \`${followUpPlan.nextCommand || "aienvmap status --json"}\` - ${followUpPlan.rule || followUpPlan.reason || "Resolve follow-ups before shared environment changes."}`);
  }
  lines.push("", "## Recommended Intent Targets", "");
  if (targets.length) {
    for (const target of targets.slice(0, 5)) {
      lines.push(`- ${target.target}: \`${target.command}\` - ${target.reason}`);
    }
  } else {
    lines.push("- environment: `aienvmap intent --actor agent:id --action planned-change --target environment`");
  }
  const dependencyReadSet = preflight.dependencyReadSet || [];
  if (dependencyReadSet.length) {
    lines.push("", "## Dependency Read Set", "");
    for (const item of dependencyReadSet.slice(0, 5)) {
      const files = [item.manifest, ...(item.lockfiles || [])].filter(Boolean).join(", ");
      const risk = item.riskPackages?.length ? `; risk: ${item.riskPackages.join(", ")}` : "";
      lines.push(`- ${files}: ${item.ecosystem}/${item.manager}${risk} - ${item.reason}`);
    }
  }
  const dependencyProtocol = preflight.dependencyChangeProtocol;
  if (dependencyProtocol) {
    lines.push("", "## Dependency Change Protocol", "");
    lines.push(`- Mode: ${dependencyProtocol.mode}`);
    lines.push(`- Package manager policy: ${dependencyProtocol.packageManagerPolicy}`);
    lines.push(`- Intent: \`${dependencyProtocol.commands.recordIntent}\``);
    lines.push(`- After change: \`${dependencyProtocol.commands.checkpointAfterChange || dependencyProtocol.commands.recordAfterChange}\``);
    lines.push(`- Handoff: \`${dependencyProtocol.commands.handoff}\``);
    for (const item of dependencyProtocol.mustNotDo.slice(0, 3)) lines.push(`- Must not: ${item}`);
  }
  return lines;
}

export function renderAgentPointer(target = "agents") {
  const label = target === "claude"
    ? "Claude"
    : target === "gemini"
      ? "Gemini"
      : target === "cursor"
        ? "Cursor"
        : target === "copilot"
          ? "GitHub Copilot"
          : "AI agents";
  const actor = target === "claude"
    ? "agent:claude"
    : target === "gemini"
      ? "agent:gemini"
      : target === "cursor"
        ? "agent:cursor"
        : target === "copilot"
          ? "agent:copilot"
          : target === "codex"
            ? "agent:codex"
            : "agent:id";
  return `## aienvmap Environment Map

${label} should use \`aienvmap\` as observed environment evidence and an explicit change handoff, not as authoritative machine state.

Session start contract:

1. If this file is loaded, treat the aienvmap block as the current evidence pointer.
2. Read \`.aienvmap/status.json\` before environment-affecting work when it exists.
3. Read \`.aienvmap/reconcile.json\` when it exists; it is the AI-readable Node/npm and Python/pip installation traffic report.
4. If \`.aienvmap/status.json\` is missing or stale, run \`aienvmap status --json\`, then \`aienvmap sync\` only when refresh is required.
5. Continue project-local code work unless status/context requires environment review.

Fast read order:

1. Read \`.aienvmap/status.json\`.
2. Read \`.aienvmap/reconcile.json\` when present.
3. Read \`.aienvmap/summary.md\` for the short handoff.
4. Run \`aienvmap context --json\` for details.
5. Run \`aienvmap status --write\` only when status artifacts are missing.
6. Read \`AIENV.md\` when Markdown context is easier.

Before changing runtimes, package managers, Docker settings, global packages, dependencies, lockfiles, or environment policy:

1. If status or context says \`review-required\`, ask the user before changing the environment.
2. If reconciliation evidence is missing, run \`aienvmap reconcile --write\`; use \`--full-packages\` only when package-level comparison is required.
3. Record planned environment changes with the recommended target, for example \`aienvmap intent --actor ${actor} --action planned-change --target dependency\`.
4. Prefer project-local version files and local environments.
5. Never remove a runtime, package manager, or environment without explicit human approval and a rollback plan.
6. After accepted environment changes, run \`aienvmap checkpoint --actor ${actor} --summary what-changed --target environment\`.

Privacy: treat raw manifests, reconciliation reports, SBOM files, dashboards, and \`trial/portable.json\` as local-only by default. Coordination files can contain operator text. Review before committing or sharing; use \`aienvmap reconcile --portable --json\` for redacted evidence. aienvmap never edits \`.gitignore\`.

\`aienvmap\` does not replace this instruction file, the active shell, or owning-user verification. It provides observed environment evidence, a lightweight runtime SBOM, an intent log, a timeline, and a dashboard.`;
}

export function renderContext(manifest, timeline = [], warnings = [], intents = [], policy = {}, recommendedActions = []) {
  const status = warnings.length ? "review-required" : "clear";
  const next = warnings.length ? "Review warnings before changing the environment." : "Continue with project-local work. Record intent before environment changes.";
  return [
    "# AI Preflight Context",
    "",
    `Status: ${status}`,
    `Next: ${next}`,
    "Project-local work: allowed; environment changes require intent and review when warnings or open intents exist.",
    "Enforcement: advisory by default; use `aienvmap doctor --strict <scope>` only when explicit CI failure is wanted.",
    `Trust: ${manifest.trust?.state || "observed"} (verified requires human or CI)`,
    `Workspace: ${manifest.workspace.path}`,
    `Node: ${manifest.runtimes.node || "not detected"}`,
    `Python: ${manifest.runtimes.python || manifest.runtimes.python3 || "not detected"}`,
    `Docker: ${manifest.containers.docker ? "available" : "not detected"}`,
    `Inventory: ${manifest.inventory?.mode || "basic"}${manifest.inventory?.enabled ? " enabled" : " disabled"}`,
    `Dependencies: ${manifest.dependencySnapshot?.summary?.packages || 0} packages across ${(manifest.dependencySnapshot?.summary?.ecosystems || []).join(", ") || "no ecosystems"}`,
    `Security: ${manifest.security?.mode || "basic"}${manifest.security?.enabled ? ` enabled (${manifest.security.summary?.total || 0} vulnerabilities)` : " disabled"}`,
    `Policy Node: ${policy.node || "not set"}`,
    `Policy Python: ${policy.python || "not set"}`,
    `Policy Package Manager: ${policy.packageManager || "not set"}`,
    "",
    "Must follow:",
    "- Ask the user before global runtime, package manager, Docker, or global package changes.",
    "- Treat policy mismatches as review-required, not as permission to break ongoing operations.",
    "- Prefer project-local version files and local environments.",
    "- Before planned env changes, run `aienvmap intent --actor agent:id --action planned-change`.",
    "- After env changes, run `aienvmap checkpoint --actor agent:id --summary what-changed --target environment`.",
    "",
    "Warnings:",
    ...(warnings.length ? warnings.map((w) => `- ${w.message}`) : ["- none"]),
    "",
    "Recommended actions:",
    ...(recommendedActions.length ? recommendedActions.map((item) => `- [${item.priority}] ${item.summary}${item.command ? ` (${item.command})` : ""}`) : ["- none"]),
    "",
    "Enforcement gate:",
    ...enforcementGateLines(manifest.preflight?.enforcementProfile?.gate),
    "",
    "Follow-up plan:",
    ...followUpPlanLines(manifest.preflight?.followUpPlan),
    "",
    "Follow-ups:",
    ...followUpLines(manifest.preflight?.followUps),
    "",
    "Agent activity:",
    ...agentActivityLines(manifest.preflight?.agentActivity),
    "",
    "Open intents:",
    ...(intents.length ? intents.slice(-5).reverse().map((i) => `- ${i.actor}: ${i.action}`) : ["- none"]),
    "",
    "Recent ledger:",
    ...(timeline.length ? timeline.slice(-5).reverse().map((t) => `- ${formatTimeline(t)}`) : ["- none"]),
    ""
  ].join("\n");
}

export function renderHandoff(handoff) {
  const lines = [
    "# AI Handoff",
    "",
    `Status: ${handoff.status}`,
    `Decision: ${handoff.decision?.mode || handoff.status}`,
    `Trust: ${handoff.trust?.state || "observed"} (not AI-verified)`,
    `Schema: ${handoff.schemaVersion}`,
    `Workspace: ${handoff.workspace?.path || "unknown"}`,
    "",
    "Safe runtime:",
    `- Node: ${handoff.safeRuntime.node}`,
    `- Python: ${handoff.safeRuntime.python}`,
    `- Docker: ${handoff.safeRuntime.docker}`,
    `- Inventory: ${handoff.inventory?.mode || "basic"}${handoff.inventory?.enabled ? " enabled" : " disabled"}`,
    `- Security: ${handoff.security?.mode || "basic"}${handoff.security?.enabled ? ` enabled (${handoff.security.summary?.total || 0} vulnerabilities)` : " disabled"}`,
    "",
    "AI continuation:",
    ...continuationHandoffLines(handoff.continuation),
    "",
    "Open intents:",
    ...(handoff.openIntents.length ? handoff.openIntents.map((i) => `- ${i.actor}: ${i.action}${i.target ? ` (${i.target})` : ""}`) : ["- none"]),
    "",
    "Coordination:",
    ...coordinationHandoffLines(handoff.coordination),
    "",
    "Agent activity:",
    ...agentActivityLines(handoff.agentActivity),
    "",
    "Warnings:",
    ...(handoff.warnings.length ? handoff.warnings.map((w) => `- ${w.message}`) : ["- none"]),
    "",
    "Recommended actions:",
    ...(handoff.recommendedActions?.length ? handoff.recommendedActions.map((item) => `- [${item.priority}] ${item.summary}${item.command ? ` (${item.command})` : ""}`) : ["- none"]),
    "",
    "Dependency handoff:",
    ...dependencyHandoffLines(handoff.dependencyHandoff),
    "",
    "Recent changes:",
    ...(handoff.recentChanges.length ? handoff.recentChanges.map((t) => `- ${formatTimeline(t)}`) : ["- none"]),
    "",
    "Must not do:",
    ...handoff.mustNotDo.map((item) => `- ${item}`),
    "",
    `Recommended next: ${handoff.recommendedNext}`,
    ""
  ];
  return lines.join("\n");
}

function continuationHandoffLines(continuation = {}) {
  const strict = continuation.strict || {};
  const sbomReview = continuation.sbomReview || {};
  const dependencyQuickCheck = continuation.dependencyQuickCheck || {};
  const maintenance = continuation.maintenance || {};
  const followUpPlan = continuation.followUpPlan || {};
  const discovery = continuation.discovery || {};
  const resume = continuation.resume || {};
  const followUpTargets = followUpPlan.targets?.length ? ` / ${followUpPlan.targets.join(", ")}` : "";
  return [
    `- Resume: ${(resume.readFirst || continuation.readOrder || []).join(", ") || ".aienvmap/README.md, .aienvmap/status.json"} -> ${resume.nextCommand || continuation.nextCommand || "aienvmap status --json"}`,
    `- Discovery: ${discovery.decision || "unknown"} / ${discovery.pointerStatus || "missing: run aienvmap onboard"} / ${discovery.nextSetupCommand || "aienvmap onboard"}`,
    `- Discovery fallback: ${discovery.fallbackCommand || "aienvmap start --json"} / ${(discovery.fallbackRead || []).join(" -> ") || ".aienvmap/README.md -> .aienvmap/status.json -> .aienvmap/summary.md -> aienvmap context --json"}`,
    `- Next: ${continuation.nextCommand || "aienvmap status --json"}`,
    `- Read: ${(continuation.readOrder || []).join(", ") || ".aienvmap/status.json"}`,
    `- Before env: ${resume.beforeEnvironmentChange || "aienvmap intent --actor agent:id --action planned-change --target environment"}`,
    `- After env: ${resume.afterEnvironmentChange || "aienvmap checkpoint --actor agent:id --summary what-changed --target environment"}`,
    `- Follow-up: ${followUpPlan.status || "clear"} / ${followUpPlan.nextCommand || "aienvmap status --json"}${followUpTargets}`,
    `- Local check: ${strict.localCommand || "aienvmap doctor --json"} (${strict.local || "warn-only"})`,
    `- CI strict: ${strict.ciCommand || "aienvmap doctor --strict all --json"}`,
    `- SBOM review: ${sbomReview.status || "unknown"} / ${sbomReview.riskLevel || "unknown"} / ${sbomReview.nextCommand || maintenance.sbomCommand || "aienvmap sbom --json"}`,
    `- Dependency quick check: ${dependencyQuickCheck.status || "unknown"} / ${dependencyQuickCheck.scannerEvidence || "unknown"} / ${dependencyQuickCheck.nextCommand || "aienvmap sbom --json"}`,
    `- Rule: ${maintenance.rule || strict.rule || "Keep local operation advisory and lightweight."}`
  ];
}

function coordinationHandoffLines(coordination = {}) {
  const conflicts = coordination.conflictTargets || [];
  if (conflicts.length) return [`- Conflicts: ${conflicts.join(", ")}`, `- Next: ${coordination.next || "review open intents"}`];
  return [`- Open intents: ${coordination.openIntentCount || 0}`, `- Next: ${coordination.next || "no open environment intents"}`];
}

function dependencyHandoffLines(dependencyHandoff = {}) {
  const readSet = dependencyHandoff.readSet || [];
  const protocol = dependencyHandoff.protocol || {};
  const lines = [];
  if (readSet.length) {
    for (const item of readSet.slice(0, 3)) {
      const files = [item.manifest, ...(item.lockfiles || [])].filter(Boolean).join(", ");
      lines.push(`- Read: ${files || "dependency files"} (${item.ecosystem || "deps"}/${item.manager || "unknown"})`);
    }
  } else {
    lines.push("- Read: no dependency files detected");
  }
  lines.push(`- Intent: ${protocol.recordIntent || "aienvmap intent --actor agent:id --action planned-change --target dependency"}`);
  lines.push(`- After change: ${protocol.checkpointAfterChange || protocol.recordAfterChange || "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"}`);
  lines.push(`- Handoff: ${protocol.handoff || "aienvmap handoff --record --actor agent:id"}`);
  return lines;
}

export function renderPlan(plan) {
  const aiBootstrap = plan.aiBootstrap || plan.preflight?.aiBootstrap || {};
  const followUpPlan = plan.followUpPlan || plan.preflight?.followUpPlan || {};
  const nextSafeCommand = plan.nextSafeCommand || aiBootstrap.nextSafeCommand || plan.preflight?.nextSafeCommand || plan.preflight?.nextCommand || "aienvmap status --json";
  const lines = [
    "# AI Environment Plan",
    "",
    `Status: ${plan.status}`,
    `AI bootstrap: ${aiBootstrap.projectLocalWork || "allowed"} / ${aiBootstrap.environmentChanges || "intent-first"} / ${aiBootstrap.localMode || "advisory"}`,
    `Next safe command: ${nextSafeCommand}`,
    `Read first: ${aiBootstrap.readFirst || ".aienvmap/status.json"} -> ${aiBootstrap.detailCommand || "aienvmap context --json"}`,
    `Follow-up plan: ${followUpPlan.status || "clear"} / ${followUpPlan.nextCommand || "aienvmap status --json"}`,
    `Bootstrap rule: ${aiBootstrap.rule || "Read status first, use context for details, and keep local checks advisory."}`,
    `Decision: ${plan.decision?.mode || plan.status}`,
    `Enforcement: ${plan.enforcement?.mode || "advisory-by-default"} (${plan.enforcement?.localBehavior || "non-blocking"})`,
    `Generated: ${plan.generatedAt}`,
    `Workspace: ${plan.workspace?.path || "unknown"}`,
    "",
    "Purpose: read-only review plan for AI agents and humans. It does not install, remove, upgrade, downgrade, or lock anything.",
    "",
    "Recommended actions:",
    ...(plan.recommendedActions.length
      ? plan.recommendedActions.map((item) => `- [${item.priority}] ${item.category}: ${item.summary}${item.command ? ` (${item.command})` : ""}`)
      : ["- none"]),
    "",
    "Review gates:",
    ...plan.reviewGates.map((item) => `- ${item}`),
    "",
    "Enforcement gate:",
    ...enforcementGateLines(plan.preflight?.enforcementProfile?.gate),
    "",
    "Dependency protocol:",
    ...dependencyProtocolPlanLines(plan.preflight?.dependencyChangeProtocol),
    "",
    "Remediation steps:",
    ...(plan.remediationSteps?.length ? plan.remediationSteps.slice(0, 5).flatMap(remediationLines) : ["- none"]),
    "",
    "Environment steps:",
    ...(plan.environmentSteps?.length ? plan.environmentSteps.slice(0, 5).flatMap(environmentLines) : ["- none"]),
    "",
    "Warnings:",
    ...(plan.warnings.length ? plan.warnings.map((warning) => `- [${warning.code}] ${warning.message}`) : ["- none"]),
    ""
  ];
  return lines.join("\n");
}

function dependencyProtocolPlanLines(protocol = {}) {
  if (!protocol.commands) return ["- none"];
  return [
    `- Mode: ${protocol.mode || "advisory"}`,
    `- Package manager policy: ${protocol.packageManagerPolicy || "not-detected"}`,
    `- Intent: ${protocol.commands.recordIntent}`,
    `- After change: ${protocol.commands.checkpointAfterChange || `${protocol.commands.refreshAfterChange}; ${protocol.commands.recordAfterChange}`}`,
    ...(protocol.mustNotDo || []).slice(0, 3).map((item) => `- Must not: ${item}`)
  ];
}

function enforcementGateLines(gate = {}) {
  return [
    `- Default: ${gate.defaultMode || "advisory"} (${gate.localDefault || "warn-only"})`,
    `- Strict: ${gate.strictMode || "off"}`,
    `- Fail condition: ${gate.failCondition || "never in default mode"}`,
    `- Exit code: ${gate.exitCode || "0 unless the command itself errors"}`
  ];
}

function followUpLines(followUps = []) {
  if (!followUps.length) return ["- none"];
  return followUps.slice(0, 5).map((item) => {
    const command = item.commands?.[0] ? ` (${item.commands[0]})` : "";
    return `- ${item.target || "environment"}: ${item.summary || item.reason || "follow-up required"}${command}`;
  });
}

function followUpPlanLines(followUpPlan = {}) {
  if (!followUpPlan.status) return ["- none"];
  const targets = followUpPlan.targets?.length ? `; targets: ${followUpPlan.targets.join(", ")}` : "";
  return [
    `- ${followUpPlan.status}: ${followUpPlan.nextCommand || "aienvmap status --json"}${targets}`,
    `- Rule: ${followUpPlan.rule || followUpPlan.reason || "Resolve follow-ups before shared environment changes."}`
  ];
}

function agentActivityLines(activity = {}) {
  const targets = activity.targets || [];
  if (!targets.length) return ["- none"];
  return targets.slice(0, 5).map((item) => {
    const actors = item.actors?.length ? item.actors.join(", ") : "unknown";
    const flag = item.multiActor ? "multi-agent" : "single-agent";
    return `- ${item.target}: ${item.count} record(s), ${actors}, ${flag}${item.latestSummary ? ` - ${item.latestSummary}` : ""}`;
  });
}

function environmentLines(item) {
  return [
    `- ${item.category}: ${item.summary}`,
    ...item.steps.slice(0, 4).map((step) => `  - ${step}`)
  ];
}

function remediationLines(item) {
  const fix = item.fixVersions?.length ? `fix ${item.fixVersions.join(", ")}` : item.fixAvailable ? "fix available" : "review required";
  const advisories = (item.advisories || []).map((advisory) => advisory.id || advisory.title).filter(Boolean).slice(0, 2);
  const dependency = item.directDependency && item.dependency ? `; declared in ${item.dependency.manifest} ${item.dependency.version}` : "; not found in dependency snapshot";
  const priority = item.remediationPriority ? `priority ${item.remediationPriority.level}/${item.remediationPriority.score}` : "priority unscored";
  return [
    `- ${item.package}: ${item.severity}; ${priority}; ${fix}${dependency}${advisories.length ? `; advisories ${advisories.join(", ")}` : ""}`,
    ...item.steps.slice(0, 4).map((step) => `  - ${step}`)
  ];
}

export function dashboardStyle() {
  return `:root{color-scheme:dark;--bg:#08110f;--panel:#0d1815;--panel2:#101e1a;--line:#214138;--line2:#172b26;--text:#eefcf5;--muted:#91aa9d;--green:#47e58d;--green2:#133d2a;--amber:#f4bf5f;--red:#ff6b6b;--code:#d7ffe9}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(71,229,141,.12),transparent 38%),radial-gradient(circle at 74% 0,rgba(244,191,95,.08),transparent 28%)}
.shell{position:relative;max-width:1180px;margin:0 auto;padding:26px 22px 36px}
header{border:1px solid var(--line);background:linear-gradient(135deg,rgba(16,30,26,.96),rgba(8,17,15,.94));border-radius:8px;padding:22px;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start}
.eyebrow{color:var(--green);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
h1,h2,h3,p{margin:0}h1{font-size:clamp(28px,4vw,46px);line-height:1.02;margin-top:8px;letter-spacing:0}h2{font-size:17px;letter-spacing:0}h3{font-size:13px;color:var(--muted);font-weight:600;letter-spacing:0}
.sub{color:var(--muted);margin-top:12px;max-width:680px;line-height:1.55}
.stamp{min-width:220px;border:1px solid var(--line2);background:#091310;border-radius:8px;padding:14px}
.stamp b{display:block;color:var(--green);font-size:24px;margin-bottom:3px}.stamp span{display:block;color:var(--muted);font-size:12px;overflow-wrap:anywhere}
.control{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}
.control-card{border:1px solid var(--line);background:rgba(13,24,21,.94);border-radius:8px;padding:16px;min-width:0}
.control-card.review{border-color:rgba(244,191,95,.42);background:linear-gradient(135deg,rgba(81,53,17,.82),rgba(9,19,16,.95))}
.control-card.ready{border-color:rgba(71,229,141,.32);background:linear-gradient(135deg,rgba(19,61,42,.76),rgba(9,19,16,.95))}
.control-label{color:var(--muted);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.control-value{margin-top:8px;font-size:24px;font-weight:850;color:var(--text);overflow-wrap:anywhere}
.control-next{margin-top:8px;color:var(--muted);font-size:12px;line-height:1.4;overflow-wrap:anywhere}
.nextbar{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid rgba(71,229,141,.34);background:rgba(13,24,21,.96);border-radius:8px;padding:13px 15px;margin:-2px 0 14px}
.nextbar b{color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.nextbar code{display:inline-block;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.nextbar span{color:var(--muted);font-size:12px;overflow-wrap:anywhere}
.cockpit{border:1px solid rgba(71,229,141,.26);background:linear-gradient(135deg,rgba(13,24,21,.96),rgba(9,19,16,.95));border-radius:8px;padding:14px;margin:0 0 14px}
.cockpit-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.cockpit-title{color:var(--green);font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}
.cockpit-rule{color:var(--muted);font-size:12px;line-height:1.4}
.cockpit-grid{display:grid;grid-template-columns:1.1fr 1.5fr 1fr .8fr;gap:8px}
.cockpit-item{border:1px solid var(--line2);background:rgba(8,17,15,.74);border-radius:8px;padding:10px;min-width:0}
.cockpit-k{color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.cockpit-v{margin-top:6px;font-size:13px;font-weight:800;overflow-wrap:anywhere}
.brief{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 14px}
.brief-item{border:1px solid var(--line2);background:rgba(9,19,16,.9);border-radius:8px;padding:10px;min-width:0}
.brief-k{color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.brief-v{margin-top:5px;font-size:13px;font-weight:700;color:var(--text);overflow-wrap:anywhere}
.audit{display:grid;grid-template-columns:1.2fr repeat(3,minmax(0,.8fr));gap:12px;margin:14px 0}
.audit-item{border:1px solid var(--line);background:rgba(13,24,21,.92);border-radius:8px;padding:14px;min-width:0}
.audit-item.primary{background:linear-gradient(135deg,rgba(19,61,42,.88),rgba(9,19,16,.95))}
.audit-item.review{background:linear-gradient(135deg,rgba(81,53,17,.88),rgba(9,19,16,.95));border-color:rgba(244,191,95,.42)}
.audit-k{color:var(--muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.audit-v{margin-top:7px;font-size:20px;font-weight:800;color:var(--text);overflow-wrap:anywhere}
.audit-hint{margin-top:6px;color:var(--muted);font-size:12px;line-height:1.4}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0 18px}
.metric,.card{border:1px solid var(--line);background:rgba(13,24,21,.9);border-radius:8px}
.card.essential{border-color:rgba(71,229,141,.28)}
.metric{padding:14px}.metric .num{font-size:28px;font-weight:800;color:var(--green);line-height:1}.metric .label{margin-top:7px;color:var(--muted);font-size:12px}
.layout{display:grid;grid-template-columns:1.35fr .9fr;gap:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.card{padding:16px;min-width:0}.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.pill{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--green2);color:var(--green);border-radius:999px;padding:4px 9px;font-size:12px;font-weight:700}
.pill.warn{background:rgba(244,191,95,.12);border-color:rgba(244,191,95,.35);color:var(--amber)}
.pill.off{background:#1c2421;color:var(--muted)}
table{width:100%;border-collapse:collapse}td,th{border-top:1px solid var(--line2);padding:10px 0;text-align:left;vertical-align:top}th{width:42%;color:var(--muted);font-weight:600}td{color:var(--text);overflow-wrap:anywhere}
code{color:var(--code);background:#0a2017;border:1px solid #17462f;padding:2px 6px;border-radius:5px}
.warnings{display:grid;gap:9px}.warning{border:1px solid rgba(244,191,95,.35);background:rgba(244,191,95,.08);border-radius:8px;padding:11px;color:#ffe3a9}
.okline{border:1px solid rgba(71,229,141,.32);background:rgba(71,229,141,.08);border-radius:8px;padding:12px;color:var(--green)}
.agents{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.agent{border:1px solid var(--line2);border-radius:8px;padding:10px;background:#0a1412}.agent strong{display:block}.agent span{color:var(--muted);font-size:12px}
.timeline{display:grid;gap:10px}.event{display:grid;grid-template-columns:108px 1fr;gap:12px;border-top:1px solid var(--line2);padding-top:10px}.event time{color:var(--muted);font-size:12px}.event b{color:var(--green)}
.path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--muted);font-size:12px;overflow-wrap:anywhere}
@media (max-width:860px){header,.layout{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.agents{grid-template-columns:1fr}}
@media (max-width:860px){.control{grid-template-columns:1fr}}
@media (max-width:860px){.nextbar{grid-template-columns:1fr}}
@media (max-width:860px){.cockpit-grid{grid-template-columns:1fr 1fr}}
@media (max-width:860px){.brief{grid-template-columns:1fr 1fr}}
@media (max-width:860px){.audit{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.shell{padding:14px}.metrics{grid-template-columns:1fr}.event{grid-template-columns:1fr}h1{font-size:32px}}
@media (max-width:520px){.brief{grid-template-columns:1fr}}
@media (max-width:520px){.cockpit-head{display:block}.cockpit-rule{margin-top:6px}.cockpit-grid{grid-template-columns:1fr}}
@media (max-width:520px){.audit{grid-template-columns:1fr}}`;
}

export function dashboardDocument(data, clientScript) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aienvmap dashboard</title>
<style>
${dashboardStyle()}
</style>
</head>
<body>
<main class="shell" id="app"></main>
<script type="application/json" id="data">${escapeHtml(data)}</script>
<script>
${clientScript}
</script>
</main>
</body>
</html>`;
}

export function renderDashboard(manifest, timeline = [], warnings = [], intents = [], policy = {}) {
  const data = JSON.stringify(dashboardPayload(manifest, timeline, warnings, intents, policy));
  return dashboardDocument(data, `
const {manifest,timeline,warnings,intents,policy,releaseReadiness,schemaQualitySignals,schemaAiAdoptionDecision,schemaAgentDiscovery}=JSON.parse(document.getElementById('data').textContent);
function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
const entries=o=>Object.entries(o||{});
const rows=o=>entries(o).map(([k,v])=>\`<tr><th>\${esc(k)}</th><td><code>\${esc(String(v))}</code></td></tr>\`).join('')||'<tr><td colspan="2">None detected</td></tr>';
const inventoryGroups=manifest.inventory?.tools||{};
const inventoryCount=Object.values(inventoryGroups).reduce((sum,items)=>sum+(Array.isArray(items)?items.length:0),0);
const inventoryHtml=manifest.inventory?.enabled?('<table>'+Object.entries(inventoryGroups).map(([k,v])=>\`<tr><th>\${esc(k)}</th><td><code>\${Array.isArray(v)?v.length:0} tools</code></td></tr>\`).join('')+'</table>'):'<div class="okline">Deep global inventory is off. Run <code>aienvmap sync --deep</code> when an AI needs global tool awareness.</div>';
const deps=manifest.dependencySnapshot||{};
const depSummary=deps.summary||{ecosystems:[],manifests:0,packages:0};
const depPackages=deps.packages||[];
const depHtml=depPackages.length?'<table><tr><th>Packages</th><td><code>'+esc(depSummary.packages||0)+'</code></td></tr><tr><th>Ecosystems</th><td><code>'+esc((depSummary.ecosystems||[]).join(', ')||'none')+'</code></td></tr><tr><th>Manifests</th><td><code>'+esc((deps.manifests||[]).join(', ')||'none')+'</code></td></tr></table><div class="timeline">'+depPackages.slice(0,8).map(p=>\`<div class="event"><time>\${esc(p.ecosystem)}</time><div><b>\${esc(p.name)}</b> <code>\${esc(p.version)}</code><div class="path">\${esc(p.manifest)} / \${esc(p.group)}</div></div></div>\`).join('')+'</div>':'<div class="okline">No project dependency manifests detected.</div>';
const lightSbom=manifest.lightSbom||{};
const lightSbomSummary=lightSbom.summary||{};
const pmPolicy=lightSbom.packageManagerPolicy||{};
const topRisk=lightSbom.topRisk||[];
const riskSummary=lightSbom.riskSummary||{};
const dependencyHints=lightSbom.dependencyChangeHints||[];
const aiDependencyReview=lightSbom.aiDependencyReview||{};
${dashboardSbomClientScripts()}
const lightSbomHtml=\`<table><tr><th>Packages</th><td><code>\${esc(lightSbomSummary.packages||0)}</code></td></tr><tr><th>Vulnerabilities</th><td><code>\${esc(lightSbomSummary.vulnerabilities||0)}</code></td></tr><tr><th>Direct vulnerable</th><td><code>\${esc(lightSbomSummary.directVulnerablePackages||0)}</code></td></tr><tr><th>Manifests</th><td><code>\${esc((lightSbomSummary.manifests||[]).join(', ')||'none')}</code></td></tr><tr><th>Lockfiles</th><td><code>\${esc((lightSbomSummary.lockfiles||[]).map(l=>l.file).join(', ')||'none')}</code></td></tr></table><h3 style="margin-top:12px">AI Use</h3>\${aiUseHtml}<h3 style="margin-top:12px">Dependency Quick Check</h3>\${dependencyQuickCheckHtml}<h3 style="margin-top:12px">Dependency Coordination</h3>\${dependencyCoordinationHtml}<h3 style="margin-top:12px">Scanner Guidance</h3>\${scannerGuidanceHtml}<h3 style="margin-top:12px">AI Review Plan</h3>\${aiReviewPlanHtml}<h3 style="margin-top:12px">AI Dependency Review</h3>\${aiDependencyReviewHtml}<h3 style="margin-top:12px">Risk summary</h3>\${riskSummaryHtml}<h3 style="margin-top:12px">Package manager policy</h3>\${pmPolicyHtml}\${topRisk.length?'<div class="timeline">'+topRisk.slice(0,5).map(p=>\`<div class="event"><time>\${esc(p.priority)}</time><div><b>\${esc(p.name)}</b> \${esc(p.severity)} \${p.directDependency?'<code>direct</code>':'<code>transitive</code>'}<div class="path">\${esc(p.manifest||p.ecosystem)} \${esc(p.version||'')}</div></div></div>\`).join('')+'</div>':'<div class="okline">No high-risk package summary in the current light SBOM.</div>'}<h3 style="margin-top:12px">Dependency change hints</h3>\${dependencyHintsHtml}\`;
const sec=manifest.security||{};
const secSummary=sec.summary||{total:0,critical:0,high:0,moderate:0,low:0,info:0};
const secPackages=sec.topPackages||[];
const securityFix=p=>p.fixVersions?.length?\`fix \${p.fixVersions.slice(0,3).join(', ')}\`:(p.fixAvailable?'fix available':'review required');
const securityRefs=p=>p.advisories?.length?\` - \${p.advisories.map(a=>a.id||a.title).filter(Boolean).slice(0,2).join(', ')}\`:'';
const securityDep=p=>p.directDependency&&p.dependency?\`<div class="path">\${esc(p.dependency.manifest)} / \${esc(p.dependency.group)} / \${esc(p.dependency.version)}</div>\`:'<div class="path">not found in dependency snapshot</div>';
const securityPriority=p=>p.remediationPriority?\`<code>\${esc(p.remediationPriority.level)} \${esc(p.remediationPriority.score)}</code> \`:'';
const securityHtml=sec.enabled?\`<table><tr><th>Total</th><td><code>\${esc(secSummary.total||0)}</code></td></tr><tr><th>Critical</th><td><code>\${esc(secSummary.critical||0)}</code></td></tr><tr><th>High</th><td><code>\${esc(secSummary.high||0)}</code></td></tr><tr><th>Moderate</th><td><code>\${esc(secSummary.moderate||0)}</code></td></tr><tr><th>Low</th><td><code>\${esc(secSummary.low||0)}</code></td></tr></table>\${secPackages.length?'<div class="timeline">'+secPackages.slice(0,5).map(p=>\`<div class="event"><time>\${esc(p.severity)}</time><div><b>\${esc(p.name)}</b> \${securityPriority(p)}\${esc(securityFix(p))}\${esc(securityRefs(p))}\${securityDep(p)}</div></div>\`).join('')+'</div>':'<div class="okline" style="margin-top:10px">No vulnerable packages reported.</div>'}\`:'<div class="okline">Security scan is off. Run <code>aienvmap sync --security</code> for read-only vulnerability summary.</div>';
const change=c=>c.type==='changed'?\`\${c.scope} \${c.key}: \${c.before} -> \${c.after}\`:\`\${c.scope} \${c.key}: \${c.type} \${c.after||c.before}\`;
const timelineLabel=t=>t.change?change(t.change):(t.summary||t.action||t.type||'recorded change');
${dashboardAgentClientScript()}
const warnHtml=warnings.length?'<div class="warnings">'+warnings.map(w=>\`<div class="warning">\${esc(w.message)}</div>\`).join('')+'</div>':'<div class="okline">No blocking environment warnings detected.</div>';
const timelineHtml=timeline.length?'<div class="timeline">'+timeline.slice(-8).reverse().map(t=>\`<div class="event"><time>\${esc(t.at.replace('T',' ').slice(0,16))}</time><div><b>\${esc(t.actor||'system')}</b> \${esc(timelineLabel(t))}</div></div>\`).join('')+'</div>':'<div class="okline">No previous environment changes recorded.</div>';
const intentsHtml=intents.length?'<div class="timeline">'+intents.slice(-6).reverse().map(i=>\`<div class="event"><time>\${esc(i.at.replace('T',' ').slice(0,16))}</time><div><b>\${esc(i.actor)}</b> plans \${esc(i.action)}</div></div>\`).join('')+'</div>':'<div class="okline">No pending agent intents recorded.</div>';
const policyHtml=entries(policy).length?\`<table>\${rows(policy)}</table>\`:'<div class="okline">No explicit version policy set.</div>';
const actions=manifest.recommendedActions||[];
const actionsHtml=actions.length?'<div class="timeline">'+actions.slice(0,6).map(a=>\`<div class="event"><time>\${esc(a.priority)}</time><div><b>\${esc(a.category)}</b> \${esc(a.summary)}\${a.command?\`<div class="path">\${esc(a.command)}</div>\`:''}</div></div>\`).join('')+'</div>':'<div class="okline">No recommended actions. Continue project-local work.</div>';
const topAction=actions[0]||{};
const plan=manifest.planArtifacts||{};
const planHtml=plan.markdown||plan.json?\`<table><tr><th>Markdown</th><td>\${plan.markdown?'<a href="plan.md">plan.md</a>':'not written'}</td></tr><tr><th>JSON</th><td>\${plan.json?'<a href="plan.json">plan.json</a>':'not written'}</td></tr></table>\`:'<div class="okline">No plan artifacts yet. Run <code>aienvmap plan --write</code>.</div>';
const sbomArtifactHtml='<table><tr><th>JSON</th><td><a href="sbom.json">sbom.json</a></td></tr><tr><th>CDX Lite</th><td><a href="sbom.cdx.json">sbom.cdx.json</a></td></tr><tr><th>Command</th><td><code>aienvmap sbom --write</code></td></tr></table>';
const remediation=manifest.planRemediation||[];
const remediationFix=r=>r.fixVersions?.length?\`fix \${r.fixVersions.join(', ')}\`:(r.fixAvailable?'fix available':'review required');
const remediationRefs=r=>r.advisories?.length?\` - \${r.advisories.join(', ')}\`:'';
const remediationHtml=remediation.length?'<div class="timeline">'+remediation.map(r=>\`<div class="event"><time>\${esc(r.severity)}</time><div><b>\${esc(r.package)}</b> \${esc(remediationFix(r))}\${esc(remediationRefs(r))}</div></div>\`).join('')+'</div>':'<div class="okline">No remediation steps in the current plan.</div>';
const envSteps=manifest.planEnvironment||[];
const envStepsHtml=envSteps.length?'<div class="timeline">'+envSteps.map(s=>\`<div class="event"><time>\${esc(s.category)}</time><div><b>\${esc(s.code)}</b> \${esc(s.summary)}</div></div>\`).join('')+'</div>':'<div class="okline">No environment steps in the current plan.</div>';
const ciReadiness=manifest.ciReadiness||[];
const ciHasFailure=ciReadiness.some(s=>s.status==='fail');
const ciReadinessHtml=ciReadiness.length?'<table>'+ciReadiness.map(s=>\`<tr><th>\${esc(s.scope)}</th><td><code>\${esc(s.status)}</code>\${s.matchedWarningCodes?.length?\` \${esc(s.matchedWarningCodes.join(', '))}\`:''}</td></tr>\`).join('')+'</table>':'<div class="okline">Run <code>aienvmap doctor --strict security|policy|coordination|all</code> to choose CI enforcement scope.</div>';
const enforcementProfile=manifest.preflight?.enforcementProfile||{};
const strictCommands=enforcementProfile.strictCommands||[];
const gate=enforcementProfile.gate||{};
const strictPlan=enforcementProfile.strictPlan||{};
const strictDecision=enforcementProfile.strictDecision||{};
const strictRecommendation=manifest.preflight?.strictRecommendation||{};
const enforcementHtml=\`<table><tr><th>Default</th><td><code>\${esc(gate.defaultMode||enforcementProfile.defaultMode||'advisory')}</code> \${esc(gate.localDefault||'warn-only')}</td></tr><tr><th>Local</th><td><code>\${esc(strictRecommendation.localCommand||strictDecision.localCommand||'aienvmap doctor --json')}</code> \${esc(strictRecommendation.localBehavior||strictDecision.local||'warn-only')}</td></tr><tr><th>Fail local</th><td><code>\${esc(strictRecommendation.shouldFailLocal?'yes':'no')}</code></td></tr><tr><th>Recommended scope</th><td><code>\${esc(strictRecommendation.recommendedScope||strictDecision.recommendedScope||strictPlan.recommendedStrictScope||'all')}</code></td></tr><tr><th>CI</th><td><code>\${esc(strictRecommendation.ciCommand||strictDecision.ciCommand||strictPlan.ciCommand||'aienvmap doctor --strict all --json')}</code></td></tr><tr><th>Release</th><td><code>\${esc(strictRecommendation.releaseCommand||'aienvmap doctor --strict all --json')}</code></td></tr></table><div class="timeline">\${strictCommands.slice(0,4).map(cmd=>\`<div class="event"><time>CI</time><div><code>\${esc(cmd)}</code></div></div>\`).join('')}</div><div class="path">\${esc(strictRecommendation.rule||strictDecision.rule||strictPlan.rule||gate.rule||enforcementProfile.reason||'Warnings stay advisory unless strict mode is requested.')}</div>\`;
${dashboardReleaseClientScripts()}
const contract=manifest.preflight?.contract||{};
const contractHtml=contract.name?\`<table><tr><th>Name</th><td><code>\${esc(contract.name)}</code></td></tr><tr><th>Version</th><td><code>\${esc(contract.version||1)}</code></td></tr><tr><th>Stability</th><td><code>\${esc(contract.stability||'additive')}</code></td></tr><tr><th>AI fields</th><td>\${esc((contract.aiEntryFields||[]).join(', ')||'none')}</td></tr></table><div class="path">\${esc(contract.rule||'Ignore unknown fields.')}</div>\`:'<div class="okline">Run <code>aienvmap status --write</code> to include AI contract metadata.</div>';
const intentTargets=manifest.preflight?.intentTargets||[];
const intentTargetsHtml=intentTargets.length?'<div class="timeline">'+intentTargets.slice(0,5).map(t=>\`<div class="event"><time>\${esc(t.target)}</time><div><b>\${esc(t.target)}</b> \${esc(t.reason||'Record this target before environment changes.')}\${t.command?\`<div class="path">\${esc(t.command)}</div>\`:''}</div></div>\`).join('')+'</div>':'<div class="okline">No specific target recommendation. Use <code>aienvmap intent --actor agent:id --action planned-change</code>.</div>';
const followUps=manifest.preflight?.followUps||[];
const followUpPlan=manifest.preflight?.followUpPlan||{};
const followUpPlanHtml=followUpPlan.status?\`<table><tr><th>Status</th><td><code>\${esc(followUpPlan.status)}</code></td></tr><tr><th>Targets</th><td>\${esc((followUpPlan.targets||[]).join(', ')||'none')}</td></tr><tr><th>Next</th><td><code>\${esc(followUpPlan.nextCommand||'aienvmap status --json')}</code></td></tr></table><div class="path">\${esc(followUpPlan.rule||followUpPlan.reason||'Resolve follow-ups before shared environment changes.')}</div>\`:'';
const followUpsHtml=(followUpPlanHtml||'')+(followUps.length?'<div class="timeline">'+followUps.slice(0,5).map(f=>\`<div class="event"><time>\${esc(f.target||'env')}</time><div><b>\${esc(f.summary||'follow-up')}</b> \${esc(f.reason||'Refresh shared context.')}\${f.commands?.length?\`<div class="path">\${esc(f.commands.join(' -> '))}</div>\`:''}</div></div>\`).join('')+'</div>':'<div class="okline">No pending follow-ups after environment records.</div>');
const agentActivity=manifest.preflight?.agentActivity||{};
const activityTargets=agentActivity.targets||[];
const activityHtml=activityTargets.length?'<div class="timeline">'+activityTargets.slice(0,5).map(a=>\`<div class="event"><time>\${esc(a.target||'env')}</time><div><b>\${esc((a.actors||[]).join(', ')||'unknown')}</b> \${esc(a.count||0)} record(s) \${a.multiActor?'<code>multi-agent</code>':'<code>single-agent</code>'}\${a.latestSummary?\`<div class="path">\${esc(a.latestSummary)}</div>\`:''}</div></div>\`).join('')+'</div><div class="path">'+esc(agentActivity.next||'Review activity before environment changes.')+'</div>':'<div class="okline">No recorded environment activity needs coordination.</div>';
const collaboration=manifest.preflight?.collaboration||{};
const collaborationHtml=\`<table><tr><th>Status</th><td><code>\${esc(collaboration.status||'unknown')}</code> \${esc(collaboration.mode||'advisory')}</td></tr><tr><th>Targets</th><td>\${esc((collaboration.activeTargets||[]).join(', ')||'none')}</td></tr><tr><th>Project work</th><td><code>\${esc(collaboration.projectLocalWork||'allowed')}</code></td></tr><tr><th>Env changes</th><td><code>\${esc(collaboration.environmentChanges||'intent-first')}</code></td></tr><tr><th>Next</th><td><code>\${esc(collaboration.nextCommand||'aienvmap status --json')}</code></td></tr></table><div class="timeline">\${(collaboration.reviewSignals||[]).slice(0,4).map(signal=>\`<div class="event"><time>review</time><div>\${esc(signal)}</div></div>\`).join('')}</div><div class="path">\${esc(collaboration.rule||'Record intent before shared environment changes.')}</div>\`;
const maintenanceLoop=manifest.preflight?.maintenanceLoop||{};
${dashboardEnvironmentProtocolClientScript()}
const dependencyReadSet=manifest.preflight?.dependencyReadSet||[];
const dependencyProtocol=manifest.preflight?.dependencyChangeProtocol||{};
${dashboardDependencyReadSetClientScript()}
${dashboardDependencyProtocolClientScript()}
${dashboardLayoutClientScripts()}
const reviewRequired=warnings.length>0||intents.length>0;
const recentChanges=timeline.slice(-8).length;
const trustState=manifest.trust?.state||'observed';
const nextAction=reviewRequired?'Review before environment changes':'Proceed with project-local work';
const auditItem=(key,value,hint,klass='')=>\`<div class="audit-item \${klass}"><div class="audit-k">\${key}</div><div class="audit-v">\${value}</div><div class="audit-hint">\${hint}</div></div>\`;
const controlCard=(label,value,next,klass='')=>\`<div class="control-card \${klass}"><div class="control-label">\${label}</div><div class="control-value">\${esc(value)}</div><div class="control-next">\${esc(next)}</div></div>\`;
const driftLabel=warnings.length?'detected':'none';
const aiSession=manifest.preflight?.aiSession||{};
const aiSessionStart=aiSession.start||['aienvmap status --json','aienvmap context --json'];
const aiBootstrap=manifest.preflight?.aiBootstrap||{};
const artifactFreshness=manifest.preflight?.artifactFreshness||{};
const nextAgent=manifest.preflight?.nextAgent||{};
const aiReadiness=manifest.preflight?.aiReadiness||{};
const aiReadinessSignals=(aiReadiness.signals||[]).slice(0,3);
const aiReadinessHint=(aiReadiness.next||'Run aienvmap context --json for details.')+(aiReadinessSignals.length?' Signals: '+aiReadinessSignals.join('; '):'');
const aiReadyValue=aiReadiness.level||'unknown';
const aiReadyClass=aiReadyValue==='ready'?'ready':'review';
const artifactFreshnessValue=artifactFreshness.state||'unknown';
const artifactFreshnessClass=artifactFreshnessValue==='fresh'?'ready':'review';
const artifactFreshnessNext=artifactFreshness.nextCommand||artifactFreshness.refreshCommand||'aienvmap sync';
const collaborationValue=collaboration.status||'unknown';
const collaborationClass=collaborationValue==='clear'?'ready':'review';
const sbomRiskValue=riskSummary.level||'unknown';
const sbomRiskClass=['urgent','high','medium'].includes(sbomRiskValue)?'review':'ready';
const sbomRiskScore=riskSummary.score!==undefined?' ('+riskSummary.score+')':'';
const sbomRiskNext=riskSummary.next||aiDependencyReview.beforeDependencyChange?.[0]||'Run aienvmap sbom --json for dependency context.';
const nextCommand=aiBootstrap.nextSafeCommand||manifest.preflight?.nextSafeCommand||manifest.preflight?.nextCommand||maintenanceLoop.nextCommand||topAction.command||collaboration.nextCommand||'aienvmap status --json';
const nextReason=topAction.summary||aiBootstrap.rule||maintenanceLoop.rule||collaboration.rule||riskSummary.next||'Read status/context before changing shared environment state.';
const maintenanceNext=maintenanceLoop.nextCommand||nextCommand;
const coordination=manifest.preflight?.coordination||{};
const conflictTargets=coordination.conflictTargets||[];
const handoffFiles=nextAgent.dependencyFiles?.length?nextAgent.dependencyFiles:(dependencyReadSet[0]?[dependencyReadSet[0].manifest,...(dependencyReadSet[0].lockfiles||[])].filter(Boolean):[]);
const handoffNext=nextAgent.rule||(reviewRequired?'Review warnings and open intents':'Continue project-local work');
const aiEntry=manifest.preflight?.artifacts?.discovery||'.aienvmap/discovery.json';
const startHere=manifest.preflight?.artifacts?.startHere||'.aienvmap/README.md';
const firstRead=aiBootstrap.readFirst||nextAgent.readFirst||'.aienvmap/status.json';
const reviewTargets=[...new Set([...(conflictTargets||[]),...(collaboration.activeTargets||[]),...(riskSummary.reviewTargets||[])].filter(Boolean))];
const primaryReviewTarget=reviewTargets[0]||'none';
const safeMode=aiBootstrap.localMode||enforcementProfile.gate?.localDefault||enforcementProfile.localOperation||'warn-only';
const bootstrapState=[aiBootstrap.projectLocalWork||'allowed',aiBootstrap.environmentChanges||'intent-first'].join(' / ');
const agentDiscovery=manifest.preflight?.agentPointers?.discovery||((agentPointerCount||0)>0?'ready':'missing: run aienvmap onboard');
const agentDiscoveryNext=manifest.preflight?.agentPointers?.next||'Run aienvmap onboard to install AI instruction-file pointers.';
const briefItem=(key,value)=>\`<div class="brief-item"><div class="brief-k">\${key}</div><div class="brief-v">\${esc(value)}</div></div>\`;
const handoffHtml=\`<table><tr><th>Status</th><td>\${reviewRequired?'review-required':'clear'}</td></tr><tr><th>Trust</th><td><code>\${esc(trustState)}</code></td></tr><tr><th>Read first</th><td><code>\${esc(firstRead)}</code></td></tr><tr><th>Dependency files</th><td>\${handoffFiles.length?'<code>'+esc(handoffFiles.join(', '))+'</code>':'none'}</td></tr><tr><th>Conflicts</th><td>\${conflictTargets.length?'<code>'+esc(conflictTargets.join(', '))+'</code>':'none'}</td></tr><tr><th>Next</th><td>\${esc(handoffNext)}</td></tr></table>\`;
const aiSessionHtml=\`<table><tr><th>Start</th><td><code>\${esc(aiSessionStart.join(' -> '))}</code></td></tr><tr><th>If stale</th><td><code>\${esc(aiSession.ifMissingOrStale||'aienvmap sync')}</code></td></tr><tr><th>Before env</th><td><code>\${esc(aiSession.beforeEnvironmentChange||'aienvmap intent --actor agent:id --action planned-change --target environment')}</code></td></tr><tr><th>After env</th><td><code>\${esc(aiSession.afterEnvironmentChange||'aienvmap checkpoint --actor agent:id --summary what-changed --target environment')}</code></td></tr><tr><th>Handoff</th><td><code>\${esc(aiSession.handoff||'aienvmap handoff --record --actor agent:id')}</code></td></tr><tr><th>Avoid</th><td>\${esc((aiSession.avoid||[]).slice(0,2).join('; ')||'No extra avoid guidance.')}</td></tr></table><div class="path">\${esc(aiSession.rule||'Read status first, sync only when stale or missing, and record intent before shared environment changes.')}</div>\`;
${dashboardStateCardsClientScript()}
document.getElementById('app').innerHTML=\`
<header>
  <div>
    <div class="eyebrow">aienvmap dashboard</div>
    <h1>AI environment map</h1>
    <p class="sub">An AI-first environment map and change ledger for agents that share one development machine.</p>
  </div>
  <div class="stamp"><b>\${warnings.length?'review':'clear'}</b><span>\${esc(manifest.workspace.name)}</span><span>\${esc(manifest.generatedAt)}</span></div>
</header>
<section class="control" aria-label="AI control strip">
  \${controlCard('AI readiness',aiReadyValue,aiReadiness.next||'Run aienvmap context --json for details.',aiReadyClass)}
  \${controlCard('Freshness',artifactFreshnessValue,artifactFreshnessNext,artifactFreshnessClass)}
  \${controlCard('Collaboration',collaborationValue,collaboration.nextCommand||'aienvmap status --json',collaborationClass)}
  \${controlCard('SBOM risk',sbomRiskValue+sbomRiskScore,sbomRiskNext,sbomRiskClass)}
</section>
<section class="nextbar" aria-label="Next command">
  <b>Next command</b>
  <code>\${esc(nextCommand)}</code>
  <span>\${esc(nextReason)}</span>
</section>
<section class="cockpit" aria-label="10-second review">
  <div class="cockpit-head">
    <div class="cockpit-title">10-second review</div>
    <div class="cockpit-rule">For humans: check this before any shared environment change.</div>
  </div>
  <div class="cockpit-grid">
    <div class="cockpit-item"><div class="cockpit-k">AI entry</div><div class="cockpit-v">\${esc(aiEntry)}</div></div>
    <div class="cockpit-item"><div class="cockpit-k">Next command</div><div class="cockpit-v"><code>\${esc(nextCommand)}</code></div></div>
    <div class="cockpit-item"><div class="cockpit-k">Review target</div><div class="cockpit-v">\${esc(primaryReviewTarget)}</div></div>
    <div class="cockpit-item"><div class="cockpit-k">Mode</div><div class="cockpit-v">\${esc(safeMode)}</div></div>
  </div>
</section>
<section class="brief" aria-label="First read">
  \${briefItem('AI bootstrap',bootstrapState)}
  \${briefItem('Status',reviewRequired?'review required':'clear')}
  \${briefItem('Freshness',artifactFreshnessValue+' / '+artifactFreshnessNext)}
  \${briefItem('AI entry',aiEntry)}
  \${briefItem('Maintenance',maintenanceNext)}
  \${briefItem('Start here',startHere)}
  \${briefItem('Read first',firstRead)}
  \${briefItem('AI discovery',agentDiscoveryDecision+' / '+agentDiscovery)}
  \${briefItem('Review targets',reviewTargets.length?reviewTargets.slice(0,4).join(', '):'none')}
  \${briefItem('Local mode',safeMode)}
</section>
<section class="audit" aria-label="Audit summary">
  \${auditItem('AI decision',reviewRequired?'review required':'can proceed',nextAction,reviewRequired?'review':'primary')}
  \${auditItem('AI readiness',aiReadiness.level||'unknown',aiReadinessHint,aiReadiness.level==='ready'?'primary':'review')}
  \${auditItem('Runtime drift',driftLabel,warnings.length?'Policy, runtime, or coordination warning detected':'No drift warnings detected',warnings.length?'review':'')}
  \${auditItem('Open env changes',String(intents.length),intents.length?'Resolve or coordinate before changes':'No pending env changes')}
  \${auditItem('Trust',trustState,trustState==='verified'?'Human or CI verified':'Machine observed; not AI-verified')}
</section>
<section class="metrics">
  <div class="metric"><div class="num">\${entries(manifest.runtimes).length}</div><div class="label">runtimes</div></div>
  <div class="metric"><div class="num">\${entries(manifest.packageManagers).length}</div><div class="label">package managers</div></div>
  <div class="metric"><div class="num">\${warnings.length}</div><div class="label">warnings</div></div>
  <div class="metric"><div class="num">\${intents.length}</div><div class="label">open intents</div></div>
</section>
<section class="layout">
  <div class="grid">
    \${mainCardsHtml}
  </div>
  <aside>
    \${supportCardsHtml}
    <div style="height:14px"></div>
    \${operationalCardsHtml}
    <div style="height:14px"></div>
    \${stateCardsHtml}
  </aside>
</section>
<section style="margin-top:14px">\${card('Environment Ledger','',timelineHtml)}</section>
\`;
`);
}

function pushMap(lines, title, obj = {}) {
  lines.push(`### ${title}`, "");
  const entries = Object.entries(obj);
  if (!entries.length) {
    lines.push("- None detected.", "");
    return;
  }
  for (const [key, value] of entries) lines.push(`- ${key}: ${value}`);
  lines.push("");
}

function formatChange(change) {
  if (change.type === "changed") return `${change.scope} ${change.key} changed ${change.before} -> ${change.after}`;
  return `${change.scope} ${change.key} ${change.type} ${change.after ?? change.before}`;
}

function formatTimeline(item) {
  if (item.change) return `${item.actor || "system"}: ${formatChange(item.change)}`;
  const details = [item.target, item.before && item.after ? `${item.before} -> ${item.after}` : "", item.evidence ? `evidence: ${item.evidence}` : ""]
    .filter(Boolean)
    .join("; ");
  return `${item.actor || "unknown"}: ${item.summary || item.action || item.type}${details ? ` (${details})` : ""}`;
}

function contextLines(manifest, warnings, intents) {
  const preflight = manifest.preflight || {};
  const aiBootstrap = preflight.aiBootstrap || {};
  return [
    `- Status: ${warnings.length ? "review-required" : "clear"}`,
    `- Next: ${aiBootstrap.nextSafeCommand || preflight.nextSafeCommand || preflight.nextCommand || (warnings.length ? "review warnings before environment changes" : "continue with project-local work")}`,
    `- Bootstrap: ${aiBootstrap.projectLocalWork || "allowed"} / ${aiBootstrap.environmentChanges || "intent-first"} / ${aiBootstrap.localMode || "advisory"}`,
    `- Read first: ${aiBootstrap.readFirst || ".aienvmap/status.json"} -> ${aiBootstrap.detailCommand || "aienvmap context --json"}`,
    `- Node: ${manifest.runtimes.node || "not detected"}`,
    `- Python: ${manifest.runtimes.python || manifest.runtimes.python3 || "not detected"}`,
    `- Docker: ${manifest.containers.docker ? "available" : "not detected"}`,
    `- Open intents: ${intents.length}`
  ];
}

function inventoryLines(inventory = {}) {
  if (!inventory.enabled) return ["- Mode: basic", "- Deep global inventory is disabled. Run `aienvmap sync --deep` when needed."];
  const groups = Object.entries(inventory.tools || {});
  if (!groups.length) return ["- Mode: deep", "- No global tools detected by optional scanners."];
  const lines = ["- Mode: deep"];
  for (const [name, items] of groups) {
    lines.push(`- ${name}: ${items.length} tools`);
  }
  return lines;
}

function dependencyLines(snapshot = {}) {
  const summary = snapshot.summary || {};
  const packages = snapshot.packages || [];
  const ecosystems = summary.ecosystems?.length ? summary.ecosystems.join(", ") : "none";
  const lines = [
    `- Mode: ${snapshot.mode || "snapshot"}`,
    `- Manifests: ${(snapshot.manifests || []).join(", ") || "none"}`,
    `- Ecosystems: ${ecosystems}`,
    `- Packages: ${summary.packages || 0}`
  ];
  for (const pkg of packages.slice(0, 10)) {
    lines.push(`- ${pkg.ecosystem}/${pkg.name}: ${pkg.version} (${pkg.manifest})`);
  }
  return lines;
}

function lightSbomLines(lightSbom = {}) {
  const summary = lightSbom.summary || {};
  const lines = [
    `- Mode: ${lightSbom.mode || "light-sbom"}`,
    `- Packages: ${summary.packages || 0}`,
    `- Vulnerabilities: ${summary.vulnerabilities || 0}`,
    `- Direct vulnerable packages: ${summary.directVulnerablePackages || 0}`,
    `- Transitive or unmatched vulnerable packages: ${summary.transitiveOrUnmatchedVulnerablePackages || 0}`,
    `- Lockfiles: ${(summary.lockfiles || []).map((item) => item.file).join(", ") || "none"}`
  ];
  if (lightSbom.source || lightSbom.confidence) {
    lines.push(`- Source: ${lightSbom.source?.dependencies || "project manifests"}; vulnerabilities: ${lightSbom.source?.vulnerabilities || "not scanned"}`);
    lines.push(`- Confidence: direct ${lightSbom.confidence?.directDependencies || "unknown"}; transitive ${lightSbom.confidence?.transitiveDependencies || "unknown"}`);
  }
  if (lightSbom.riskSummary) {
    lines.push(`- Risk summary: ${lightSbom.riskSummary.level || "clear"}/${lightSbom.riskSummary.score || 0}; ${lightSbom.riskSummary.next || "no action"}`);
    if (lightSbom.riskSummary.signals?.length) lines.push(`- Risk signals: ${lightSbom.riskSummary.signals.join("; ")}`);
  }
  if (lightSbom.packageManagerPolicy) {
    lines.push(`- Package manager policy: ${lightSbom.packageManagerPolicy.status}`);
    lines.push(`- Package manager guidance: ${lightSbom.packageManagerPolicy.guidance}`);
  }
  const risks = lightSbom.topRisk || [];
  if (risks.length) {
    lines.push("- Top risk:");
    for (const item of risks.slice(0, 8)) {
      lines.push(`  - ${item.name}: ${item.severity}; ${item.priority}/${item.score}; ${item.directDependency ? "direct" : "transitive-or-unmatched"}${item.version ? `; ${item.version}` : ""}`);
    }
  }
  const hints = lightSbom.dependencyChangeHints || [];
  if (hints.length) {
    lines.push("- Dependency change hints:");
    for (const hint of hints.slice(0, 6)) {
      const risk = hint.riskPackages?.length ? `; risk: ${hint.riskPackages.map((pkg) => pkg.name).join(", ")}` : "";
      const lockfiles = hint.lockfiles?.length ? `; lockfiles: ${hint.lockfiles.map((item) => item.file).join(", ")}` : "";
      lines.push(`  - ${hint.manifest}: ${hint.ecosystem}/${hint.manager}; ${hint.packages} packages${risk}${lockfiles}`);
    }
  }
  return lines;
}

function securityLines(security = {}) {
  if (!security.enabled) return ["- Mode: basic", "- Security scan is disabled. Run `aienvmap sync --security` when vulnerability context is needed."];
  const summary = security.summary || {};
  const lines = [
    "- Mode: security",
    `- Total vulnerabilities: ${summary.total || 0}`,
    `- Critical: ${summary.critical || 0}`,
    `- High: ${summary.high || 0}`,
    `- Moderate: ${summary.moderate || 0}`,
    `- Low: ${summary.low || 0}`
  ];
  const packages = security.topPackages || [];
  if (packages.length) {
    lines.push("- Top vulnerable packages:");
    for (const pkg of packages.slice(0, 8)) {
      lines.push(`  - ${pkg.name}: ${pkg.severity}; ${securityPackageNote(pkg)}`);
    }
  }
  return lines;
}

function securityPackageNote(pkg) {
  const fix = pkg.fixVersions?.length ? `fix ${pkg.fixVersions.slice(0, 3).join(", ")}` : pkg.fixAvailable ? "fix available" : "review required";
  const priority = pkg.remediationPriority ? `priority ${pkg.remediationPriority.level}/${pkg.remediationPriority.score}; ` : "";
  const dependency = pkg.directDependency && pkg.dependency ? `; declared in ${pkg.dependency.manifest} ${pkg.dependency.version}` : "; not found in dependency snapshot";
  const advisories = (pkg.advisories || [])
    .map((item) => item.id || item.title)
    .filter(Boolean)
    .slice(0, 2);
  return advisories.length ? `${priority}${fix}${dependency}; advisories ${advisories.join(", ")}` : `${priority}${fix}${dependency}`;
}

function policyLines(policy) {
  const lines = [];
  if (policy.node) lines.push(`- Node version policy: ${policy.node}`);
  if (policy.python) lines.push(`- Python version policy: ${policy.python}`);
  if (policy.packageManager) lines.push(`- Package manager policy: ${policy.packageManager}`);
  lines.push(`- Global installs: ${policy.globalInstalls || "ask-first"}`);
  lines.push(`- Runtime changes: ${policy.runtimeChanges || "ask-first"}`);
  lines.push("- Docker daemon/context changes: ask first.");
  return lines;
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
