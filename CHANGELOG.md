# Changelog

## Unreleased

- Extended intentional-version questions and project-local memory to multiple Java runtimes while keeping Java information-only and outside consolidation candidates.
- Allowed reviewed intentional Node/Python version sets in the project-local policy to suppress repeat consolidation questions while unexpected versions and routing/project mismatches still trigger review.
- Added an explicit AI clarification contract for intentional multi-version environments and a redacted cross-platform maintainer scenario runner covering first start, reconciliation, light/external SBOM, and case drafting.
- Reordered the README around the user problem, 10-second trial, and concrete two-agent outcome before advanced environment evidence.
- Replaced authoritative "source of truth" and "live env map" wording in generated AI pointers and schema guidance with observed-evidence and owning-user verification boundaries.
- Made trusted-publisher authentication the token-free default for manual npm releases, with explicit Node/npm floors and a separately selected token fallback.
- Added privacy-safe Markdown environment-case drafts generated only from the allowlisted public summary, without files, uploads, or automatic submissions.
- Added validated per-alias extraction from bounded multi-home evidence for the administrator-to-owner verification handoff.
- Fixed candidate scope and path redaction to honor an explicit inspected-user home across Node, npm, Python, pip, uv, pipx, Conda, and information-only runtimes on shared hosts.
- Upgraded GitHub checkout/setup-node actions to their Node 24 based v6 majors and explicitly disabled unused automatic package-manager caching in CI and release workflows.
- Centralized path redaction/source/scope evidence and isolated uv, pipx, and Conda discovery from the main package-manager orchestrator while preserving compatibility exports.
- Updated the evidence-bounded competitive map for Microsoft APM, Devbox, and Flox, narrowing the product wedge to observed mixed-host runtime evidence and review-first multi-AI coordination.
- Isolated Node/Python/Conda routing judgment rules from discovery I/O while preserving package-manager compatibility exports and findings.
- Added version-only Conda discovery by default and opt-in bounded `conda info --envs --json` path summaries, excluding packages, channels, credentials, and automatic activation.
- Added bounded uv and pipx entry-point/version discovery plus duplicate pip/uv/pipx findings, portable evidence, and drift tracking while leaving tool package enumeration opt-in.
- Added bounded read-only pnpm, Yarn, and Corepack executable/version discovery across PATH and known Node roots, including duplicate/project mismatch findings, portable evidence, and drift tracking without claiming shim ownership.
- Added optional actor/session intent ownership and bounded advisory leases so concurrent sessions sharing one AI label conflict correctly; expiry never resolves an intent or authorizes environment changes.
- Added a fail-closed 0.2.0 root-field contract freeze candidate across 13 AI JSON surfaces, with an intentional-review baseline and release-check integration.
- Isolated portable report construction, validation, fingerprinting, artifact loading, and comparison from the reconcile CLI while preserving command-module exports and JSON contracts.
- Hardened the manual npm provenance workflow to require current main, a matching version tag, an unpublished version, explicit confirmation, OIDC provenance, and post-publish registry version/integrity verification.
- Restored the canonical Apache-2.0 license text, added a dated market/traction snapshot with adjacent-tool boundaries, exposed its caveats in the scorecard, and aligned GitHub description/topics with the product position.
- Added a privacy-reviewed portable environment case issue template, external evidence maturity rubric, AI judgment evaluation fields, and scorecard gates that exclude unverified or repository-owned examples from market credit.
- Added offline `reconcile --portable-compare <before> --against <after> --json` with fingerprint validation, bounded redacted diffs, embedded platform evidence, and no environment-change authority.
- Added canonical `aerp1` portable evidence fingerprints for identifier-independent case comparison and deduplication, with explicit pseudonymous-linkability and no-machine-ID semantics.
- Added `reconcile --portable-from <artifact> --json` to redact a validated reconciliation v1 artifact offline, preserving full-scan ownership evidence without rescanning or exposing the source path.
- Added `reconcile --portable --json` for quick, read-only case evidence that excludes paths, project/package names, digests, timestamps, and raw manager inventories while retaining version, manager, finding, and approval signals.
- Added cross-platform performance budgets for AI startup, quick reconciliation, scorecard output, and generated workspace artifacts, and wired them into CI and release checks.
- Added proposal-only reconcile consolidation plans with evidence phases, stop conditions, rollback requirements, and explicit human gates; no apply or removal command is generated.
- Added an evidence-bounded `scorecard --json` that separates technical readiness from market validation and records adjacent-tool boundaries, limitations, and improvement priorities.
- Extended `aiDecisionEnvelope` to reconcile, light SBOM, and CycloneDX-lite, and added explicit always-review action classes for removal, global installs, runtime switching, and lockfile rewrites.
- Added one additive `aiDecisionEnvelope` across start/status/context with bounded reason codes, evidence references, next safe command, approval state, and permanent no-removal authority.
- Added opt-in Unix nvm and nvm-windows configured-root inventories, canonical path containment checks, exact version-path ownership proof, drift detection, and symlink-escape downgrade without sourcing shells or switching versions.
- Added opt-in fnm local Node inventory, inactive installation-path discovery, exact list/version/path ownership proof, drift detection, and AI/schema guidance without shell activation or removal authority.
- Surfaced a digest-verified, sample-free external SBOM signal in start/status/context/discovery; stale or component drift now raises advisory review while missing evidence and identity fallback remain non-blocking.
- Preferred sanitized CycloneDX and SPDX Package URLs for cross-ecosystem component identity, with explicit identity confidence, fallback signaling, and no retained PURL qualifiers or subpaths.
- Added bounded CycloneDX/SPDX component identities and explicit re-import baseline comparison for added, removed, and version-changed packages, with partial-result signaling and no automatic remediation.
- Added explicit workspace-local CycloneDX/SPDX JSON evidence import with realpath confinement, 32 MB bound, SHA-256 identity/freshness checks, bounded tool/count summaries, preview/persist/clear flows, and original-first AI guidance without running scanners.
- Added one bounded mise installed-JSON inventory for Node and Python, exact reported-path ownership evidence, custom install-root discovery, runtime-scoped drift, and AI/schema integration without retaining config paths or authorizing removal.
- Added opt-in Volta plain Node inventory, reported `process.execPath` image matching, conservative ownership relationships, Windows command integration, and AI/drift/schema summaries without removal authority.
- Added opt-in pyenv manager-native inventory using bounded root/version commands, exact Python prefix ownership evidence, Windows batch support, AI/drift/schema integration, and a permanent no-removal-authority rule.
- Added Java SDKMAN/mise/jenv manager evidence with canonical-root ownership proof, routing-only treatment for external registrations and jenv, compact AI summaries, and drift detection while keeping removal unauthorized.
- Added read-only Maven/Gradle JVM binding evidence with project-wrapper precedence, distinct Gradle Launcher/Daemon roles, conservative links to detected Java installations, AI review findings, compact startup summaries, and drift detection.
- Added selected Java system-property identity evidence (vendor, architecture, runtime/VM, reported home) and sibling `javac` JDK classification, including AI summaries and drift detection without retaining unrelated properties.
- Added cross-platform OS-native Java discovery through Windows Registry, macOS `java_home`, and Linux alternatives, with AI-readable provenance summaries and drift detection while keeping Java information-only.
- Added full-scan uv-managed Python ownership evidence using offline JSON output, with inference-only defaults, AI/drift summaries, and an invariant that ownership proof never authorizes removal.
- Added opt-in `pip inspect` installer evidence summaries to `reconcile --full-packages`, including Windows UTF-8 subprocess handling, bounded redacted metadata, AI aggregation, and drift detection without changing default scan cost.
- Added conservative npm-to-Node and pip-to-Python `runtimeLinks` with explicit evidence/confidence, AI summaries, drift detection, and `ownershipProven: false` safeguards.
- Added opt-in `reconcile --check` host-state drift detection with AI-readable differences and stable exit code `2`, plus an off-by-default GitHub Action input for stable/self-hosted runners.
- Added optional compare-and-swap coordination: `status --json` exposes `coordinationRevision`, while `intent` and `resolve --if-revision` atomically reject stale multi-AI writes without a daemon or dependency.
- Added read-only `reconcile` discovery for multiple visible npm executables, versions, prefixes, global roots, global packages, project package-manager expectations, and mixed lockfiles; no package version change or environment mutation is performed.
- Added `onboard --dry-run` and marker-scoped `onboard --uninstall` so AI instruction pointers can be reviewed and removed without overwriting unrelated repository guidance.
- Restricted instruction-pointer writes to paths inside the selected workspace.
- Extended reconciliation with cross-platform Python discovery, interpreter/prefix/venv evidence, pip package inventories, project Python expectations, and conservative AI action candidates that never authorize automatic removal.
- Added bare `pip` command routing evidence and a review finding when active `python` and `pip` target different Python versions.
- Added lightweight path-and-version-only discovery for Java, .NET SDKs, Ruby, Go, and Rust while keeping detailed package reconciliation limited to Node/npm and Python/pip.
- Registered reconciliation in the AI JSON contract, generated/reused its report during `start`, summarized it in `status.json`, made artifact replacement atomic, and serialized concurrent JSONL event writes with stale-lock recovery.
- Renamed the npm package and CLI from `aienvmp` to `aienvmap` as a clean `0.1.0` package start.
- Kept the old package as a migration target for deprecation messaging instead of carrying its noisy npm version history into the new name.
- Mirrored `sessionUse` in the dashboard Agent Pointers fallback table so human operators see the same compact proof command and fallback prompt rule as AI agents.
- Tightened README startup wording around `start`, generated outputs, and the `sessionUse` fallback path.
- Added `sessionUse` to `discover --json`, `start --json`, generated `.aienvmap/discovery.json`, generated `.aienvmap/README.md`, and `schema --json` so every AI session gets the same compact discovery proof command, decision, next command, and fallback prompt rule.
- Mirrored `aiAdoptionDecision` in the dashboard Quality Signals card so humans see the same compact use/recommend/start/skip guidance as AI agents.
- Aligned `demo --json` `recommendationDecision` and the packaged AI skill with `aiAdoptionDecision` so AI agents see the same compact use/recommend/start/skip contract across schema, demo, and skill surfaces.
- Added `aiAdoptionDecision` to `schema --json` so AI agents get one compact use/recommend/start/skip decision block before reading longer recommendation details.
- Grouped dashboard client-script helpers for SBOM, release, and layout surfaces so future dashboard changes can stay smaller while preserving AI/human parity.
- Mirrored `releaseReadiness.contractReview` in the dashboard Release Readiness card so humans see the same 0.2.0 JSON contract review checklist as AI agents.
- Documented `demo --json` in `schema.outputs.demo` and added it to `contractReview.surfaces` so the recommendation proof artifact is part of the 0.2.0 root-field review.
- Added `releaseReadiness.contractReview` so AI/CI can review documented JSON root fields before the 0.2.0 stable contract.
- Added `releaseReadiness.nextStabilizationTasks` and surfaced the first task in summaries so AI agents can choose the next 0.2.0 hardening step without guessing.
- Added `demo --json` `recommendationDecision` and plain demo first-command guidance so AI agents can recommend or skip the tool from one proof artifact.
- Added `aiEntry` to plain `start` and `discover` output so humans and AI sessions see the minimum fallback contract without opening JSON first.
- Reduced the CI matrix to one cross-platform Node 20 check plus Windows Node 18/20/22 checks so the quality gate stays representative without creating avoidable queued-job failures.
- Surfaced SBOM `aiUse` in summary and dashboard outputs so AI agents and humans see the shortest dependency/security safety summary before deeper SBOM details.
- Documented `sbom --json` `aiUse` as a schema root field and added `scannerCommand` plus `mustNotDo` so AI agents get the shortest dependency/security safety summary without digging into nested blocks.
- Added `aiEntry` fields to the dashboard Agent Pointers fallback table so human operators see the same compact recovery contract as AI agents.
- Surfaced `aiEntry` in generated `.aienvmap/README.md` and `.aienvmap/summary.md` so artifact-first AI agents see the shortest recovery contract without opening schema docs.
- Aligned the adoption guide, shared-server case study, packaged AI skill, and recommendation contract around `aiEntry` as the shortest fallback startup routine.
- Added compact `aiEntry` recovery fields to `discover --json`, `start --json`, and generated `.aienvmap/discovery.json` so AI hosts can recover from missed automatic discovery with one small object.
- Updated CLI help and README command wording so the copy-paste fallback prompt is discoverable before reading JSON.
- Added `copy-paste prompt:` to default `start` and `discover` text output so humans can hand the fallback instruction to another AI without parsing JSON.
- Compressed the README AI Contract section while keeping discovery, `copyPastePrompt`, dependency, safety, and release readiness signals visible.
- Updated `releaseReadiness.currentBatch` so the held 0.2.0 batch covers `copyPastePrompt` recovery and dashboard helper-list maintainability work.
- Grouped dashboard environment state, policy, intent, handoff, pointer, and snapshot cards into a `stateCards` client-side list.
- Grouped dashboard secondary side cards into a `supportCards` client-side list so `renderDashboard` keeps shrinking without changing dashboard behavior.
- Added `copyPastePrompt` recovery guidance to the shared-server case study, multi-agent conflict docs, and recommendation signals so AI agents can cite the fallback handoff path as adoption evidence.
- Aligned the packaged AI skill, adoption guide, and recommendation contract around `copyPastePrompt` while keeping `fallbackPrompt` as a compatible alias.
- Added `copyPastePrompt` and `promptUse` to AI discovery/startup contracts so humans can hand a short fallback instruction to Codex, Claude, Gemini, Cursor, Copilot, or another AI when automatic pointer discovery is missed.
- Grouped dashboard enforcement, release, quality, and CI cards into an `operationalCards` client-side list for safer side-card maintenance.
- Converted the dashboard main grid cards to a `mainCards` client-side list so core card order and labels are easier to review and test.
- Moved dashboard card markup into `dashboardCardClientScript` so card priority rendering is centralized before further card-list simplification.
- Split dashboard CSS into `dashboardStyle` so the essential human review surfaces can be tested separately from the HTML shell.
- Split dashboard document shell rendering into `dashboardDocument` so payload, HTML shell, and client script responsibilities are easier to test separately.
- Split dashboard schema-backed payload assembly into `dashboardPayload` so `renderDashboard` stays focused on rendering while preserving the same output.
- Updated recommendation and adoption guidance to prefer `start --json` root recovery fields when AI instruction-file discovery is uncertain.
- Added root `discoveryDecision`, `startupChecklist`, `resume`, and `fallbackPrompt` to `start --json` so AI hosts can recover when instruction-file auto-discovery is uncertain.
- Added the dependency quick-check decision to verbose `status` text while keeping the default status view at five lines.
- Updated plain `sbom` output to show the dependency quick-check decision, scanner evidence, and next command instead of an empty risk-only next value.
- Made the README, CLI help, and adoption guide show `sbom --json` as the simple dependency/security pre-change check.
- Updated `releaseReadiness.currentBatch` so the held 0.2.0 batch includes version drift positioning and centralized AI discovery/read-order contract work.
- Centralized shared AI discovery and read-order constants so discovery, status, dashboard, schema, SBOM, and generated artifacts stay aligned.
- Strengthened package metadata and recommendation signals around shared-environment version drift prevention and dependency coordination.
- Added `dependencyQuickCheck` to AI startup checklists so dependency, lockfile, security, and release work starts from the same discovery-first coordination routine.
- Aligned light SBOM and dependency coordination read orders with `.aienvmap/discovery.json` so dependency work starts from the same AI maintenance entry path.
- Surfaced the AI maintenance decision in the dashboard first-read strip and conflict demo so ongoing upkeep is visible outside `discovery.json`.
- Added `discovery.json.maintenance` so AI agents get one compact ongoing environment upkeep decision from the smallest fallback entry artifact.
- Surfaced `.aienvmap/discovery.json` as the dashboard and demo AI entry point so humans and AI see the same fallback startup artifact.
- Added generated `.aienvmap/discovery.json` as the smallest AI fallback entry artifact and aligned `sync`, `discover`, schema, README, dashboard, and packaged skill guidance around it.
- Added `agentPointers.discoveryDecision` to compact `status` text output while keeping the default status view at five lines.
- Aligned README, CLI help, and packaged AI skill startup wording around `aiDiscovery.decision` without adding new commands.
- Carried `agentPointers.discoveryDecision` into status, summary, and handoff continuation surfaces so the next AI can resume with the same auto-ready versus fallback-required decision.
- Updated `releaseReadiness.currentBatch` so the held 0.2.0 batch explicitly covers `aiDiscovery.decision`, dashboard parity, and `dependencyQuickCheck` stabilization work.
- Updated recommendation guidance and examples to position `aiDiscovery.decision` and dashboard parity as adoption signals for AI workspace coordination.
- Mirrored the explicit AI discovery decision in the dashboard Agent Pointers surface so humans can see auto-ready versus fallback-required without adding another card.
- Added `aiDiscovery.decision`, `nextSetupCommand`, and `startupChecklist` so AI agents can choose auto-ready versus fallback startup without inferring from pointer files.
- Surfaced `dependencyQuickCheck` in the conflict demo so the first proof run shows the compact dependency-work decision.
- Added `dependencyQuickCheck` to status/context preflight surfaces so AI agents can make the same compact dependency-work decision before opening the full SBOM.
- Surfaced `dependencyQuickCheck` in summary and handoff continuation output so the next AI sees the compact dependency-work decision without opening the full SBOM first.
- Added `dependencyQuickCheck` to light SBOM outputs, CycloneDX-lite metadata, and the dashboard so AI agents get a compact dependency-work decision before installs, lockfile edits, remediation, or release review.
- Moved dashboard release and quality fallback defaults into the dashboard contract so humans and AI see the same batched-release and startup-quality policy.
- Moved dashboard discovery fallback defaults into the dashboard contract module so the renderer owns less AI startup policy.
- Added `aienvmap start` as a one-command AI startup path that discovers artifacts, syncs only when needed, and prints status when automatic instruction-file discovery is uncertain.
- Added demo `AI proof signals` so the first proof run surfaces fallback discovery, dependency coordination, and lightweight operation strengths.
- Updated AI recommendation guidance with `aiDiscovery.resume`, `sbom.dependencyCoordination`, and `releaseReadiness.publishGate` adoption signals.
- Added `releaseReadiness.publishGate` so AI/CI have one hold-or-publish decision for the batched 0.2.0 stability release.
- Mirrored `sbom.dependencyCoordination` in the dashboard Light SBOM card so humans see the same dependency-change coordination loop as AI agents.
- Added `sbom.dependencyCoordination` so AI agents can connect light SBOM review to intent, scanner evidence, checkpoint, and handoff steps.
- Added dashboard fallback resume guidance to the Agent Pointers card so humans can see the same AI startup path when automatic discovery is uncertain.
- Compressed the README quick-start and core sections so the AI workspace coordination story stays readable under a tighter line budget.
- Documented `aiDiscovery.resume` in the README and packaged AI skill so fallback startup is visible to humans and agents.
- Added `discover.aiDiscovery.resume` so AI agents get the same startup routine even when instruction-file automatic discovery is uncertain.
- Added `handoff.continuation.resume` so the next AI gets a compact same-env-map resume routine before shared environment changes.
- Added SBOM scanner `evidenceWorkflow` guidance so AI agents can hand off from light SBOM coordination to dedicated scanner evidence without auto-running tools.
- Added batched release readiness details so AI/CI can see current grouped changes and do-not-publish gates before npm release.
- Added an AI-readable adoption checklist and demo adoption signals so agents can decide when to recommend aienvmap for shared AI workspaces.
- Mirrored `qualitySignals` into summary and dashboard outputs so humans and AI see the same stabilization checklist.
- Added `qualitySignals` to schema, status, and context outputs so AI agents can evaluate AI-friendliness, simplicity, lightweight operation, advisory safety, and batched-release readiness.
- Added `aiDiscovery.fallbackPrompt` and session-start hints so humans can paste one compact instruction when an AI host does not auto-load aienvmap pointers.
- Exposed `operationalSafety` in status and context outputs so AI agents see the must-not-change contract at session start.
- Added `operationalSafety` to the AI schema so agents have one central warn-only and must-not-change contract.
- Added `releaseReadiness.currentBatch` so AI and humans can see why npm publish remains held while stability changes accumulate.
- Added a dashboard surface budget contract so future dashboard growth keeps the 10-second essential AI review surfaces first.
- Added AI-readable recommendation positioning, differentiators, and keep-installed signals for AI workspace coordination adoption.
- Added best-effort discovery guidance to generated `AIENV.md` and `.aienvmap/README.md` so first-read artifacts match the `discover --json` contract.
- Added `discover --json` `aiDiscovery` metadata so agents can distinguish best-effort automatic pickup from fallback artifact reading.
- Mirrored external SBOM/security tool guidance in the dashboard and packaged AI skill so humans and agents see the same evidence boundary.
- Added external SBOM/security tool guidance so AI agents keep `aienvmap` as the coordination layer while using Syft, Trivy, Grype, or Dependency-Track for full evidence.
- Added read-only `aienvmap discover` and stronger start-here markers so AI agents can detect existing aienvmap artifacts before environment-affecting work.
- Added `coordinationResolution` to the AI preflight surfaces so multiple AI agents get one advisory conflict-resolution routine for shared environment targets.
- Added explicit batched-release threshold and publish-candidate signals to the AI-readable release readiness contract.
- Added an explicit light-SBOM scanner decision so AI agents can tell when the light artifact is enough and when optional read-only scanner evidence is needed.
- Added a dashboard 10-second review surface that keeps start-here, next command, review target, and advisory mode visible for human operators.
- Added explicit recommendation discovery signals for AI agents deciding when to suggest aienvmap for shared AI coding workspaces.
- Changed demo and generated start-here README wording from status-only `read first` to start-here `read order` so public AI examples match the fallback discovery flow.
- Aligned `onboard` output with the `.aienvmap/README.md` start-here path so first-run agents see the same fallback entry point as status, SBOM, context, and dashboard outputs.
- Added `followUpPlan` to status, context, summary, and schema outputs so AI agents can see one next command for unresolved environment follow-up work.
- Documented `followUpPlan` in the README and packaged AI skill so AI agents run pending follow-up commands before touching shared environment targets.
- Mirrored `followUpPlan` in the dashboard Follow-ups card so humans see the same pending target and next command as AI agents.
- Added `followUpPlan` to AIENV and plain context Markdown so Markdown-first agents see the same follow-up next command.
- Added `followUpPlan` to handoff continuation so the next AI receives pending follow-up targets and commands directly.
- Added `followUpPlan` to plan JSON and Markdown so read-only planning starts with pending follow-up work when needed.
- Added `followUpPlan` to doctor JSON and pending text output so advisory checks surface unresolved follow-up work.
- Added pending `followUpPlan` to the GitHub Action Step Summary so CI artifacts show unresolved environment follow-up work.
- Added generated `.aienvmap/README.md` as a start-here artifact so AI agents can discover the fallback read path even without instruction-file pointers.
- Added the start-here artifact to the dashboard first-read surface so humans see the same fallback entry point as AI agents.
- Aligned AI read-order fields with `.aienvmap/README.md` so status, plan, follow-up, and environment-change protocols share the same fallback entry point.
- Added the start-here artifact to demo output so recommendation examples show the same AI fallback entry point.
- Added the start-here read order to `schema --json` and the packaged AI skill so schema-only and skill-based agents share the same fallback discovery contract.
- Added root `startHere` and `readOrder` fields to context and handoff JSON so continuation agents can find the fallback entry point without digging into preflight.
- Added `startHere` and `readOrder` to standalone light SBOM and CycloneDX-lite metadata so dependency-review agents follow the same AI entry path.
- Added the start-here artifact to the compact `status` text output while keeping the default scan to five lines.
- Added the start-here artifact to the top of `summary.md` and its artifact list for Markdown-first AI agents.
- Added compact light SBOM `aiUse` decision, confidence, read-first, and before/after-change fields.
- Added release readiness evidence commands and stabilization focus for AI/CI release review.
- Added per-session AI avoid guidance to status, context, env map, and dashboard surfaces.
- Added package keywords for AI coding workspace coordination and light SBOM discovery.
- Added recommendation pitch and evidence links to the multi-agent demo output.
- Added schema recommendation pitch and decision routine fields for AI recommenders.
- Added an AI adoption guide and linked it from the recommendation contract.
- Compressed the README around the 10-second AI workspace coordination path.
- Split dependency dashboard client rendering helpers out of the main renderer.
- Added a dashboard essential-surface contract for AI-first human review.
- Added recommendation evidence document links to the AI schema and packaged skill.
- Aligned the packaged aienvmap skill with schema recommendation guidance so AI agents know when to use or skip the tool.
- Moved dashboard release-readiness rendering into the dashboard contract module.
- Tightened the README first screen with Use/Skip/Start guidance for faster AI and human scanning.
- Added `releaseReadiness.publishDecision` so AI and humans default to holding npm publish until meaningful changes are batched.
- Added schema-level recommendation guidance so AI agents know when to suggest aienvmap and when not to.
- Added an AI workspace coordination case study that explains the shared-server multi-agent drift problem and the lightweight aienvmap flow.
- Mirrored `environmentChangeProtocol` in the dashboard and summary artifact so humans see the same environment-change contract as AI agents.
- Added `environmentChangeProtocol` so AI agents get one advisory before/after-change contract for runtimes, dependencies, package managers, Docker, and global tools.
- Added an AI discovery fallback contract so agents can use existing status, summary, and context artifacts even when instruction-file pointers are not installed.
- Moved dashboard dependency-hints HTML into the dashboard contract module.
- Moved dashboard package-manager policy HTML into the dashboard contract module.
- Moved dashboard SBOM risk summary HTML policy into the dashboard contract module.
- Moved dashboard scanner guidance HTML policy into the dashboard contract module.
- Moved dashboard AI review plan HTML policy into the dashboard contract module.
- Moved dashboard AI dependency review HTML policy into the dashboard contract module.
- Moved dashboard SBOM review-plan fallback policy into the dashboard contract module.
- Moved dashboard SBOM scanner guidance policy into the dashboard contract module to keep the renderer simpler.
- Mirrored SBOM scanner guidance in the dashboard Light SBOM card so humans see the same optional scanner decision as AI agents.
- Added SBOM scanner guidance to the AI schema and standalone light SBOM artifact so agents know when optional read-only scanners are needed.
- Expanded the multi-agent conflict demo docs with a shared-server AI workspace use case and README link text.
- Clarified the README first screen around dependency-free, advisory operation for lightweight shared machines.
- Added `aiBootstrap.nextSafeCommandSource` and `nextSafeCommandReason` so AI agents can explain why a next command was chosen.
- Documented the release policy: keep `0.1.x` as prototype history, stabilize the AI workspace contract in `0.2.x`, batch npm releases, and prefer deprecation over unpublish.
- Added AI contract compatibility metadata and a manual npm release workflow so `0.2.0+` releases can be gated instead of published per commit.
- Added `aienvmap onboard` to install Codex, Claude, and Gemini pointers in one command and refresh the generated AI env artifacts.
- Surfaced AI discovery state and `onboard` guidance in status JSON, schema metadata, and the dashboard first-read strip.
- Made `onboard` output and the README first screen more action-oriented around AI discovery, first-read files, and next commands.
- Added a runnable multi-agent conflict demo that shows Codex and Claude dependency intents producing a review-before-env-change collaboration state.
- Added `enforcement.policy` as a short AI-readable local/CI/release gate summary while keeping local operation advisory by default.
- Added `sbom.json.aiReviewPlan` so AI agents get one compact light-SBOM decision for risk, scanner confidence, package manager policy, and before/after dependency-change commands.
- Mirrored the compact SBOM review plan in the dashboard Light SBOM card and summary artifact for human/AI consistency.
- Added `npm run release:check` and wired the manual Release workflow to the same local release gate.
- Added `schema --json` release gate metadata so AI/CI consumers can see the batched manual publish rule.
- Added a session-start contract to agent pointers and schema metadata so Codex, Claude, and Gemini know how to enter the env map without extra prompts.
- Added `artifactFreshness` to AI preflight surfaces so agents can decide when to refresh stale env artifacts with `aienvmap sync`.
- Mirrored `artifactFreshness` in the summary and dashboard so humans and Markdown-first agents get the same refresh signal.
- Added the session-start and artifact freshness rule to `onboard` output so first-run AI agents get the same startup contract immediately.
- Added `aienvmap demo` so npm users can run the multi-agent conflict demo without cloning the repository.
- Added demo discovery metadata to `schema --json` and updated the conflict demo docs around `npx aienvmap demo`.
- Updated the packaged `aienvmap` AI skill with the current session-start, artifact freshness, and demo guidance.
- Added `strictRecommendation` so AI agents can read one compact local warn-only, CI strict, and release strict decision without changing default advisory behavior.
- Mirrored `strictRecommendation` in the summary and dashboard so humans see the same advisory-local and strict-CI/release split.
- Added `releaseReadiness` to `schema --json` so AI/CI can inspect the `0.2.0` stable-contract checklist before publishing.
- Mirrored `releaseReadiness` in the summary and dashboard so humans see the same batched-release gate before npm publish.
- Added opt-in Cursor and GitHub Copilot instruction-file pointers while keeping default onboarding focused on Codex, Claude, and Gemini.
- Made `snippet` reject unknown targets instead of silently writing the default agent pointer.
- Added `aiSession` to status/context/preflight surfaces so AI agents get one compact startup, stale-refresh, intent, checkpoint, and handoff routine.
- Updated compact `status` text to show the `aiSession` startup path while keeping the default output at five lines.
- Clarified the project positioning around AI workspace coordination, optional external SBOM/security tools, dashboard essentials, and case-study driven adoption.
- Marked the dashboard's 10-second review cards as essential in code and tests so new dashboard detail does not hide the core AI coordination surface.
- Split the dashboard essential-card contract into a small module with direct priority tests to keep the growing dashboard renderer easier to maintain.
- Tightened agent pointer snippets around read-first behavior so AI agents read existing status artifacts before running refresh commands.
- Added agent discovery state to the compact five-line `status` output so humans and AI can see when `onboard` is still needed without opening JSON.
- Made text `doctor` output show non-blocking AI discovery recommendations even when there are no blocking environment warnings.
- Aligned `onboard` discovery output with status/dashboard wording by listing the AI pointer targets that were prepared.
- Moved the dashboard priority client script into the dashboard contract module so the large renderer owns less AI coordination policy.
- Moved dashboard agent pointer client logic into the dashboard contract module to keep optional AI target display policy out of the renderer.
- Sharpened the README first screen around preventing multi-AI environment assumption drift without heavy locks.
- Aligned npm metadata and CLI help headline with the AI workspace coordination positioning.
- Added npm metadata and CLI help positioning to the `0.2.0` release readiness checklist.
- Updated the packaged AI skill with the current advisory coordination, discovery, and multi-agent demo guidance.
- Added a positioning drift test so package metadata, README, and CLI help keep the same AI workspace coordination story.
- Added a package metadata test that keeps the CLI runtime dependency-free for lightweight shared-machine installs.
- Added a package publish allowlist test to keep npm contents small and intentional.

