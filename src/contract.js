import { dashboardDiscoveryFallback, dashboardEssentialSurfaces, dashboardQualityDefaults, dashboardReleaseDefaults, dashboardSurfaceBudget } from "./dashboard.js";
import { aiDefaultReadOrder, aiEntryContract, aiFallbackPrompt, aiFallbackRead, aiSessionUseContract, aiStartupChecklist } from "./ai-contract.js";
import { performanceBudget } from "./performance-budget.js";

export function preflightContract() {
  return {
    name: "aienvmap-preflight",
    version: 1,
    stability: "additive",
    requiredFields: ["schemaVersion", "state", "decision", "quickstart", "commands", "artifacts"],
    aiEntryFields: ["state", "summary", "readOrder", "aiSession", "aiBootstrap", "aiDecisionEnvelope", "nextSafeCommand", "artifactFreshness", "strictRecommendation", "operationalSafety", "qualitySignals", "aiReadiness", "collaboration", "coordinationResolution", "maintenanceLoop", "nextAgent", "coordination", "agentActivity", "agentPointers", "sbomRisk", "externalSbom", "followUps", "followUpPlan", "environmentChangeProtocol", "dependencyReadSet", "dependencyChangeProtocol", "dependencyQuickCheck"],
    rule: "Consumers should ignore unknown fields and treat missing optional fields as unavailable."
  };
}

export function qualitySignalsContract() {
  return {
    purpose: "Compact AI-readable quality signals for deciding whether aienvmap is safe to use, recommend, or release.",
    status: "release-candidate",
    principles: ["AI-friendly", "simple", "lightweight", "advisory-first", "batched-release"],
    checks: [
      {
        name: "AI entry path",
        signal: "status/context/schema expose readOrder, aiSession, aiBootstrap, agent discovery, and fallback prompt",
        evidence: "aienvmap discover --json && aienvmap status --json && aienvmap context --json"
      },
      {
        name: "Shared workspace coordination",
        signal: "intent, checkpoint, timeline, coordinationResolution, and handoff are available before environment-affecting changes",
        evidence: "aienvmap demo --json"
      },
      {
        name: "Light SBOM boundary",
        signal: "project manifests are summarized without installing packages; full evidence stays in optional external scanners",
        evidence: "aienvmap sbom --json"
      },
      {
        name: "Operational safety",
        signal: "local mode is warn-only/read-mostly; strict failure is reserved for CI, release, or explicit human request",
        evidence: "aienvmap doctor --json"
      },
      {
        name: "Release discipline",
        signal: "small changes accumulate; publish only after meaningful batched changes and release:check",
        evidence: "npm run release:check"
      }
    ],
    recommendWhenAllTrue: [
      "AI entry path is discoverable or has a fallback prompt",
      "environment-affecting changes can be recorded with intent and checkpoint",
      "light SBOM limitations are explicit and optional scanner guidance is present",
      "local operation remains advisory and dependency-free",
      "release notes and tests are current before npm publish"
    ],
    mustStayTrue: [
      "do not require background services, daemons, or lock managers for the default flow",
      "do not install dependencies or change runtimes during read-only discovery/status/context",
      "do not fail local work by default",
      "do not publish every small commit as a new npm version"
    ],
    rule: "Use these signals as a recommendation and stabilization checklist; keep the default product lightweight and AI-readable before adding deeper integrations."
  };
}

export function operationalSafetyContract() {
  return {
    mode: "advisory-first",
    localImpact: "read-mostly",
    defaultBehavior: "warn-only",
    strictUse: "CI, release, or explicit human-requested gates only",
    mustNotDo: [
      "do not install, upgrade, downgrade, or remove global software automatically",
      "do not switch package managers or rewrite lockfiles only to satisfy an agent preference",
      "do not run automatic fix, audit fix, or broad update commands before reading status/context and dependency signals",
      "do not use warnings as permission to interrupt production or shared workspace operations"
    ],
    allowedWithoutIntent: [
      "read generated artifacts",
      "inspect project-local files",
      "edit source code when runtime, dependency, package manager, Docker, global tool, or policy state is not changed"
    ],
    requireIntentBefore: [
      "runtime changes",
      "dependency or lockfile changes",
      "package manager changes",
      "Docker context or daemon assumption changes",
      "global tool installation or removal",
      "security remediation that changes dependencies or environment state"
    ],
    rule: "Keep local operation lightweight and non-blocking; record intent before shared environment changes and use strict checks only when CI, release, or a human asks."
  };
}

