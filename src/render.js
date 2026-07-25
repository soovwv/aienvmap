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
.tabs{display:flex;gap:8px;margin:16px 0}
.tab{appearance:none;border:1px solid var(--line);background:#0a1412;color:var(--muted);border-radius:8px;padding:10px 15px;font:inherit;font-weight:750;cursor:pointer}
.tab.active{border-color:rgba(71,229,141,.5);background:var(--green2);color:var(--green)}
.tab-panel[hidden]{display:none}.section-title{margin:22px 0 12px;font-size:19px}.summary-status{margin:14px 0;border:1px solid rgba(71,229,141,.32);background:rgba(71,229,141,.08);border-radius:8px;padding:16px}.summary-status.review{border-color:rgba(244,191,95,.42);background:rgba(244,191,95,.08)}
.tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tool-card{border:1px solid var(--line);background:rgba(13,24,21,.9);border-radius:8px;padding:15px}.tool-name{font-size:16px;font-weight:800}.tool-version{margin-top:8px;color:var(--green);font-size:18px;font-weight:800}.tool-kind{margin-top:6px;color:var(--muted);font-size:12px}.simple-list{display:grid;gap:8px}.simple-item{border:1px solid var(--line2);background:rgba(9,19,16,.9);border-radius:8px;padding:12px}.empty{color:var(--muted)}
@media (max-width:860px){header,.layout{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.agents{grid-template-columns:1fr}}
@media (max-width:860px){.tool-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.tool-grid{grid-template-columns:1fr}}
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

export function dashboardDocument(data, clientScript, style = dashboardStyle()) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aienvmap dashboard</title>
<style>
${style}
</style>
</head>
<body>
<main class="shell" id="app"></main>
<script type="application/json" id="data">${escapeHtml(data)}</script>
<script>
${clientScript}
</script>
</body>
</html>`;
}

export function renderDashboard(manifest, timeline = [], warnings = [], intents = [], policy = {}) {
  const data = JSON.stringify({ manifest, warnings, intents });
  return dashboardDocument(data, dashboardHumanClientScript(), dashboardHumanStyle());
}

function dashboardHumanStyle() {
  return `:root{color-scheme:dark;--bg:#08110f;--panel:#0d1815;--line:#214138;--line2:#172b26;--text:#eefcf5;--muted:#91aa9d;--green:#47e58d;--green2:#133d2a;--amber:#f4bf5f;--orange:#ff9364;--red:#ff4f5e;--code:#d7ffe9}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text)}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(71,229,141,.12),transparent 38%)}.shell{position:relative;max-width:1180px;margin:0 auto;padding:26px 22px 36px}header{border:1px solid var(--line);background:rgba(13,24,21,.96);border-radius:8px;padding:22px;display:grid;grid-template-columns:1fr auto;gap:18px}.eyebrow{color:var(--green);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}h1,h2,p{margin:0}h1{font-size:clamp(28px,4vw,46px);margin-top:8px}.sub{color:var(--muted);margin-top:12px;max-width:680px;line-height:1.55}.stamp{min-width:220px;border:1px solid var(--line2);background:#091310;border-radius:8px;padding:14px}.stamp b{display:block;color:var(--green);font-size:24px}.stamp span{display:block;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.tabs{display:flex;gap:8px;margin:16px 0}.tab{border:1px solid var(--line);background:#0a1412;color:var(--muted);border-radius:8px;padding:10px 15px;font:inherit;font-weight:750;cursor:pointer}.tab.active{border-color:rgba(71,229,141,.5);background:var(--green2);color:var(--green)}.tab-panel[hidden]{display:none}.summary-status{margin:14px 0;border:1px solid rgba(71,229,141,.32);background:rgba(71,229,141,.08);border-radius:8px;padding:16px}.summary-status.review{border-color:rgba(244,191,95,.5);background:rgba(244,191,95,.08)}.summary-status.review b,.metric.alert .num{color:var(--amber)}.summary-status.danger{border-color:rgba(255,79,94,.6);background:rgba(255,79,94,.1)}.summary-status.danger b{color:var(--red)}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0 18px}.metric,.tool-card{border:1px solid var(--line);background:rgba(13,24,21,.9);border-radius:8px}.metric{padding:14px}.num{font-size:28px;font-weight:800;color:var(--green)}.label,.tool-kind{margin-top:7px;color:var(--muted);font-size:12px}.section-title{margin:22px 0 12px;font-size:19px}.environment-groups{display:grid;gap:16px}.environment-group{border:1px solid var(--line);background:rgba(9,19,16,.72);border-radius:8px;padding:14px}.environment-group-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.environment-group-head h3{margin:0;font-size:15px}.group-count{color:var(--green);background:var(--green2);border:1px solid rgba(71,229,141,.32);border-radius:999px;padding:3px 9px;font-size:12px;font-weight:800}.tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tool-card{padding:15px}.tool-name{font-size:16px;font-weight:800}.tool-version{margin-top:8px;color:var(--green);font-size:18px;font-weight:800}.simple-list{display:grid;gap:8px}.simple-item{border:1px solid var(--line2);background:rgba(9,19,16,.9);border-radius:8px;padding:12px}.simple-item.warning{border-color:rgba(244,191,95,.38);background:rgba(244,191,95,.07);color:#ffe0a3}.simple-item.risk-critical{border-color:rgba(255,79,94,.65);background:rgba(255,79,94,.12)}.simple-item.risk-critical b{color:var(--red)}.simple-item.risk-high{border-color:rgba(255,147,100,.55);background:rgba(255,147,100,.09)}.simple-item.risk-high b{color:var(--orange)}.simple-item.risk-moderate{border-color:rgba(244,191,95,.42);background:rgba(244,191,95,.07)}.simple-item.risk-moderate b{color:var(--amber)}.severity{float:right;border:1px solid currentColor;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.severity-critical{color:var(--red);background:rgba(255,79,94,.12)}.severity-high{color:var(--orange);background:rgba(255,147,100,.1)}.severity-moderate{color:var(--amber);background:rgba(244,191,95,.1)}.severity-review{color:var(--muted)}.empty{color:var(--muted)}code{color:var(--code);background:#0a2017;border:1px solid #17462f;padding:2px 6px;border-radius:5px}@media(max-width:860px){header{grid-template-columns:1fr}.metrics,.tool-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.shell{padding:14px}.metrics,.tool-grid{grid-template-columns:1fr}h1{font-size:32px}}`;
}

function dashboardHumanClientScript() {
  return `
const payload=JSON.parse(document.getElementById('data').textContent);
const manifest=payload.manifest||{};
const warnings=Array.isArray(payload.warnings)?payload.warnings:[];
const intents=Array.isArray(payload.intents)?payload.intents:[];
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const entries=value=>value&&typeof value==='object'?Object.entries(value):[];
const list=value=>Array.isArray(value)?value:[];
const app=document.getElementById('app');
const workspace=manifest.workspace||{};
const reviewRequired=warnings.length>0||intents.length>0;
app.innerHTML=\`<header><div><div class="eyebrow">aienvmap dashboard</div><h1>Development environment</h1><p class="sub">A read-only snapshot of detected runtimes, package managers, warnings, and planned environment changes.</p></div><div class="stamp"><b>\${reviewRequired?'review':'clear'}</b><span>\${esc(workspace.name||'workspace')}</span><span>Last checked: \${esc(manifest.generatedAt||'not recorded')}</span></div></header><nav class="tabs" role="tablist" aria-label="Dashboard sections"><button class="tab active" id="tab-overview" role="tab" aria-selected="true" onclick="showDashboardTab('overview')">Environment overview</button><button class="tab" id="tab-sbom" role="tab" aria-selected="false" onclick="showDashboardTab('sbom')">SBOM</button></nav><section class="tab-panel" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview"></section><section class="tab-panel" id="panel-sbom" role="tabpanel" aria-labelledby="tab-sbom" hidden></section>\`;
function panelFailure(title){return \`<div class="summary-status review"><b>\${esc(title)} could not be displayed.</b><div class="tool-kind">The rest of the dashboard is still available. Run <code>aienvmap sync</code> to refresh this snapshot.</div></div>\`}
function renderOverview(){
  const panel=document.getElementById('panel-overview');
  try{
    const runtimeItems=entries(manifest.runtimes).map(([name,version])=>({name,version,kind:'runtime'}));
    const managerItems=entries(manifest.packageManagers).map(([name,version])=>({name,version,kind:'package manager'}));
    const containerItems=entries(manifest.containers).filter(([,available])=>Boolean(available)).map(([name])=>({name,version:'available',kind:'container'}));
    const labels={node:'Node.js',python:'Python',ruby:'Ruby',java:'Java',go:'Go',rust:'Rust',npm:'npm',pnpm:'pnpm',yarn:'Yarn',pip:'pip',poetry:'Poetry',uv:'uv',docker:'Docker',podman:'Podman'};
    const cards=items=>items.map(item=>\`<article class="tool-card"><div class="tool-name">\${esc(labels[String(item.name).toLowerCase()]||item.name)}</div><div class="tool-version">\${esc(item.version||'detected')}</div></article>\`).join('')||'<div class="empty">None detected.</div>';
    const group=(title,items)=>\`<section class="environment-group"><div class="environment-group-head"><h3>\${esc(title)}</h3><span class="group-count">\${items.length}</span></div><div class="tool-grid">\${cards(items)}</div></section>\`;
    const warningList=warnings.length?warnings.map(item=>\`<div class="simple-item warning">\${esc(item?.message||item?.code||'Review required')}</div>\`).join(''):'<div class="empty">No warnings.</div>';
    const intentList=intents.length?intents.map(item=>\`<div class="simple-item"><b>\${esc(item?.target||'environment')}</b> - \${esc(item?.action||item?.summary||'planned change')}<div class="tool-kind">\${esc(item?.actor||'unknown actor')}</div></div>\`).join(''):'<div class="empty">No planned environment changes.</div>';
    panel.innerHTML=\`<div class="summary-status \${reviewRequired?'review':''}"><b>Environment status: \${reviewRequired?'review required':'clear'}</b><div class="tool-kind">This is a generated snapshot. Run <code>aienvmap sync</code> to refresh it.</div></div><section class="metrics" aria-label="Environment counts"><div class="metric"><div class="num">\${runtimeItems.length}</div><div class="label">runtimes</div></div><div class="metric"><div class="num">\${managerItems.length}</div><div class="label">package managers</div></div><div class="metric \${warnings.length?'alert':''}"><div class="num">\${warnings.length}</div><div class="label">warnings</div></div><div class="metric"><div class="num">\${intents.length}</div><div class="label">planned changes</div></div></section><h2 class="section-title">Warnings</h2><div class="simple-list">\${warningList}</div><h2 class="section-title">Planned environment changes</h2><div class="simple-list">\${intentList}</div><h2 class="section-title">Detected development tools</h2><div class="environment-groups">\${group('Runtimes',runtimeItems)}\${group('Package managers',managerItems)}\${group('Containers',containerItems)}</div>\`;
  }catch(error){panel.innerHTML=panelFailure('Environment overview')}
}
function renderSbom(){
  const panel=document.getElementById('panel-sbom');
  try{
    const sbom=manifest.lightSbom||{};
    const summary=sbom.summary||{};
    const manifests=list(summary.manifests);
    const lockfiles=list(summary.lockfiles);
    const risks=list(sbom.topRisk);
    const riskSummary=sbom.riskSummary||{};
    const lockfileNames=lockfiles.map(item=>item&&typeof item==='object'?item.file:item).filter(Boolean);
    const riskCard=item=>{const severity=String(item?.severity||item?.priority||'review').toLowerCase();const level=['critical','high','moderate'].includes(severity)?severity:'review';return \`<div class="simple-item risk-\${level}"><div><b>\${esc(item?.name||'unknown package')}</b><span class="severity severity-\${level}">\${esc(severity)}</span></div><div class="tool-kind">\${esc(item?.version||'version not recorded')}</div></div>\`};
    const groupedRisks=new Map();
    for(const item of risks.slice(0,36)){const ecosystem=String(item?.ecosystem||'Other');if(!groupedRisks.has(ecosystem))groupedRisks.set(ecosystem,[]);groupedRisks.get(ecosystem).push(item)}
    const riskGroups=groupedRisks.size?[...groupedRisks].map(([ecosystem,items])=>\`<section class="environment-group"><div class="environment-group-head"><h3>\${esc(ecosystem)}</h3><span class="group-count">\${items.length}</span></div><div class="simple-list">\${items.map(riskCard).join('')}</div></section>\`).join(''):'<section class="environment-group"><div class="environment-group-head"><h3>Package risks</h3><span class="group-count">0</span></div><div class="empty">No highlighted package risk in the current light SBOM.</div></section>';
    const vulnerabilities=Number(summary.vulnerabilities)||0;
    const riskLevel=String(riskSummary.level||'unknown').toLowerCase();
    const danger=['critical','high'].includes(riskLevel);
    const sbomNeedsReview=vulnerabilities>0||danger;
    panel.innerHTML=\`<div class="summary-status \${danger?'danger':sbomNeedsReview?'review':''}"><b>SBOM status: \${danger?'high risk':sbomNeedsReview?'review required':'clear'}</b><div class="tool-kind">Dependency and security data from the same generated environment snapshot.</div></div><section class="metrics" aria-label="SBOM counts"><div class="metric"><div class="num">\${Number(summary.packages)||0}</div><div class="label">packages</div></div><div class="metric \${vulnerabilities?'alert':''}"><div class="num">\${vulnerabilities}</div><div class="label">vulnerabilities</div></div><div class="metric"><div class="num">\${manifests.length}</div><div class="label">manifests</div></div><div class="metric"><div class="num">\${lockfiles.length}</div><div class="label">lockfiles</div></div></section><h2 class="section-title">Dependency files</h2><div class="environment-groups"><section class="environment-group"><div class="environment-group-head"><h3>Manifests and lockfiles</h3><span class="group-count">\${manifests.length+lockfiles.length}</span></div><div class="simple-list"><div class="simple-item"><b>Risk</b>: \${esc(riskLevel)} \${esc(riskSummary.score??'')}</div><div class="simple-item"><b>Manifests</b>: \${esc(manifests.join(', ')||'none')}</div><div class="simple-item"><b>Lockfiles</b>: \${esc(lockfileNames.join(', ')||'none')}</div></div></section></div><h2 class="section-title">Package risks by runtime</h2><div class="environment-groups">\${riskGroups}</div>\`;
  }catch(error){panel.innerHTML=panelFailure('SBOM')}
}
function showDashboardTab(name){for(const id of ['overview','sbom']){const panel=document.getElementById('panel-'+id);const button=document.getElementById('tab-'+id);if(panel)panel.hidden=id!==name;if(button){button.classList.toggle('active',id===name);button.setAttribute('aria-selected',String(id===name))}}}
renderOverview();
renderSbom();
`;
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