## 0.1.69

- Added `aiBootstrap` to the shared preflight surfaces so AI agents can read the shortest first-read, next-command, and local-mode hint.
- Mirrored `aiBootstrap` in the dashboard first-read area so humans see the same AI entry hint.
- Added the same bootstrap hint to `summary.md` so Markdown-first AI agents can start from the compact artifact.
- Added the bootstrap hint to `AIENV.md` so the main environment map matches the JSON, summary, and dashboard entry point.
- Added `aiBootstrap` and `nextSafeCommand` to plan JSON and the same bootstrap hint to `plan.md`.
- Added `aiBootstrap` and `nextSafeCommand` to the standalone light SBOM artifact so dependency review starts from the same AI loop.
- Added `aienvmap:aiBootstrap:*` properties to CycloneDX-lite output so external SBOM consumers can find the same next-step hint.

## 0.1.68

- Added an `aienvmap AI loop` block to the GitHub Action Step Summary using `schema.aiLoop`.
- Kept the Action summary advisory by default while showing the same loop documented in README and `schema --json`.
- Updated the GitHub Action example and README CI notes to mention Step Summary strict-plan and AI-loop blocks.
- Added `doctor --json` `nextSafeCommand` so AI agents can pick one advisory next command without parsing every warning.
- Aligned the dashboard next-command fallback with `maintenanceLoop.nextCommand` so the visual surface follows the same advisory next-step chain.
- Added `context --json` `nextSafeCommand` so AI agents get the same one-step advisory next command in the preflight payload.
- Added `handoff --json` `nextSafeCommand` so the next AI can resume from one root-level advisory command.
- Added `status --json` and `.aienvmap/status.json` `nextSafeCommand` as a stable alias for the preflight next command.