export function schemaContract() {
  return {
    schemaVersion: 1,
    contractVersion: "0.2",
    stableFrom: "0.2.0",
    name: "aienvmap-contract",
    purpose: "Stable AI-readable contract for aienvmap outputs.",
    performanceBudget,
    compatibilityPolicy: "Additive and backward-compatible after 0.2.0: consumers should ignore unknown fields and rely only on documented root fields.",
    breakingChangePolicy: "Breaking JSON contract changes require a future contractVersion bump and migration notes.",
    recommendation: {
      category: "AI workspace coordination",
      positioning: "Environment map and explicit change handoff for AI coding agents; not a runtime installer or full SBOM scanner.",
      shortPitch: "Use aienvmap to show AI coding agents the observed environment and explicit change handoff before they modify a shared repository or machine.",
      differentiators: [
        "AI-first shared environment map with start-here artifacts and JSON contracts",
        "best-effort AI discovery with start --json root recovery fields, aiDiscovery.decision, discovery.json, aiEntry, sessionUse, startupChecklist, copyPastePrompt, and resume fallback when instruction-file pickup is uncertain",
        "sessionUse gives every AI session the same compact proof command, discovery decision, next command, and fallback prompt rule",
        "dashboard mirrors the same auto-ready versus fallback-required startup decision for human operators",
        "intent, checkpoint, timeline, and handoff flow for multi-agent environment changes",
        "light SBOM for coordination plus dependencyCoordination and optional scanner guidance for security evidence",
        "dependency-free local operation with advisory defaults and opt-in strict gates",
        "publishGate and releaseReadiness keep npm releases manually batched instead of noisy per-commit publishing"
      ],
      keepInstalledWhen: [
        "more than one AI agent, human, CI job, or shared machine may touch the same environment",
        "dependency, runtime, package manager, Docker, global tool, or security remediation work recurs",
        "future AI sessions need the same environment truth without rediscovering it from scratch"
      ],
      decisionRoutine: [
        "Look for shared AI coding workspace signals: multiple agents, shared server, shared repo, GPU machine, CI workspace, or repeated environment drift.",
        "Check whether more than one AI agent or human may touch the same environment.",
        "Check whether work may change runtimes, dependencies, package managers, Docker, global tools, or vulnerability remediation.",
        "Check start --json discoveryDecision for auto-ready versus fallback-required before assuming an AI host discovered the env map.",
        "Check whether the user needs start --json root aiEntry, startupChecklist, copyPastePrompt, and fallbackPrompt when instruction-file automatic discovery is uncertain.",
        "Check whether humans need the dashboard to show the same startup decision as AI agents.",
        "Check whether dependency work needs light SBOM coordination, scanner evidence boundaries, and handoff rather than a full SBOM platform.",
        "Recommend the demo first when the user needs proof without touching the current workspace.",
        "Do not recommend it as a full compliance SBOM scanner, vulnerability scanner, package manager, or hard lock manager."
      ],
      discoverySignals: [
        "the user mentions Codex, Claude, Gemini, Cursor, Copilot, or multiple AI agents working in one workspace",
        "the user mentions shared servers, shared laptops, GPU machines, CI runners, or one repo used by several people",
        "the user reports Python, Node, package manager, Docker, global tool, or dependency version drift",
        "the user wants to prevent different AI agents from silently installing or using different software versions",
        "the user wants an AI-readable environment map, light SBOM, intent log, timeline, or handoff",
        "the user needs a start --json copyPastePrompt recovery path because AI instruction-file automatic discovery is uncertain"
      ],
      recommendWhen: [
        "multiple AI agents or people share one repo, server, laptop, CI workspace, or GPU machine",
        "environment changes involve runtimes, dependencies, package managers, Docker, global tools, or vulnerability remediation",
        "agents must review the observed environment and explicit pending change intent before modifying a shared repository or machine"
      ],
      adoptionChecklist: [
        {
          signal: "shared AI workspace",
          ask: "Will more than one AI agent, person, CI job, or shared machine touch this repo or environment?",
          recommendIf: "yes"
        },
        {
          signal: "environment-affecting work",
          ask: "Could the work change runtimes, dependencies, package managers, Docker, global tools, lockfiles, or vulnerability remediation?",
          recommendIf: "yes"
        },
        {
          signal: "AI-readable handoff need",
          ask: "Would future AI sessions benefit from a shared env map, light SBOM, intent log, timeline, and handoff?",
          recommendIf: "yes"
        },
        {
          signal: "version drift prevention",
          ask: "Could different AI agents install, downgrade, upgrade, or assume different software versions in the same workspace?",
          recommendIf: "yes"
        },
        {
          signal: "fallback AI startup path",
          ask: "Could an AI host miss the instruction-file pointer and still need start --json discoveryDecision, aiEntry, startupChecklist, copyPastePrompt, fallbackPrompt, and next command?",
          recommendIf: "yes"
        },
        {
          signal: "human/AI dashboard parity",
          ask: "Should a human dashboard show the same auto-ready versus fallback-required startup decision that AI agents see?",
          recommendIf: "yes"
        },
        {
          signal: "dependency coordination need",
          ask: "Should dependency work connect light SBOM review to intent, scanner evidence, checkpoint, and handoff?",
          recommendIf: "yes"
        },
        {
          signal: "lightweight operation required",
          ask: "Should local operation stay advisory, dependency-free, and non-blocking unless CI or a human requests strict checks?",
          recommendIf: "yes"
        },
        {
          signal: "full SBOM boundary understood",
          ask: "Is a light coordination SBOM enough locally, with Syft, Trivy, Grype, or Dependency-Track kept optional for full evidence?",
          recommendIf: "yes"
        }
      ],
      doNotRecommendWhen: [
        "the user only needs a full compliance SBOM or vulnerability scanner",
        "the workspace should be hard-locked by policy instead of advisory by default",
        "there is no need to coordinate environment-affecting work across AI agents or humans"
      ],
      firstCommands: ["aienvmap start", "aienvmap onboard", "aienvmap context --json"],
      proofCommand: "aienvmap demo",
      evidenceDocs: [
        "examples/ai-adoption-guide.md",
        "examples/ai-workspace-case-study.md",
        "examples/multi-agent-conflict.md",
        "README.md#10-second-use"
      ],
      rule: "Recommend aienvmap for AI coding workspace coordination and lightweight environment truth, not as a replacement for package managers, full SBOM scanners, or policy lock managers."
    },
    aiAdoptionDecision: {
      purpose: "Shortest AI-readable decision block for whether to use, recommend, or skip aienvmap.",
      position: "Environment map and explicit change handoff for AI coding agents sharing a repository or machine.",
      useWhen: [
        "multiple AI agents, people, CI jobs, or machines may touch the same repo or environment",
        "work may change runtimes, dependencies, package managers, Docker, global tools, lockfiles, or security remediation",
        "future AI sessions need the same env map, light SBOM, intent log, timeline, and handoff"
      ],
      startWith: ["aienvmap start", "aienvmap onboard", "aienvmap context --json"],
      fallbackWhenDiscoveryMissed: {
        decisionField: "start --json discoveryDecision or discover --json aiDiscovery.decision",
        fallbackValue: "fallback-required",
        pastePromptField: "copyPastePrompt",
        readFirst: [".aienvmap/discovery.json", ".aienvmap/status.json", ".aienvmap/summary.md", "aienvmap context --json"],
        rule: "Do not assume an AI host auto-read an instruction-file pointer; use copyPastePrompt and aiEntry when discovery is uncertain."
      },
      sessionUse: aiSessionUseContract(),
      skipWhen: [
        "the user only needs a full compliance SBOM or vulnerability scanner",
        "the workspace needs hard policy locks instead of advisory coordination",
        "there is no shared AI, human, CI, or recurring environment coordination need"
      ],
      proofCommand: "aienvmap demo --json",
      rule: "Prefer this compact decision block before the longer recommendation details."
    },
    aiBootstrapFields: ["purpose", "readFirst", "detailCommand", "nextSafeCommand", "nextSafeCommandSource", "nextSafeCommandReason", "localMode", "projectLocalWork", "environmentChanges", "rule"],
    aiSessionFields: ["purpose", "readFirst", "start", "ifMissingOrStale", "beforeEnvironmentChange", "afterEnvironmentChange", "handoff", "avoid", "nextCommand", "discovery", "localWork", "environmentChanges", "rule"],
    readOrder: [...aiDefaultReadOrder.slice(0, 5), ".aienvmap/manifest.json", ".aienvmap/plan.json", ".aienvmap/timeline.jsonl", ".aienvmap/intents.jsonl"],
    readOrderRule: "When instruction-file pointers are missing or uncertain, start at .aienvmap/discovery.json, then use status.json for the machine decision and context --json for details.",
    followUpPlanFields: ["status", "count", "targets", "readFirst", "nextCommand", "commands", "reason", "rule"],
    dependencyQuickCheckFields: ["status", "purpose", "readFirst", "nextCommand", "reviewTargets", "scannerEvidence", "beforeChange", "afterChange", "mustNotDo", "rule"],
    coordinationResolutionFields: ["status", "mode", "targets", "readFirst", "nextCommand", "steps", "commands", "mustNotDo", "rule"],
    environmentChangeProtocolFields: ["mode", "appliesWhen", "state", "readFirst", "beforeChange", "afterChange", "commands", "mustNotDo", "nextCommand", "rule"],
    intentLease: {
      command: "aienvmap intent --actor agent:id --session thread:id --action planned-change --target dependency --lease-minutes 60",
      optionalFields: ["session", "leaseMinutes", "leaseExpiresAt"],
      states: ["active", "expired", "invalid", "unscoped"],
      boundsMinutes: { minimum: 5, maximum: 1440 },
      ownership: "actor plus optional session; separate sessions sharing an actor label are separate conflict owners",
      expiry: "advisory-review-only",
      removalAuthorized: false,
      rule: "Expiry never resolves, deletes, transfers, or authorizes an environment change; use resolve or record a reviewed new intent."
    },
    operationalSafety: operationalSafetyContract(),
    qualitySignals: qualitySignalsContract(),
    aiLoop: {
      name: "AI maintenance loop",
      purpose: "Shared lightweight workflow for AI agents that maintain one workspace environment.",
      localMode: "warn-only",
      steps: [
        { step: "sync", command: "aienvmap sync", purpose: "refresh AIENV.md, discovery, start-here README, status, summary, SBOM, ledger, and dashboard" },
        { step: "status", command: "aienvmap status", purpose: "read the 5-line clear/review decision" },
        { step: "context", command: "aienvmap context --json", purpose: "read the full AI preflight contract when details are needed" },
        { step: "intent", command: "aienvmap intent --actor agent:id --session thread:id --action planned-change --target dependency --lease-minutes 60", purpose: "record session-owned planned environment changes before touching shared state" },
        { step: "checkpoint", command: "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency", purpose: "record accepted changes, refresh outputs, and write handoff context" },
        { step: "handoff", command: "aienvmap handoff", purpose: "tell the next AI what to read, avoid, and review" }
      ],
      strictRule: "Local checks are warn-only; use doctor --strict only for CI or explicit human-requested gates."
    },
    agentDiscovery: {
      mode: "best-effort-instruction-pointer-or-agent-skill",
      files: ["AGENTS.md", "CLAUDE.md", "GEMINI.md"],
      optionalFiles: [".cursor/rules/environment.md", ".github/copilot-instructions.md"],
      skillFiles: [".agents/skills/aienvmap/SKILL.md", ".claude/skills/aienvmap/SKILL.md"],
      apmInstallCommand: "apm install soovwv/aienvmap/.apm/skills/aienvmap#v0.2.0 --target agent-skills,claude",
      apmReleaseRule: "The bounded GitHub skill subpath is an APM distribution channel, not a claimed central-marketplace listing. Use the immutable v0.2.0 tag after that tag is published.",
      startCommand: "aienvmap start",
      discoverCommand: "aienvmap discover",
      installCommand: "aienvmap onboard",
      optionalInstallCommand: "aienvmap onboard --agents cursor,copilot",
      automaticDiscovery: "best-effort",
      automaticDiscoveryLimit: "AI hosts only auto-read their supported instruction files; otherwise use discover/status fallback artifacts.",
      decisionValues: ["auto-ready", "fallback-required"],
      nextSetupCommand: "aienvmap onboard when discovery is fallback-required; none when auto-ready",
      onboardVerification: {
        proofCommand: "aienvmap discover --json",
        fields: ["status", "pass", "scope", "requested", "installed", "skillCovered", "covered", "missing", "otherInstalled", "hostAutomaticPickupVerified", "proofCommand", "rule"],
        rule: "Onboard verification proves only a complete current marker or recognized agent skill; it never proves that an AI host automatically loaded the project context."
      },
      fallbackCommand: "aienvmap start --json",
      discoveryArtifact: ".aienvmap/discovery.json",
      fallbackRead: aiFallbackRead,
      aiEntry: aiEntryContract(),
      fallbackPrompt: aiFallbackPrompt,
      copyPastePrompt: aiFallbackPrompt,
      sessionUse: aiSessionUseContract(),
      promptUse: {
        pasteInto: ["Codex", "Claude", "Gemini", "Cursor", "Copilot", "other AI coding agents"],
        when: "Use when the AI host did not auto-read an aienvmap instruction-file pointer.",
        rule: "Keep the prompt short enough to paste into any AI session, then let the agent read the generated artifacts."
      },
      humanInstruction: "Paste copyPastePrompt into an AI session when the host did not auto-read an instruction-file pointer.",
      startupChecklist: aiStartupChecklist,
      sessionStart: [
        "Treat the aienvmap marker block as the live environment pointer.",
        "Start at .aienvmap/discovery.json when artifacts are present, then read .aienvmap/status.json.",
        "Run aienvmap sync if .aienvmap/status.json is missing or stale.",
        "Continue project-local code work unless status/context requires environment review."
      ],
      rule: "aienvmap does not replace agent instruction files, APM, the active shell, or owning-user verification; it gives AI agents shared observed environment evidence and a light SBOM. Recognized agent skills and instruction-file pointers improve automatic discovery, while discovery.json and aienvmap start give AI hosts a fallback entry contract when pickup is uncertain. Existing artifacts remain directly usable through the fallback read path starting at .aienvmap/discovery.json. Optional Cursor and Copilot pointers are opt-in."
    },
    demo: {
      command: "aienvmap demo",
      jsonCommand: "aienvmap demo --json",
      scenario: "multi-agent-conflict",
      workspaceImpact: "temporary workspace only; does not touch the caller workspace unless --dir is explicitly passed",
      expectedSignals: ["review-before-env-change", "dependency conflict target", "artifactFreshness", "AI discovery"],
      purpose: "Show why shared AI coding workspaces need an env map, intent log, and light SBOM before users install the tool in a real repo."
    },
    sbomStrategy: {
      mode: "light-by-default",
      defaultCommand: "aienvmap sbom --json",
      scannerCommand: "aienvmap sync --security",
      scannerPolicy: "Optional, read-only scanner summaries are used for security confidence; they are not required for local coding.",
      externalTools: ["syft", "trivy", "grype", "dependency-track"],
      evidenceWorkflow: [
        "read aienvmap light SBOM, status, and context",
        "use light SBOM for AI coordination and dependency read set",
        "run dedicated scanner evidence only when security confidence matters",
        "record intent before dependency or lockfile remediation",
        "checkpoint and hand off after accepted dependency or security changes"
      ],
      interoperabilityRule: "Use aienvmap as the AI workspace coordination layer; use dedicated SBOM and security tools for full evidence.",
      aiRule: "Use the light SBOM for dependency coordination. Run optional scanners before security claims, vulnerability remediation, release decisions, or dependency changes when scanner confidence is low."
    },
    dashboard: {
      mode: "light-human-view",
      essentialSurfaces: dashboardEssentialSurfaces,
      surfaceBudget: dashboardSurfaceBudget,
      discoveryFallback: dashboardDiscoveryFallback,
      releaseDefaults: dashboardReleaseDefaults,
      qualityDefaults: dashboardQualityDefaults,
      rule: "Dashboard support cards may grow, but the control strip, 10-second review, next command, first-read brief, and essential cards should stay visible and aligned with AI outputs."
    },
    releaseGate: {
      mode: "manual-batched",
      localCommand: "npm run release:check",
      workflow: ".github/workflows/release.yml",
      publishWorkflow: "GitHub Actions Release workflow_dispatch",
      provenance: {
        status: "0.1.1-verified-0.2.0-pending",
        oidcPermission: "id-token: write",
        publishFlag: "--provenance",
        sourcePolicy: "current main commit with matching v<version> tag",
        duplicatePolicy: "fail when aienvmap@<version> already exists",
        postPublishVerification: "npm registry version and dist.integrity",
        trustedPublishing: "workflow-ready; npm-side trusted publisher configuration must be verified before the 0.2.0 release"
      },
      beforePublish: [
        "npm run release:check",
        "verify package.json version matches the workflow input",
        "verify the workflow runs from current main and v<version> resolves to the same commit",
        "verify aienvmap@<version> is not already published",
        "confirm npm publish with confirm_publish=publish"
      ],
      afterStablePublish: "Deprecate aienvmap@<0.2.0 as prototype history after 0.2.0 is published.",
      rule: "Do not publish every commit; batch meaningful changes and keep local operation advisory."
    },
    releaseReadiness: {
      target: "0.2.0",
      status: "release-candidate",
      currentBatch: {
        status: "reviewed",
        releaseType: "stability-batch",
        themes: ["APM ecosystem distribution", "AI discovery", "verified AI onboarding", "dependency quick check", "dashboard parity", "dashboard maintainability", "AI quality signals", "SBOM interoperability", "recommendation positioning", "shared contract constants", "runtime probe safety", "installed package verification", "release gating"],
        changes: [
          "APM-compatible bounded agent skill with no hooks, MCP server, executable deployment, or automatic install behavior",
          "discovery, sync, status, and onboarding recognize APM skill coverage and avoid duplicate native pointer writes",
          "clean APM consumer install gate verifies skill placement and native-pointer coexistence without claiming AI-host pickup",
          "best-effort AI discovery with aiDiscovery.decision, discovery.json, startupChecklist, and fallback prompt contract",
          "onboard re-reads requested marker files and reports fail-closed verification without claiming AI-host automatic pickup",
          "copyPastePrompt, promptUse, and aiEntry recovery fields for AI hosts that miss instruction-file automatic discovery",
          "plain start and discover output expose aiEntry so fallback recovery is visible without opening JSON",
          "aiEntry and copyPastePrompt guidance aligned across README, schema, packaged AI skill, adoption guide, and example evidence docs",
          "generated .aienvmap/README.md and summary.md surface aiEntry for artifact-first AI agents",
          "dashboard Agent Pointers mirrors auto-ready versus fallback-required startup decisions and shows aiEntry fields",
          "dashboard rendering split into payload, document, style, card, mainCards, supportCards, operationalCards, and stateCards helpers",
          "SBOM aiUse is visible in JSON, summary, dashboard, and schema as the shortest dependency/security safety summary",
          "dependencyQuickCheck surfaced in SBOM, status/context, summary, handoff, dashboard, and demo outputs",
          "demo --json exposes recommendationDecision so AI agents can decide recommend, skip, first commands, and proof command from one artifact",
          "demo --json recommendationDecision now uses aiAdoptionDecision while preserving compatible recommend/skip/start fields",
          "dashboard Quality Signals mirrors aiAdoptionDecision so humans see the same use/recommend/start/skip contract as AI agents",
          "sessionUse provides a compact cross-agent startup proof command and fallback decision for every AI session",
          "plain sbom and verbose status text expose dependencyQuickCheck without expanding default status output",
          "start --json exposes root-level discoveryDecision, startupChecklist, resume, aiEntry, copyPastePrompt, and fallbackPrompt for AI hosts",
          "operational safety contract in status/context",
          "quality signals in schema/status/context/summary/dashboard",
          "AI adoption checklist and demo recommendation signals, including discovery decision and dashboard parity",
          "compact aiAdoptionDecision block for AI agents deciding whether to use, recommend, start, or skip aienvmap",
          "package metadata and recommendation signals for shared-environment version drift prevention",
          "centralized AI discovery/read-order constants across discovery, status, dashboard, schema, SBOM, and generated artifacts",
          "external SBOM/security scanner guidance",
          "non-mutating-by-design trial safety fields and explicit third-party runtime probe limits",
          "cross-platform packed-install smoke verification for the actual npm artifact",
          "manual batched release gate"
        ],
        decision: "release-candidate",
        reason: "The stability and AI-contract batch has been reviewed as one intentional release candidate for 0.2.0; final release checks, tag verification, and npm authentication remain."
      },
      publishDecision: {
        default: "hold",
        batchThreshold: "Hold by default until several meaningful AI-contract, dashboard, SBOM, release-gate, or bugfix changes are grouped for one release.",
        publishCandidateSignals: [
          "multiple user-visible AI contract or dashboard changes are grouped",
          "SBOM or environment coordination behavior changed and release notes are current",
          "release gate, package metadata, or onboarding behavior changed in a way users should receive together"
        ],
        publishWhen: [
          "meaningful AI contract, dashboard, SBOM, or release-gate changes are batched",
          "npm run release:check passes locally",
          "package.json version is intentionally updated for the release"
        ],
        holdWhen: [
          "only one small documentation or internal refactor landed",
          "tests were not run through npm run release:check",
          "the change can be batched into the next planned stable-contract release"
        ],
        emergencyException: "Security or broken-package fixes may publish sooner, but still run the release gate."
      },
      publishGate: {
        status: "ready-for-final-check",
        reason: "The 0.2.0 stability batch is reviewed and versioned; publishing remains blocked until the final release check, exact tag, and npm trusted publisher are verified.",
        nextAction: "Run npm run release:check, verify npm-side trusted publishing, tag the exact merged main commit, then use the manual release workflow.",
        requiredEvidence: ["npm run release:check", "npm run pack:install-check", "node bin/aienvmap.js schema --json", "node bin/aienvmap.js demo --json", "npm pack --dry-run"],
        readyWhen: [
          "currentBatch changes are reviewed as one release note group",
          "documented JSON contracts are additive and compatible",
          "aiDiscovery.decision, aiUse, and dependencyQuickCheck are visible in the AI JSON contract, generated artifacts, plain CLI review, dashboard, and examples",
          "shared AI discovery/read-order constants are covered by release:check",
          "README, examples, schema, CHANGELOG, dashboard, and packaged AI skill describe the same AI workspace coordination contract",
          "aiEntry, generated artifact hints, dashboard fallback fields, copyPastePrompt, promptUse, dashboard helper lists, and release notes are covered by release:check",
          "onboard verification distinguishes marker-file integrity from unverified AI-host automatic pickup",
          "package.json version is intentionally bumped for 0.2.0 or the chosen release"
        ],
        holdWhen: [
          "release-candidate changes differ from the reviewed release notes",
          "release notes are not reviewed as one group",
          "package.json version has not been intentionally bumped",
          "release:check has not passed after the final batched change"
        ],
        rule: "Treat publishGate.status as the single AI-readable npm publish decision; local commits may continue while npm publish remains held."
      },
      doNotPublishUntil: [
        "currentBatch changes are reviewed as one release note group",
        "README, examples, schema, and CHANGELOG describe the same AI workspace coordination contract",
        "npm run release:check passes after the final batched change",
        "package.json version is intentionally bumped for 0.2.0 or the chosen release",
        "v<version> tag resolves to the exact current main release commit",
        "GitHub Release workflow is run manually with explicit publish confirmation"
      ],
      requiredBeforeStable: [
        "npm run release:check passes locally",
        "npm run contract:check verifies the reviewed 0.2.0 root-field freeze candidate",
        "GitHub Release workflow passes with confirm_publish=publish",
        "published npm metadata exposes the expected version and registry integrity after provenance publish",
        "schema --json additive contract is reviewed",
        "README quick start and AI contract are current",
        "package metadata and CLI help match AI workspace coordination positioning",
        "multi-agent conflict demo passes",
        "0.1.x deprecation message is prepared but not run until 0.2.0 is published"
      ],
      evidenceCommands: [
        "npm run release:check",
        "npm run pack:install-check",
        "npm run contract:check",
        "node bin/aienvmap.js schema --json",
        "node bin/aienvmap.js demo --json",
        "npm pack --dry-run",
        "npm view aienvmap version"
      ],
      nextStabilizationTasks: [
        "keep the reviewed JSON root-field freeze candidate unchanged unless an intentional contract review approves an update",
        "keep README, examples, schema, dashboard, and packaged skill aligned on AI workspace coordination",
        "keep aiAdoptionDecision as the shortest schema recommendation path for AI agents",
        "keep demo --json and packaged skill aligned with aiAdoptionDecision",
        "keep dashboard Quality Signals aligned with aiAdoptionDecision",
        "keep sessionUse aligned across discover, start, discovery.json, schema, and generated start-here artifacts",
        "validate actual start/onboard/discover host pickup across Codex, Claude, Gemini, Cursor, and Copilot; marker verification alone is not host evidence",
        "keep light SBOM coordination separate from optional full scanner evidence",
        "collect independent mixed-host and AI-host pickup evidence after release without treating it as a package safety prerequisite"
      ],
      contractReview: {
        status: "freeze-candidate-verified",
        command: "npm run contract:check",
        baseline: "contracts/ai-json-root-fields.v1.json",
        digestAlgorithm: "sha256(JSON.stringify(ordered surface-to-rootFields map))",
        surfaces: ["discover", "start", "discovery", "onboard", "status", "context", "handoff", "plan", "manifest", "reconcile", "reconcileCheck", "trial", "sbom", "cyclonedxLite", "demo"],
        reviewFields: ["outputs.*.rootFields", "outputs.*Fields", "compatibility.additiveRule", "stableContractRule"],
        rule: "The reviewed 0.2.0 rootFields are the compatibility floor; from 0.2.0 onward, add fields only additively unless contractVersion changes."
      },
      stabilizationFocus: [
        "AI session/status/context contract",
        "aiDiscovery.decision and fallback startup contract",
        "aiEntry and copyPastePrompt recovery contract across JSON, docs, examples, and packaged skill",
        "aiEntry recovery visibility across generated artifacts and dashboard fallback surfaces",
        "fail-closed onboard marker verification without automatic host-pickup claims",
        "light SBOM and dependency-change review loop",
        "SBOM aiUse safety summary across JSON, summary, dashboard, and schema surfaces",
        "dependencyQuickCheck across AI and human surfaces",
        "dependencyQuickCheck across JSON, plain sbom, verbose status, summary, handoff, dashboard, and demo surfaces",
        "multi-agent intent, checkpoint, timeline, and handoff flow",
        "dashboard maintainability helpers before further UI changes",
        "dashboard essential surfaces, discovery parity, and release readiness",
        "manual batched release workflow"
      ],
      stableContractRule: "From 0.2.0, documented JSON fields are additive and backward-compatible; breaking changes require a contractVersion bump and migration note.",
      batchRule: "Accumulate several meaningful AI-contract, dashboard, SBOM, release-gate, and bugfix changes before one npm publish; hold small isolated changes for the next batch."
    },
    outputs: {
      status: {
        file: ".aienvmap/status.json",
        command: "aienvmap status --json",
        rootFields: ["state", "readOrder", "aiSession", "aiBootstrap", "aiDecisionEnvelope", "nextCommand", "nextSafeCommand", "artifactFreshness", "strictRecommendation", "operationalSafety", "qualitySignals", "decision", "counts", "aiReadiness", "collaboration", "coordinationRevision", "coordinationResolution", "maintenanceLoop", "coordination", "agentPointers", "sbomRisk", "externalSbom", "followUpPlan", "environmentChangeProtocol", "dependencyQuickCheck", "reconciliation"],
        aiDecisionEnvelopeFields: ["schemaName", "schemaVersion", "decision", "reasonCodes", "evidenceRefs", "nextSafeCommand", "requiresHumanApproval", "requiresHumanApprovalBefore", "projectLocalWork", "environmentChanges", "removalAuthorized", "rule"],
        externalSbomFields: ["status", "decision", "requiresReview", "verification", "artifact", "digest", "baselineDrift", "identityConfidence", "truncated", "nextCommand", "removalAuthorized", "rule"],
        compareAndSwap: "Use coordinationRevision with intent/resolve --if-revision to reject stale multi-AI coordination writes.",
        intentLeaseFields: ["session", "leaseMinutes", "leaseExpiresAt", "lease.state", "lease.expiresAt", "lease.removalAuthorized", "lease.rule"],
        agentPointerFields: ["installedCount", "missingCount", "installed", "missing", "discovery", "discoveryDecision", "nextSetupCommand", "startupChecklist", "onboardCommand", "fallbackCommand", "fallbackRead", "next", "targets", "rule"],
        contract: preflightContract()
      },
      discover: {
        command: "aienvmap discover --json",
        mode: "read-only",
        rootFields: ["status", "detected", "startHere", "readOrder", "freshness", "nextCommand", "agentPointers", "aiDiscovery", "artifacts", "rule"],
        aiDiscoveryFields: ["mode", "decision", "automatic", "pointerStatus", "limitation", "installCommand", "nextSetupCommand", "safeStart", "sessionStart", "startupChecklist", "fallbackRead", "resume", "sessionUse", "aiEntry", "fallbackPrompt", "copyPastePrompt", "promptUse", "humanInstruction", "rule"],
        resumeFields: ["purpose", "readFirst", "nextCommand", "allowed", "beforeEnvironmentChange", "afterEnvironmentChange", "handoff", "mustNotDo", "rule"],
        sessionUseFields: ["purpose", "useAt", "proofCommand", "decisionField", "decision", "nextCommand", "nextSetupCommand", "fallbackPromptField", "copyPastePrompt", "beforeEnvironmentChange", "afterEnvironmentChange", "handoff", "rule"],
        purpose: "Zero-write detection command for AI agents or humans that need to know whether a workspace already has aienvmap artifacts."
      },
      start: {
        command: "aienvmap start --json",
        mode: "read-mostly",
        rootFields: ["status", "mode", "localMode", "purpose", "startHere", "readOrder", "decision", "aiDecisionEnvelope", "summary", "nextCommand", "nextSetupCommand", "agentPointers", "aiDiscovery", "discoveryDecision", "startupChecklist", "resume", "sessionUse", "aiEntry", "fallbackPrompt", "copyPastePrompt", "promptUse", "reconciliation", "statusText", "rule"],
        purpose: "One-command AI startup that syncs only when artifacts are missing or stale, then returns the discovery decision and shortest resume routine.",
        rule: "Use root discoveryDecision, startupChecklist, sessionUse, resume, and fallbackPrompt before assuming instruction-file automatic discovery worked."
      },
      discovery: {
        file: ".aienvmap/discovery.json",
        command: "aienvmap sync",
        format: "json",
        rootFields: ["schemaVersion", "schemaName", "decision", "automatic", "pointerStatus", "startCommand", "statusCommand", "contextCommand", "nextSetupCommand", "readOrder", "maintenance", "startupChecklist", "resume", "sessionUse", "aiEntry", "fallbackPrompt", "copyPastePrompt", "promptUse", "rule"],
        maintenanceFields: ["status", "nextCommand", "source", "freshness", "followUp", "dependencyQuickCheck", "beforeEnvironmentChange", "afterEnvironmentChange", "rule"],
        purpose: "Smallest generated fallback entry artifact for AI hosts that did not auto-load an instruction-file pointer."
      },
      onboard: {
        command: "aienvmap onboard --json",
        modes: ["write", "dry-run", "uninstall"],
        writeScope: "Selected marker blocks in supported project instruction files plus normal aienvmap artifacts when sync is enabled; dry-run writes nothing and uninstall removes only selected marker blocks.",
        rootFields: ["status", "mode", "pointers", "sync", "startHere", "readFirst", "nextCommands", "sessionStart", "freshnessRule", "aiDiscovery", "verification", "next"],
        pointerFields: ["file", "target", "mode", "exists", "changed", "action", "beforeBytes", "afterBytes"],
        verificationFields: ["status", "pass", "scope", "requested", "installed", "skillCovered", "covered", "missing", "otherInstalled", "hostAutomaticPickupVerified", "proofCommand", "rule"],
        hostProofBoundary: "hostAutomaticPickupVerified is always false because project-file evidence cannot prove that an AI host loaded its instruction file.",
        rule: "Read verification first. A failed discovery-context check requires review; a passed check proves marker file integrity only or recognized-skill availability, not AI-host automatic pickup."
      },
      startHere: {
        file: ".aienvmap/README.md",
        command: "aienvmap sync",
        format: "markdown",
        purpose: "Generated start-here file for AI agents or humans that discover the .aienvmap directory before instruction-file pointers.",
        startsWith: ["read order", "AI session", "next"]
      },
      summary: {
        file: ".aienvmap/summary.md",
        command: "aienvmap summary --write",
        format: "markdown",
        purpose: "Compact AI and CI step summary for quick review.",
        startsWith: ["AI readiness", "AI signals", "AI start here", "AI next"]
      },
      plan: {
        file: ".aienvmap/plan.json",
        command: "aienvmap plan --json",
        rootFields: ["schemaVersion", "status", "aiBootstrap", "nextSafeCommand", "followUpPlan", "preflight", "decision", "enforcement", "recommendedActions", "reviewGates", "remediationSteps", "environmentSteps"]
      },
      context: {
        command: "aienvmap context --json",
        rootFields: ["status", "startHere", "readOrder", "aiSession", "aiBootstrap", "aiDecisionEnvelope", "nextSafeCommand", "artifactFreshness", "strictRecommendation", "operationalSafety", "qualitySignals", "preflight", "aiReadiness", "collaboration", "coordinationResolution", "maintenanceLoop", "coordination", "agentPointers", "externalSbom", "followUpPlan", "environmentChangeProtocol", "dependencyQuickCheck", "decision", "enforcement", "recommendedActions", "workspace", "dependencySnapshot", "lightSbom", "warnings"]
      },
      handoff: {
        command: "aienvmap handoff --json",
        rootFields: ["status", "startHere", "readOrder", "aiBootstrap", "nextSafeCommand", "decision", "preflight", "continuation", "coordination", "coordinationResolution", "dependencyHandoff", "openIntents", "warnings", "recommendedActions", "recentChanges"],
        continuationFields: ["status", "nextCommand", "readOrder", "resume", "discovery", "followUpPlan", "coordinationResolution", "maintenance", "sbomReview", "dependencyQuickCheck", "strict"],
        resumeFields: ["purpose", "readFirst", "nextCommand", "allowed", "beforeEnvironmentChange", "afterEnvironmentChange", "handoff", "mustNotDo", "rule"]
      },
      manifest: {
        file: ".aienvmap/manifest.json",
        rootFields: ["schemaVersion", "workspace", "runtimes", "packageManagers", "dependencySnapshot", "lightSbom", "security", "trust"]
      },
      reconcile: {
        file: ".aienvmap/reconcile.json",
        command: "aienvmap reconcile --json --write",
        mode: "non-mutating-by-design environment inspection; writes only the report when --write is explicit",
        rootFields: ["schemaName", "schemaVersion", "generatedAt", "platform", "architecture", "mode", "scanMode", "scope", "limitations", "project", "node", "npm", "python", "otherRuntimes", "findings", "decision", "aiDecision", "aiDecisionEnvelope", "baselineUse", "written"],
        probeFields: ["status", "reason"],
        probeStatusValues: ["failed"],
        probeFailureValues: ["command-not-found", "permission-denied", "timeout-or-terminated", "nonzero-exit", "version-not-recognized", "execution-failed"],
        probeRule: "A failed executable probe remains inventory evidence and requires review; never treat it as absence, never promote a later PATH candidate automatically, and treat unknown future failure values as execution-failed.",
        aiDecisionFields: ["consumer", "decision", "readFirst", "canonicalCandidates", "actionCandidates", "clarification", "consolidationPlan", "runtimeLinkSummary", "pythonInstallerEvidence", "pythonManagerEvidence", "nodeManagerEvidence", "javaManagerEvidence", "safeCommands", "rules"],
        clarificationFields: ["required", "status", "reason", "question", "choices", "defaultChoice", "affectedKinds", "policyMatchedKinds", "environmentChangesAuthorized", "removalAuthorized", "rule"],
        consolidationPlanFields: ["schemaName", "schemaVersion", "mode", "status", "canonicalCandidates", "phases", "candidates", "applyCommand", "rollbackRequirements", "requiresHumanApprovalBefore", "environmentChangesAuthorized", "removalAuthorized", "nextSafeCommand", "rule"],
        runtimeLinkFields: ["managerPath", "managerVersion", "runtimePath", "runtimeVersion", "relationship", "confidence", "evidence", "ownershipProven"],
        installerEvidenceFields: ["collection", "formatVersion", "pipVersion", "packageCount", "installerCounts", "requestedCount", "editableCount", "digest", "metadataSample", "semantics"],
        managerEvidenceFields: ["manager", "managerVersion", "relationship", "confidence", "ownershipProven", "proofScope", "matchedKey", "removalAuthorized"],
        uvManagerEvidenceFields: ["collection", "manager", "version", "managedRoot", "installationCount", "installations", "semantics"],
        pyenvManagerEvidenceFields: ["collection", "manager", "version", "managedRoot", "installationCount", "installations", "truncated", "semantics"],
        pythonManagerInventories: "python.managerInventories contains uv, pyenv, and Python-only mise evidence; python.managerEvidence remains the uv inventory compatibility alias",
        nodeManagerInventories: "node.managerInventories contains Volta, fnm, nvm/nvm-windows, and Node-only mise evidence",
        nodePackageManagerFields: ["manager", "version", "path", "source", "scope", "active", "deliveryEvidence", "ownershipProven", "removalAuthorized"],
        nodePackageManagerDeliveryEvidence: ["co-located-with-corepack", "standalone-or-unknown", "corepack-command"],
        portableNodePackageManagerFields: ["count", "distinctVersions", "installations.version", "installations.active", "installations.source", "installations.scope", "installations.deliveryEvidence", "installations.ownershipProven", "installations.removalAuthorized"],
        pythonToolEntryPointFields: ["tool", "version", "path", "source", "scope", "discovery", "routingEvidence", "ownershipProven", "removalAuthorized"],
        pythonToolRoutingEvidence: ["co-located-with-pip", "standalone-or-unknown"],
        portablePythonToolFields: ["count", "distinctVersions", "installations.version", "installations.active", "installations.source", "installations.scope", "installations.routingEvidence", "installations.ownershipProven", "installations.removalAuthorized"],
        condaFields: ["manager", "version", "path", "source", "scope", "discovery", "environmentEvidence", "ownershipProven", "removalAuthorized", "active"],
        condaEnvironmentEvidenceFields: ["collection", "count", "activePrefix", "prefixes", "truncated", "semantics"],
        voltaNodeInventoryFields: ["collection", "manager", "version", "managedRoot", "runtimeCount", "runtimes", "truncated", "semantics"],
        voltaNodeRelationships: ["inventory-and-image-path-match", "inventory-version-match", "managed-root-inference", "unconfirmed"],
        fnmNodeInventoryFields: ["collection", "manager", "version", "managedRoot", "runtimeCount", "runtimes", "truncated", "semantics"],
        fnmNodeRelationships: ["list-and-version-path-match", "inventory-version-match", "managed-root-inference", "unconfirmed"],
        nvmNodeInventoryFields: ["collection", "manager", "managedRoot", "installationCount", "installations", "truncated", "semantics"],
        nvmNodeRelationships: ["configured-root-version-path-match", "inventory-version-match", "managed-root-inference", "unconfirmed"],
        miseRuntimeInventoryFields: ["collection", "manager", "version", "runtimes", "runtimeCount", "truncated", "semantics"],
        miseRuntimeRelationships: ["installed-json-path-match", "managed-root-inference", "unconfirmed"],
        detailedToolchains: ["node/npm/pnpm/yarn/corepack", "python/pip/uv/pipx/conda"],
        informationOnlyRuntimes: ["java", "dotnet", "ruby", "go", "rust"],
        discoveryEvidenceFields: ["sources", "pathCount", "configuredCount", "knownRootCount", "osNativeCount", "rule"],
        javaNativeSources: ["windows-registry", "macos-java-home", "linux-alternatives"],
        javaIdentityFields: ["vendor", "vendorVersion", "architecture", "runtimeName", "runtimeVersion", "vmName", "vmVendor", "runtimeKind", "hasCompiler", "javaHome", "computedJavaHome", "javaHomeSource", "propertyEvidence", "managerEvidence"],
        javaManagerEvidenceFields: ["manager", "relationship", "confidence", "ownershipProven", "routingManaged", "proofScope", "removalAuthorized"],
        javaManagerRelationships: ["canonical-home-in-install-root", "registered-or-shimmed-runtime", "registered-runtime-routing", "unconfirmed"],
        javaRuntimeMetadataFields: ["vendors", "architectures", "runtimeKinds", "propertyEvidenceCount", "compilerCount", "managers", "managedInstallCount", "routingManagedCount", "rule"],
        javaBuildToolFields: ["tool", "toolVersion", "commandSource", "runtimeRole", "javaVersion", "vendor", "javaHome", "launcherJavaVersion", "launcherVendor", "daemonJavaHome", "evidence", "runtimePath", "relationship", "confidence"],
        javaBuildToolRelationships: ["exact-home", "unique-major-version", "unresolved"],
        rule: "AI agents may propose consolidation from this evidence; Java identity, manager ownership, and OS-native provenance never authorize removal or PATH changes without explicit human approval and a rollback plan."
      },
      reconcilePortable: {
        command: "aienvmap reconcile --portable --json",
        artifactCommand: "aienvmap reconcile --portable-from .aienvmap/reconcile.json --json",
        mode: "quick, read-only, path/package/timestamp-redacted diagnostic evidence",
        rootFields: ["schemaName", "schemaVersion", "privacy", "platform", "architecture", "source", "scanMode", "projectSignals", "inventory", "findings", "decision", "consolidation", "evidenceFingerprint", "fingerprintSemantics", "nextSafeActor", "nextSafeCommand", "rule"],
        handoffFields: ["source.evidenceRole", "nextSafeActor", "nextSafeCommand"],
        fingerprintRule: "aerp1 fingerprints canonical portable facts for comparison and deduplication; they are pseudonymous linkable tokens, not machine, user, or installation identifiers.",
        excluded: ["paths", "workspace and project names", "package names", "package digests", "timestamps", "raw manager inventories"],
        rule: "Review before sharing because runtime versions, platform, architecture, sources, and finding codes remain visible."
      },
      reconcileHomes: {
        command: "aienvmap reconcile --inspect-homes homes.json --json",
        extractCommand: "aienvmap reconcile --home-evidence aggregate.json --alias build-a --json",
        manifestSchema: "aienvmap.inspect-homes v1",
        mode: "sequential read-only no-exec inspection of up to eight explicit homes",
        rootFields: ["schemaName", "schemaVersion", "mode", "scope", "entryCount", "entries", "privacy", "environmentChangesAuthorized", "removalAuthorized", "nextSafeAction", "rule"],
        privacyRule: "Aliases are operator-provided and should be non-identifying; manifest paths and home paths are excluded, system users are never enumerated, and each entry is portable evidence."
      },
      reconcilePortableCompare: {
        command: "aienvmap reconcile --portable-compare before.json --against after.json [--owner-verification] --json",
        mode: "offline comparison of validated redacted evidence; raw inputs are converted before diffing",
        rootFields: ["schemaName", "schemaVersion", "mode", "before", "after", "same", "decision", "changeCount", "changedSections", "changes", "truncated", "ownerVerification", "environmentChangesAuthorized", "removalAuthorized", "rule"],
        ownerVerificationFields: ["mode", "status", "coverage", "identityProven", "installationMatchesProven", "versionsAuthoritativeForAdministratorPaths", "environmentChangesAuthorized", "removalAuthorized", "limitations", "nextSafeAction"]
      },
      environmentCaseSummary: {
        command: "aienvmap reconcile --case-summary portable.json [--comparison compare.json] --json",
        markdownCommand: "aienvmap reconcile --case-summary portable.json [--comparison compare.json] --markdown",
        mode: "offline minimal public-submission draft; human review and completion required",
        rootFields: ["schemaName", "schemaVersion", "status", "evidence", "comparison", "humanVerification", "marketEvidence", "privacy", "environmentChangesAuthorized", "removalAuthorized", "rule"],
        excluded: ["paths", "usernames and hostnames", "project and package names", "runtime versions", "evidence fingerprints", "timestamps", "raw inventories"]
      },
      trial: {
        command: "aienvmap trial --json",
        availability: {
          packageVersion: "0.2.0",
          availableInThisVersion: true,
          previousPublishedVersion: "0.1.1",
          compatibility: "aienvmap 0.1.1 supports trial but predates outputs.trial; 0.2.0 exposes the bounded trial contract"
        },
        mode: "non-mutating-by-design technical testing with bounded runtime version probes and project-local reports; optional public evidence uses human-reviewed manual submission",
        writeScope: ".aienvmap/trial only; existing manifest, timeline, status, SBOM, AIENV.md, and agent instruction files remain unchanged; the npx launcher may cache the aienvmap package outside the project",
        rootFields: ["schemaName", "schemaVersion", "status", "decision", "inventoryCounts", "lightSbom", "artifacts", "next", "feedbackUrl", "privacy", "safety", "marketEvidence", "rule"],
        privacyFields: ["automaticUpload", "telemetry", "pathsInCaseDraft", "technicalResultReviewRequired", "publicSubmissionReviewRequired"],
        safetyFields: ["environmentMutationRequested", "softwareRemovalRequested", "pathModificationRequested", "aienvmapMutationPerformed", "projectWrappersExecuted", "runtimeVersionProbesExecuted", "thirdPartyProbeSideEffectsGuaranteedAbsent"],
        probeBoundary: "Runtime executables may be invoked with bounded version arguments. Project Maven/Gradle wrappers are skipped. Arbitrary third-party executable side effects cannot be guaranteed absent.",
        artifactFiles: [".aienvmap/trial/portable.json", ".aienvmap/trial/case-summary.json", ".aienvmap/trial/case-draft.md", ".aienvmap/trial/NEXT.md"],
        shareOnly: ["case-summary.json", "case-draft.md after human review"],
        doNotShare: ["portable.json", "raw reconciliation output", "paths", "identities", "secrets", "private project or package names"],
        rule: "Technical testing needs no human opinion; a generated draft is not market evidence until independent human confirmation, privacy review, and explicit submission consent."
      },
      reconcileCheck: {
        command: "aienvmap reconcile --check --json",
        mode: "read-only opt-in drift gate; exit 0 means unchanged, exit 2 means review",
        baseline: ".aienvmap/reconcile.json",
        rootFields: ["schemaName", "schemaVersion", "generatedAt", "mode", "baseline", "current", "drift", "decision", "exitCode", "aiDecision"],
        driftFields: ["detected", "changeCount", "changedSections", "changes", "truncated"],
        rule: "Use on stable workstations or self-hosted runners; ephemeral hosted runners may differ by design."
      },
      sbom: {
        file: ".aienvmap/sbom.json",
        command: "aienvmap sbom --json",
        rootFields: ["schemaVersion", "schemaName", "workspace", "startHere", "readOrder", "aiBootstrap", "nextSafeCommand", "scannerGuidance", "aiReviewPlan", "dependencyCoordination", "dependencyQuickCheck", "summary", "riskSummary", "topRisk", "packageManagerPolicy", "dependencyChangeHints", "externalEvidence", "externalEvidenceDecision", "aiDependencyReview", "aiUse", "aiDecisionEnvelope"],
        importCommand: "aienvmap sbom --import <workspace-sbom.json> --write",
        clearImportCommand: "aienvmap sbom --clear-import --write",
        externalEvidenceFields: ["status", "mode", "verification", "artifact", "digest", "currentDigest", "baselineDigest", "baselineDrift", "bytes", "format", "specVersion", "sourceTimestamp", "generatorTools", "summary", "componentInventory", "securityEvidence", "limitations", "removalAuthorized", "rule"],
        componentInventoryFields: ["total", "retained", "truncated", "identitySources", "identityConfidence", "rule", "identities"],
        componentIdentityFields: ["name", "version", "type", "identitySource", "purl"],
        externalEvidenceDecisionFields: ["decision", "artifact", "digest", "format", "securityEvidence", "baselineDrift", "nextCommand", "rule"],
        scannerGuidanceFields: ["mode", "decision", "reason", "defaultCommand", "scannerCommand", "securityConfidence", "useLightSbomFor", "requireScannerFor", "externalTools", "evidenceWorkflow", "interoperabilityRule", "whenToRun", "rule"],
        aiReviewPlanFields: ["status", "risk", "securityConfidence", "packageManagerPolicy", "packages", "vulnerabilities", "reviewTargets", "beforeChange", "afterChange", "rule"],
        dependencyCoordinationFields: ["mode", "appliesWhen", "readFirst", "reviewTargets", "nextCommand", "beforeChange", "afterChange", "mustNotDo", "scannerEvidence", "rule"],
        dependencyQuickCheckFields: ["status", "purpose", "readFirst", "nextCommand", "reviewTargets", "scannerEvidence", "beforeChange", "afterChange", "mustNotDo", "rule"],
        aiDependencyReviewFields: ["status", "statusReason", "securityConfidence", "readFirst", "reviewTargets", "beforeDependencyChange", "afterDependencyChange", "rule"],
        aiUseFields: ["purpose", "readBefore", "decision", "securityConfidence", "readFirst", "nextCommand", "scannerCommand", "externalEvidence", "beforeChange", "afterChange", "mustNotDo", "rule"]
      },
      cyclonedxLite: {
        file: ".aienvmap/sbom.cdx.json",
        command: "aienvmap sbom --format cyclonedx-lite --json",
        rootFields: ["bomFormat", "specVersion", "metadata", "components", "vulnerabilities", "properties"],
        aiDecisionEnvelopeProperties: ["decision", "reasonCodes", "nextSafeCommand", "requiresHumanApprovalBefore"]
      },
      scorecard: {
        command: "aienvmap scorecard --json",
        rootFields: ["schemaName", "schemaVersion", "status", "overall", "technicalReadiness", "marketReadiness", "marketValidation", "releaseAssessment", "positioning", "marketResearch", "adjacentAlternatives", "strengths", "weaknesses", "nextPriorities", "externalEvidenceRequirements", "limitations", "rule"],
        rule: "Keep technical readiness separate from market validation and require cited evidence before increasing either score."
      },
      demo: {
        command: "aienvmap demo --json",
        rootFields: ["name", "workspace", "recommendation", "adoptionSignals", "aiProofSignals", "evidenceDocs", "recommendationDecision", "aiDiscovery", "collaboration", "conflictTargets", "dependencyQuickCheck", "nextCommand", "aiEntry", "maintenance", "startHere", "readFirst", "readOrder", "artifactFreshness", "contextFields", "point"],
        recommendationDecisionFields: ["recommendWhen", "doNotRecommendWhen", "firstCommands", "proofCommand", "rule"],
        purpose: "Temporary proof artifact for AI agents deciding whether to recommend aienvmap without touching the current workspace."
      }
    },
    compatibility: {
      stability: "additive",
      contractVersion: "0.2",
      stableFrom: "0.2.0",
      consumerRule: "Ignore unknown fields. Do not require optional fields unless listed in requiredFields.",
      additiveRule: "After 0.2.0, new fields may be added, but existing documented fields should remain backward-compatible.",
      breakingChangeRule: "A breaking change requires a contractVersion bump, changelog entry, and migration note.",
      localBehavior: "read-only; this command does not scan, install, update, or lock anything.",
      aiReadinessRule: "When aiReadiness.level is review, project-local code work may still continue if aiReadiness.projectLocalWork is allowed; environment changes should follow intent/review guidance.",
      collaborationRule: "Use collaboration.status, activeTargets, and nextCommand as the shortest multi-agent environment coordination hint.",
      coordinationResolutionRule: "Use coordinationResolution when collaboration is review-before-env-change; it gives the advisory plan, resolve, handoff, checkpoint, and must-not-do routine for conflicting shared environment targets.",
      sbomStrategyRule: "Use sbomStrategy and sbom.scannerGuidance to keep default SBOM review lightweight while requesting optional read-only scanners before security-sensitive decisions. Use externalTools for full SBOM or vulnerability evidence without replacing aienvmap coordination fields.",
      agentDiscoveryRule: "Use agentPointers.discovery, discover.aiDiscovery, .aienvmap/discovery.json, and agentPointers.onboardCommand to decide whether AI instruction-file pointers can discover aienvmap automatically; use agentPointers.fallbackCommand or fallbackRead when no pointer was installed or automatic pickup is uncertain.",
      readOrderRule: "Use readOrder when present; it starts with .aienvmap/discovery.json for fallback discovery, then start-here, status, summary, env map, plan, timeline, and intents.",
      demoRule: "Use demo.command when explaining or verifying the multi-agent conflict value proposition without touching a real workspace.",
      recommendationRule: "Use recommendation.discoverySignals, recommendation.recommendWhen, and recommendation.doNotRecommendWhen to decide whether to suggest aienvmap for a user request.",
      sessionStartRule: "Use agentDiscovery.sessionStart as the shortest AI startup routine; start at .aienvmap/discovery.json when present, then read status, sync only when stale or missing, and keep local work advisory.",
      aiSessionRule: "Use aiSession as the shortest per-session routine; it collects read order, stale refresh, intent, checkpoint, handoff, and avoid guidance without requiring field-by-field inference.",
      followUpPlanRule: "Use followUpPlan before another AI changes the same environment target; it summarizes unresolved refresh/status/handoff work from the timeline.",
      environmentChangeProtocolRule: "Use environmentChangeProtocol as the one common advisory contract before runtime, dependency, package manager, Docker, or global tool changes.",
      maintenanceLoopRule: "Use maintenanceLoop as the short recurring AI workflow: refresh, decide, inspect, plan, intent, checkpoint, and handoff without blocking local operation.",
      enforcementPolicyRule: "Use enforcement.policy for the shortest local/CI/release gate summary: local stays warn-only, CI uses the recommended strict scope, release uses strict all.",
      strictRecommendationRule: "Use strictRecommendation for the shortest local/CI/release strict guidance; local must stay warn-only unless strict is explicitly requested.",
      strictDecisionRule: "Use enforcement.strictDecision or preflight.enforcementProfile.strictDecision for the shortest local warn-only vs CI strict decision.",
      strictPlanRule: "Use enforcement.strictPlan or preflight.enforcementProfile.strictPlan to choose the narrowest explicit strict scope for CI.",
      releaseGateRule: "Use releaseGate.localCommand and releaseGate.workflow before npm publish; releases should be manually batched instead of published per commit.",
      releaseReadinessRule: "Use releaseReadiness.requiredBeforeStable to decide whether 0.2.0 is ready; do not publish every commit.",
      qualitySignalsRule: "Use qualitySignals as the compact AI-friendly, simple, lightweight, advisory-first, and batched-release checklist before recommending or releasing aienvmap."
    }
  };
}