## 0.1.67

- Added a dashboard `First read` strip with status, first file, review targets, and local operation mode.
- Kept the detailed dashboard cards below the top decision area so humans get a faster scan without losing AI context.
- Added `maintenanceLoop` to the AI preflight contract so agents can repeat refresh, decide, inspect, plan, intent, checkpoint, and handoff steps.
- Surfaced the maintenance loop in `context --json`, `summary.md`, `AIENV.md`, schema metadata, and regression tests.
- Added `maintenanceLoop.sbomReview` so AI agents can connect SBOM risk, scanner confidence, review targets, and dependency-change commands.
- Added medium light-SBOM risk planning guidance to recommended actions.
- Added `strictDecision` so AI agents and CI can distinguish local warn-only checks from optional strict gates.
- Surfaced local `doctor --json` and scoped CI strict commands in summary, dashboard, status/context JSON, and tests.
- Added `handoff.continuation` so the next AI receives maintenance-loop, SBOM-review, and strict-decision guidance without parsing the full preflight.
- Added the continuation summary to plain Markdown handoff output and schema metadata.
- Reworked the README first-read flow around shared AI workspaces, the 10-second command path, and the AI maintenance loop.
- Added `aiLoop` to `schema --json` and plain schema output so AI consumers see the same loop described in the README.

## 0.1.66

- Added `aienvmap resolve --target <target>` to resolve all open intents for one environment target.
- Added `aienvmap resolve --all` to close all open intents after coordination.
- Added `resolve --json` output so AI agents can read resolved refs and counts directly.
- Kept single-intent `resolve --id` behavior for precise manual cleanup.
- Updated coordination recommended actions to point at target-based resolve.
- Updated CLI help and README command guidance for the simplified resolve flow.
- Added regression tests for target resolve, all resolve, JSON output, and coordination action commands.

## 0.1.65

- Added a dashboard `Next command` bar directly below the AI control strip.
- Chose the dashboard next command from preflight, top recommended action, collaboration, then status fallback.
- Added a short reason beside the next command so humans and AI agents know why it is suggested.
- Made the next command bar responsive and wrap long commands safely.
- Kept detailed recommended actions below the first-read dashboard area.
- Updated README wording to mention the single next command.
- Added dashboard regression coverage for next-command source and reason binding.

## 0.1.64

- Added a dashboard `AI control strip` above the existing audit area.
- Made readiness, collaboration, and SBOM risk the first three dashboard decisions.
- Added compact status, next command, and review guidance to each top control card.
- Added responsive control-strip layout for narrow screens.
- Kept the detailed dashboard cards below the first-read control strip.
- Documented the dashboard 3-card first-read surface in the README.
- Added dashboard regression coverage for the control strip, top cards, and SBOM-risk binding.

## 0.1.63

- Compressed plain `aienvmap status` output into a 5-line AI/human decision view.
- Added `aienvmap status --verbose` for detailed command hints without cluttering the default path.
- Added a reusable `renderStatusText` helper for stable status text formatting.
- Kept JSON/status artifacts unchanged so AI consumers retain the full preflight contract.
- Updated CLI help to explain the compact default and verbose detail mode.
- Updated README command guidance for default, artifact, and verbose status usage.
- Added regression tests for compact default output, verbose output, and exact status text shape.

## 0.1.62

- Added a compact `collaboration` block to the shared preflight/status contract for multi-agent environment coordination.
- Exposed `collaboration` at the root of `context --json` so AI agents can read status, active targets, and the next command without digging through multiple sections.
- Added the collaboration status and rule to `.aienvmap/summary.md`.
- Added a short collaboration line to plain `aienvmap status` output.
- Added an `AI Collaboration` dashboard card with status, active targets, env-change rule, and next command.
- Documented the collaboration block in the stable schema contract and README.
- Added regression tests for status, context, summary, dashboard, and schema surfaces.

## 0.1.61

- Added an `aienvmap strict plan` block to the GitHub Action Step Summary.
- Reused advisory `doctor --json` data so CI can show local and strict commands without forcing failure.
- Preserved `write-doctor-json: false` by using a temporary advisory doctor payload when only the summary needs strict guidance.
- Documented the Action Step Summary strict-plan surface in the README.
- Added regression coverage for the Action strict-plan summary contract.

## 0.1.60

- Added `enforcement.strictPlan` to help AI agents and CI choose the narrowest explicit strict scope.
- Added `preflight.enforcementProfile.strictPlan` so status/context consumers see the same strict guidance.
- Added CI strict command output to `.aienvmap/summary.md`.
- Added strict-plan CI command and rule display to the dashboard Enforcement Mode card.
- Documented strict-plan consumption in `schema --json` and README.
- Added regression tests for enforcement advice, doctor JSON, status/context, summary, dashboard, and schema outputs.

## 0.1.59

- Added `aiDependencyReview.statusReason` so AI agents can distinguish actual review risk from scanner-off uncertainty.
- Added `aiDependencyReview.securityConfidence` across generated light SBOM, standalone SBOM, dashboard, summary, and schema metadata.
- Reused the computed `riskSummary`, package-manager policy, and dependency hints when building `aiDependencyReview` to avoid drift between artifacts.
- Updated dashboard and summary surfaces to show dependency-review confidence.
- Updated README and regression tests for scanner-off dependency review behavior.

## 0.1.58

- Added `lightSbom.aiDependencyReview` during manifest generation so all generated artifacts share the same dependency-review block.
- Reused generated `aiDependencyReview` in standalone `.aienvmap/sbom.json`.
- Added an `AI Dependency Review` section to the dashboard Light SBOM card.
- Added the AI dependency review status and first command to `.aienvmap/summary.md`.
- Added regression tests for light SBOM generation, dashboard rendering, SBOM artifact output, and summary output.

## 0.1.57

- Added `aiDependencyReview` to the standalone `.aienvmap/sbom.json` artifact.
- Linked SBOM risk to dependency-change read order, safe actions, review targets, and before/after commands.
- Kept dependency review advisory and non-blocking while making the AI handoff more explicit.
- Documented `sbom.json.aiDependencyReview` in the README and schema contract.
- Fixed dependency-review command grouping so `checkpoint` appears after dependency changes, not before.
- Added regression tests for SBOM dependency review and schema metadata.

## 0.1.56

- Added `aiReadiness.requiresHumanReview` so agents can distinguish review-needed signals from hard blocking.
- Added `aiReadiness.safeProjectLocalActions` to clarify what AI agents may still do in review state.
- Added `aiReadiness.reviewOnlyEnvironmentChanges` to keep environment changes advisory, intentional, and non-disruptive.
- Added the safe-local-work hint to `.aienvmap/summary.md`.
- Documented the summary top block and `aiReadiness` consumption rule in `schema --json`.
- Added regression tests for status, context, summary, and schema outputs.

## 0.1.55

- Moved `AI readiness`, readiness signals, and next action to the top of `.aienvmap/summary.md`.
- Added `aiReadiness.signals` to the dashboard audit-band hint.
- Kept the CI Step Summary lightweight while making the first AI review signal easier to scan.
- Updated README and regression tests for the new summary/dashboard readiness surface.

## 0.1.54

- Added `aiReadiness` to the shared preflight/status contract.
- Added root `aiReadiness` to `context --json`.
- Added `aiReadiness` to `doctor --json` as advisory metadata.
- Printed `ai-readiness` in plain `aienvmap status` output.
- Added `AI readiness` to `.aienvmap/summary.md`.
- Added an AI readiness item to the dashboard audit band.
- Updated README, schema metadata, and regression tests for the ready/review signal.

## 0.1.53

- Added `agentPointers` to the shared AI preflight/status contract.
- Added `agentPointers` to `context --json` at the root for quick AI access.
- Added `agentPointers` to `doctor --json` without making missing pointers a blocking warning.
- Added agent pointer status to `.aienvmap/summary.md`.
- Added `agentPointers` to the stable schema contract metadata.
- Preserved legacy boolean `agentFiles` compatibility in preflight summaries.
- Added regression tests for status, context, doctor, schema, and summary pointer outputs.

## 0.1.52

- Expanded `manifest.agentFiles` from booleans to lightweight agent instruction metadata.
- Detected whether AGENTS.md, CLAUDE.md, and GEMINI.md contain the aienvmap pointer marker.
- Added install commands and roles to agent instruction metadata.
- Added a low-priority recommended action when no AI instruction pointer is installed.
- Updated the dashboard Agent Pointers card to distinguish installed pointers, missing pointers, and missing files.
- Updated README guidance to mention pointer detection and non-blocking doctor recommendations.
- Added regression tests for pointer scanning, pointer recommendations, dashboard rendering, and sync output.

## 0.1.51

- Updated Codex/Claude/Gemini pointer snippets to use the current `status -> summary.md -> context` read order.
- Added agent-specific actor examples for Codex, Claude, and Gemini snippet output.
- Added dependency and lockfile changes to the snippet environment-change scope.
- Updated the packaged Codex skill to prefer `status --write`, `summary.md`, and `checkpoint`.
- Added `.aienvmap/summary.md` to the shared preflight read order and next-agent hint.
- Added a Dependency changes section to `summary.md` with read files, intent command, checkpoint command, and package-manager policy.
- Updated README agent-file guidance and added regression coverage for the AI snippet and summary protocol.

## 0.1.50

- Added `aienvmap summary` for a compact Markdown AI/CI handoff view.
- Added `.aienvmap/summary.md` writing through the default `sync` flow.
- Added `summary` to preflight artifacts and the stable output contract.
- Added a GitHub Action `write-summary` input.
- Appended `.aienvmap/summary.md` to GitHub Step Summary when the Action runs in GitHub Actions.
- Updated the GitHub Action example and README to include the summary artifact.
- Fixed UTF-8 BOM JSON parsing so Windows-created `package.json` files are scanned correctly.
- Added regression tests for summary rendering, sync output, schema metadata, Action Step Summary wiring, and BOM JSON parsing.

## 0.1.49

- Added a `write-sbom` GitHub Action input for explicit SBOM artifact generation.
- Added Action steps for writing `.aienvmap/sbom.json` and `.aienvmap/sbom.cdx.json`.
- Updated the GitHub Action example to enable SBOM writing.
- Added native light SBOM artifact upload paths to the example workflow.
- Added CycloneDX-lite artifact upload paths to the example workflow.
- Updated README CI usage to mention SBOM artifacts.
- Added regression coverage for Action SBOM inputs, commands, and example upload paths.

## 0.1.48

- Added `aienvmap sbom --format cyclonedx-lite` for a lightweight CycloneDX-compatible export.
- Added `.aienvmap/sbom.cdx.json` writing through the default `sync` flow.
- Added CycloneDX-lite artifact paths to status/preflight outputs and schema metadata.
- Added dashboard links for `sbom.cdx.json` beside the native light SBOM artifact.
- Added README guidance for the CycloneDX-lite command and output.
- Included explicit metadata limitations so consumers know no install or dependency resolver was run.
- Added regression tests for CycloneDX-lite component mapping, vulnerability hints, sync output, schema contract, and dashboard rendering.

## 0.1.47

- Added `aienvmap sbom` for standalone AI-readable light SBOM output without deep manifest parsing.
- Added `.aienvmap/sbom.json` writing through `aienvmap sbom --write` and the default `sync` flow.
- Added the SBOM artifact path to the shared preflight artifacts map.
- Added SBOM output metadata to `aienvmap schema --json`.
- Added a dashboard Light SBOM Artifact card linking to `sbom.json`.
- Updated README outputs and commands with the standalone SBOM artifact.
- Added regression tests for SBOM artifact building, writing, sync output, schema contract, and dashboard rendering.

## 0.1.46

- Added `lightSbom.riskSummary` with compact risk level, score, scanner state, signals, review targets, and next commands.
- Added `sbomRisk` to the shared AI preflight contract so status/context consumers can read SBOM risk without deep parsing.
- Surfaced SBOM risk in `context --json`, `AIENV.md`, and the dashboard Light SBOM card.
- Added recommended actions for read-only security scans and high light-SBOM risk review.
- Used top-risk package severity as a fallback when scanner summary severity counts are incomplete.
- Updated dependency change hints to point agents to `aienvmap checkpoint` after accepted dependency changes.
- Added regression tests for risk scoring, scanner-off guidance, status/context outputs, dashboard rendering, and recommended actions.

## 0.1.45

- Added `aienvmap checkpoint` as a one-command post-environment-change flow for record, sync, status, and handoff.
- Added quiet command support so checkpoint can compose existing commands without noisy intermediate output.
- Added checkpoint sync ledger entries so follow-up detection can prove the refresh step happened.
- Added checkpoint guidance to the shared preflight, decision, manifest, dependency protocol, and status outputs.
- Updated AIENV, handoff, plan, dashboard, and agent pointer rendering to prefer checkpoint after environment changes.
- Shortened the README environment-change flow to intent plus checkpoint.
- Added checkpoint regression coverage for JSON output, ledger updates, follow-up closure, status artifacts, and rendered guidance.

## 0.1.44

- Added multi-agent record warnings when multiple agents record environment changes for the same target after the last handoff.
- Added `agentActivity` to the shared preflight contract so status/context/handoff can expose recent env records by target and actor.
- Surfaced agent activity in context, handoff, and the dashboard for faster shared-server review.
- Added a recommended handoff action for multi-agent record activity.
- Mapped `multi-agent-records` into the optional `doctor --strict coordination` scope while keeping local behavior advisory by default.
- Documented the new AI contract field in the compact README.
- Added regression tests for warning detection, handoff reset behavior, status JSON, dashboard HTML, and recommended actions.

## 0.1.43

- Added follow-up metadata to `record` timeline entries so dependency/security changes point agents back to sync, status, and handoff.
- Added timeline follow-up summarization so unresolved dependency/security records can be surfaced consistently.
- Surfaced pending follow-ups in status/preflight and context outputs.
- Added a dashboard Follow-ups card for unresolved env/SBOM record refresh work.
- Updated the README change loop to show record, sync, status, and handoff as one simple continuation flow.
- Documented Windows/macOS candidate verification for the record follow-up loop.

## 0.1.42

- Added explicit enforcement gate metadata so AI and CI consumers know local checks are warn-only unless `--strict` or `--ci` is requested.
- Added `doctor --json` exit behavior metadata to distinguish advisory warnings from strict failure conditions.
- Surfaced enforcement gate details in context, plan, and dashboard outputs.
- Extended the GitHub Action to write `.aienvmap/schema.json` and `.aienvmap/doctor.json` artifacts by default.
- Clarified README guidance for advisory-by-default behavior and opt-in strict/CI failure.
- Documented advisory doctor exit behavior and strict verification steps in troubleshooting and bugfix notes.

## 0.1.41

- Added preflight contract metadata so AI and CI consumers can rely on stable entry fields while ignoring additive changes.
- Added `aienvmap schema --json` to print the stable AI-readable output contract without scanning a workspace.
- Exposed coordination summaries at the root of `context --json` and `handoff --json`, with a human-readable handoff section.
- Added light SBOM source, confidence, and limitation hints so agents know what the lightweight snapshot does and does not prove.
- Updated the README with the schema command and light SBOM verification boundary while keeping the quick-start compact.
- Added an AI Contract dashboard card so humans can review the same stable fields that agents consume.

## 0.1.40

- Added dependency handoff summaries so the next AI receives dependency read-set and protocol guidance directly in `handoff`.
- Added a compact `nextAgent` hint to status/preflight JSON for safer AI-to-AI continuation.
- Added target-level open intent coordination summaries so agents can detect dependency conflicts without parsing logs.
- Shortened the README around the 10-second AI flow, generated outputs, and advisory contract.
- Updated the dashboard handoff card with next-agent read hints, dependency files, and conflict targets.
- Printed the next-agent handoff command in the plain `status` output.

## 0.1.39

- Added a dependency read set to preflight, `AIENV.md`, and the dashboard so agents know which manifests and lockfiles to read before package or security changes.
- Added an advisory dependency change protocol so agents follow the same intent, refresh, record, and handoff flow for package/security edits.
- Surfaced the dependency change protocol in `plan.md` so human-readable plans match the AI preflight contract.
- Pointed security remediation recommendations at the dependency intent workflow instead of a generic context read.
- Treated dependency records and package/security intents as coordination signals for stale handoff and multi-agent conflict warnings.
- Added CLI regression coverage for `context --dir <workspace> --json` so remote and CI agents can safely inspect another workspace.
- Allowed `--dir <workspace>` before the command, so AI and CI agents can use either global-style or command-style workspace targeting.

## 0.1.38

- Added a 10-second AI quickstart flow to the shared preflight contract and status output.
- Added preflight intent target recommendations so agents can record runtime, package manager, dependency, Docker, or coordination changes consistently.
- Surfaced AI intent target recommendations in the dashboard so humans can review the same target guidance.
- Added the same quickstart and intent target guidance to `AIENV.md` so Markdown-first agents receive the current preflight.
- Aligned AGENTS/Claude/Gemini pointer snippets with the same status-first, target-aware AI flow.

## 0.1.37

- Added `lightSbom` to the manifest as an AI-ready package and vulnerability summary.
- Linked dependency manifests, ecosystem/group counts, vulnerable direct dependencies, and top risk packages into one compact SBOM view.
- Surfaced dependency change hints in AI-facing outputs and the dashboard so agents and humans can identify relevant manifests before edits.
- Added read-only lockfile awareness to dependency snapshots and light SBOM hints.
- Added package manager policy hints from lockfiles to reduce accidental npm/pnpm/yarn drift.

## 0.1.36

- Added an explicit enforcement profile to the shared AI preflight contract.
- Surfaced advisory-by-default vs optional strict mode in the dashboard.
- Clarified that strict checks are intended for CI or explicit human-requested gates, not default local blocking.

## 0.1.35

- Added a shared AI preflight contract across status, context, plan, and handoff outputs.
- Reused the same artifact map, read order, safe commands, decision, and enforcement guidance across AI-facing JSON.
- Reduced drift risk between multi-agent handoffs and environment planning.

## 0.1.34

- Added AI navigation metadata to `.aienvmap/status.json`.
- Included artifact paths, read order, safe commands, and agent-use rules in the compact status output.
- Kept the status enhancement read-only and lightweight so `sync` remains the simple default flow.

## 0.1.33

- Made `.aienvmap/status.json` a first-class artifact written by `aienvmap sync`.
- Added `aienvmap status --write` so AI agents and CI can refresh the compact state file directly.
- Updated the GitHub Action to use the built-in status writer instead of shell redirection.

## 0.1.32

- Added GitHub Action support for writing `.aienvmap/status.json` by default.
- Added a `write-status` action input so CI can keep compact AI status artifacts optional.
- Updated the GitHub Action example artifact list to include the status output.

## 0.1.31

- Added `aienvmap status` as a compact human and AI entrypoint.
- Summarized clear/review state, next command, counts, top action, and enforcement advice in one output.
- Kept `context --json` as the richer preflight while making first checks simpler.

## 0.1.30

- Added shared enforcement advice for AI and CI surfaces.
- Exposed advisory-by-default behavior, suggested strict scopes, and scoped CI commands in context and plan outputs.
- Moved strict scope logic into a reusable enforcement module while keeping existing `doctor --strict` behavior compatible.

## 0.1.29

- Added lightweight remediation priority scoring for vulnerable packages.
- Exposed priority level, score, and reasons in security summaries, plans, compact context, and dashboard rows.
- Kept scoring advisory-only so AI agents can choose safer next steps without blocking local operation.

## 0.1.28

- Linked vulnerable package summaries to the dependency snapshot when the package is directly declared.
- Added direct dependency metadata to remediation steps and dashboard security rows.
- Kept the linkage read-only and file-based so security context stays lightweight and non-disruptive.

## 0.1.27

- Added a read-only dependency snapshot to the manifest, context, AIENV.md, and dashboard.
- Captured npm and Python project dependencies from `package.json`, `requirements.txt`, and `pyproject.toml` without installing or resolving packages.
- Linked the env map and light SBOM story so AI agents can see runtime, dependency, and vulnerability context together.

## 0.1.26

- Shared one AI decision contract across `context --json`, `plan`, and `handoff`.
- Added decision mode and required command guidance to plan and handoff outputs.
- Reduced duplicated guidance so multiple AI agents receive the same environment-change rules.

## 0.1.25

- Added a more explicit AI decision contract to `context --json`.
- Included project-local work allowance, environment-change review state, warning codes, and required follow-up commands.
- Clarified that local project work can continue while environment changes remain intent-gated and review-oriented.

## 0.1.24

- Added a dashboard CI Readiness card for `doctor --strict security|policy|coordination|all`.
- Reused the same non-blocking warning engine so humans can pick CI enforcement scope without changing local operation.
- Surfaced matched warning codes per strict scope for faster AI and human review.

## 0.1.23

- Added compact `stepSummary` output to `context --json`.
- Reused the AI plan step model so preflight context can show remediation and environment drift summaries.
- Kept full step details in `aienvmap plan` while keeping context lightweight.

## 0.1.22

- Reworked the README around Quick Start, AI Usage, CI Usage, and outputs.
- Made the project positioning clearer: AI-first environment maps for shared coding machines.
- Emphasized read-only planning and avoiding runtime/tool drift across agents.

## 0.1.21

- Added a GitHub Actions artifact upload example for `AIENV.md`, plan outputs, manifest, and dashboard.
- Added a short README CI pointer to the example workflow.
- Kept the core composite action lightweight and read-only by default.

## 0.1.20

- Added a dashboard Environment Steps card backed by `.aienvmap/plan.json`.
- Surfaced runtime, package manager, Docker, and coordination plan summaries for humans.
- Kept detailed step lists in `plan.md` while keeping the dashboard bounded.

## 0.1.19

- Added runtime, package manager, Docker, and coordination environment steps to `aienvmap plan`.
- Kept environment plans read-only and ask-first for global changes.
- Improved AI guidance for resolving version drift and multi-agent coordination warnings.

## 0.1.18

- Added a dashboard remediation steps card backed by `.aienvmap/plan.json`.
- Kept dashboard remediation details bounded to package, severity, fix version, and advisory references.
- Improved human visibility for AI-generated read-only security plans.

## 0.1.17

- Added bounded security remediation steps to `aienvmap plan`.
- Included package fix versions and advisory references in plan JSON and markdown output.
- Kept remediation output read-only and review-oriented.

## 0.1.16

- Added scoped strict checks with `doctor --strict security|policy|coordination|all`.
- Kept `doctor --ci` compatible as strict `all`.
- Updated the GitHub Action `strict` input to support scoped enforcement while keeping advisory mode by default.

## 0.1.15

- Added dashboard links for written AI plan artifacts.
- Added `write-plan` support to the GitHub Action so CI can emit read-only plan outputs.
- Updated the GitHub Action example to show the sync, plan, and doctor flow.

## 0.1.14

- Added `aienvmap plan` for read-only AI environment action plans.
- Added optional `aienvmap plan --write` artifacts at `.aienvmap/plan.json` and `.aienvmap/plan.md`.
- Kept plan output advisory-only with review gates instead of automatic fixes.

## 0.1.13

- Added `recommendedActions` to AI handoff output.
- Added a Recommended Actions dashboard card for human review.
- Reused the same advisory action engine across context, doctor, handoff, and dashboard.

## 0.1.12

- Added AI-readable `recommendedActions` to `context --json` and `doctor --json`.
- Added concise recommended actions to text context and doctor output.
- Kept recommendations advisory-only; strict failure still requires `doctor --ci`.

## 0.1.11

- Added bounded remediation details to security summaries, including fix versions and advisory references.
- Surfaced remediation hints in `AIENV.md` and the dashboard so AI agents can plan safer dependency updates.
- Kept security scanning read-only and opt-in.

## 0.1.10

- Added optional `pip-audit` JSON parsing for Python security summaries.
- Combined npm and Python vulnerable package summaries into the same AI-facing security context.
- Kept missing Python scanners non-blocking with explicit scanner availability metadata.

## 0.1.9

- Added top vulnerable package summaries for AI context, handoff, `AIENV.md`, and the dashboard.
- Ranked vulnerable packages by severity so agents can prioritize review without reading full audit output.
- Kept security package details bounded to preserve lightweight output.

## 0.1.8

- Added optional `sync --security` / `scan --security` vulnerability summary collection.
- Added read-only npm audit parsing for light SBOM security awareness.
- Exposed security summaries to AI-facing context, handoff, `AIENV.md`, and the dashboard.

## 0.1.7

- Added stale open intent warnings for long-running environment change plans.
- Added stale handoff warnings when environment changes happen after the last recorded AI handoff.
- Added optional `aienvmap handoff --record --actor <agent:id>` timeline entries.

## 0.1.6

- Added optional `sync --deep` / `scan --deep` read-only global tool inventory.
- Kept the default scan lightweight while exposing deep inventory summaries to `AIENV.md`, `context`, `handoff`, and the dashboard.
- Added parsers for npm global packages, pipx tools, uv tools, and Homebrew package versions.

## 0.1.5

- Added machine-readable trust states for observed, planned, changed, review, verified, and stale environment facts.
- Added multi-agent intent conflict warnings for shared runtime/package manager targets.
- Added trust and schema context to `context`, `handoff`, `doctor`, `AIENV.md`, and the dashboard.
- Repositioned the docs around AI environment coordination instead of general AI project memory.

## 0.1.4

- Added `aienvmap handoff` for next-agent environment handoff summaries.
- Added an AI Handoff card to the dashboard.
- Added handoff test coverage.

## 0.1.3

- Strengthened the dashboard audit summary with AI decision, open intents, warnings, and recent changes.
- Added dashboard render coverage for the audit summary surface.

## 0.1.2

- Added `aienvmap sync` as the simple one-step command for init, scan, `AIENV.md`, manifest, ledger, and dashboard generation.
- Improved AI preflight context with an explicit next action.
- Repositioned AGENTS.md integration as an optional snippet instead of default file generation.
- Added machine-readable sync/context improvements for AI and CI integrations.
- Simplified README for faster first-time understanding.
- Kept AGENTS.md, CLAUDE.md, and GEMINI.md integration explicit through `aienvmap snippet`.
- Added troubleshooting and bugfix logs for operational issue tracking.

## 0.1.1

- Added repo-scoped Codex skill wrapper.
- Normalized npm package metadata and published the initial npm package.

## 0.1.0

- Initial AI-first env map prototype.
- Added scan, context, intent, record, compile, doctor, diff, and dash commands.
- Added `AIENV.md`, agent file injection, append-only timeline, and lightweight dashboard output.
