---
name: aienvmap
description: Use before changing runtimes, package managers, Docker settings, global packages, or environment policy in an AI coding workspace. Reads aienvmap context, prevents AI-driven version drift, records intent before environment changes, and records what changed afterward.
---

# aienvmap

Use `aienvmap` as the shared AI workspace coordination layer for observed environment evidence and explicit change handoff in this workspace.

The goal is to help multiple AI agents avoid silently installing or using different versions of Node, Python, Docker, package managers, dependencies, lockfiles, or global tools.

`aienvmap` is advisory by default. It should reveal drift, intent conflicts, light SBOM risk, and handoff gaps without heavy locks or surprise failures.

## Use / Skip / Start

Use `aienvmap` when multiple AI agents or humans share environment-affecting work in one repo, server, laptop, CI workspace, or GPU machine.

Skip it when the user only needs a full compliance SBOM scanner, a vulnerability scanner, or a hard policy lock manager.

For SBOM/security evidence, keep `aienvmap` as the AI coordination layer and use Syft, Trivy, Grype, Dependency-Track, or another dedicated scanner when full evidence is required.

Start with:

```bash
npx aienvmap start
npx aienvmap onboard
npx aienvmap discover --json
```

Use root `discoveryDecision`, `aiEntry`, `startupChecklist`, `copyPastePrompt`, and `fallbackPrompt` from `start --json` before assuming automatic pickup worked. `discover --json` also exposes the same guidance under `aiDiscovery`.

If you are deciding whether to recommend this tool, read `npx aienvmap schema --json` and use `aiAdoptionDecision` first. It is the compact use/recommend/start/skip block for AI agents.
For deeper criteria and evidence, read `recommendation.shortPitch`, `recommendation.decisionRoutine`, `recommendation.evidenceDocs`, `qualitySignals`, `examples/ai-adoption-guide.md`, and `examples/ai-workspace-case-study.md`.

## Session Start

If the workspace has not been onboarded yet, run:

```bash
npx aienvmap onboard
```

For optional Cursor or GitHub Copilot discovery pointers, use:

```bash
npx aienvmap onboard --agents cursor,copilot
```

At the start of an AI coding session, use the one-command startup path when automatic instruction-file discovery is uncertain:

```bash
npx aienvmap start --json
```

Use `aiEntry` and `aiSession` from start/status/context JSON as the shortest startup routine: read order, stale refresh, intent, checkpoint, and handoff.

Read `aiDecisionEnvelope` first in start/status/context, reconcile, and SBOM JSON. Use `decision`, `reasonCodes`, `evidenceRefs`, and `nextSafeCommand` for the short path. `requiresHumanApprovalBefore` applies even when clear: removal, global installs, runtime switching, and lockfile rewrites remain review-only; unknown future fields are additive.

Read `externalSbom` during startup. `refresh-import-required` and `component-drift-review` require opening `.aienvmap/sbom.json` and the original artifact before dependency or release changes. `identity-confidence-review` is non-blocking coordination evidence, not proof or remediation authority.

If instruction-file pointers are missing or uncertain but `.aienvmap` exists, start at `.aienvmap/discovery.json`, check `maintenance.nextCommand`, then read `.aienvmap/status.json`, `.aienvmap/summary.md`, and `npx aienvmap context --json`.

Use `agentPointers.discovery` or the compact `status` line containing `discovery:` to decide whether Codex, Claude, Gemini, or optional agent pointers can find the env map.

Use `npx aienvmap start --json` root `aiEntry`, or `npx aienvmap discover --json` `aiDiscovery.aiEntry`, when automatic pickup is uncertain. Automatic discovery is best-effort because each AI host reads different instruction files.

Use `aiDiscovery.decision` as the compact discovery result: `auto-ready` means an instruction-file pointer exists, and `fallback-required` means use the fallback read path and run `aiDiscovery.nextSetupCommand` when the user wants future auto-discovery. Follow `aiDiscovery.startupChecklist` as the short repeatable startup routine.

If automatic pickup failed and a human needs to hand this contract to another AI, paste root `copyPastePrompt` from `start --json`, `aiDiscovery.copyPastePrompt` from `discover --json`, or `copyPastePrompt` from `.aienvmap/discovery.json`. Treat `fallbackPrompt` as the compatible older alias.

When present, follow `aiDiscovery.aiEntry.readFirst`, `nextCommand`, `beforeEnvironmentChange`, `afterEnvironmentChange`, and `handoff` as the minimum startup routine before shared environment changes. Treat `resume` as the more detailed compatible routine.

Use `followUpPlan` before touching a shared environment target; if it is `pending`, run its `nextCommand` first.

If `artifactFreshness.state` is not `fresh`, or `.aienvmap/status.json` is missing, run:

```bash
npx aienvmap sync
```

Local source edits can continue unless status or context says environment review is required.

## Preflight

Before environment-impacting work, run the light preflight first:

```bash
npx aienvmap status --write
```

Then read the short handoff:

```bash
cat .aienvmap/summary.md
```

For deeper machine-readable context, use:

```bash
npx aienvmap context --json
```

Before dependency, lockfile, security remediation, or release-affecting dependency work, read `.aienvmap/sbom.json` or `npx aienvmap sbom --json` and follow `dependencyQuickCheck`.

When a human or CI already generated CycloneDX/SPDX JSON, preview it with `npx aienvmap sbom --import <workspace-file> --json`; persist only after review with `--write`. Read `externalEvidenceDecision`, `baselineDrift`, `componentInventory.truncated`, and `identityConfidence`; PURL is preferred and `fallback-only` requires ecosystem verification in both originals. Treat `component-drift-review` as evidence, never remediation authority. Verify `verification` is `digest-match`. `digest-mismatch` or `source-unavailable` requires explicit re-import; use `--clear-import --write` to remove only aienvmap's summary reference. Never install or run Syft/Trivy automatically from this contract.

Before consolidating runtimes or package managers on an existing machine, read `.aienvmap/reconcile.json` or run `npx aienvmap reconcile --json`. Review `npm.alternativeManagers` for pnpm, Yarn, and Corepack, `python.toolEntryPoints` for uv/pipx, and `python.conda` for bounded environment routing; co-location is evidence, not ownership. Use `--full-packages` only when package-level, Python installer metadata, or manager-native evidence is required; use `--portable --json` for quick redacted evidence or `--portable-from .aienvmap/reconcile.json --json` to redact a reviewed full artifact without rescanning, and still review it before sharing. Compare two redacted cases offline with `--portable-compare before.json --against after.json --json`; compare `aerp1` fingerprints only as pseudonymous fact-set tokens, never machine IDs. Read `python.managerInventories`; exact uv interpreter, pyenv prefix, and mise installed-path matches may prove manager control. Treat `runtimeLinks`, `installerEvidence`, and per-installation `managerEvidence` as evidence; even `ownershipProven: true` never overrides `removalAuthorized: false` or human approval.

When `aiDecision.clarification.required` is true, ask its `question` before recommending consolidation. Use only its listed choices. Multiple or inactive installations may be intentional; default to `need-more-evidence`, preserve `keep-intentional` as a valid answer, and never infer cleanup intent from duplication.

On a shared server, inspect one other account only when its absolute home was explicitly supplied: `npx aienvmap reconcile --inspect-home <absolute-home> --portable --json`. For several accounts, copy and edit `examples/inspect-homes.json`, use non-identifying aliases, and save `npx aienvmap reconcile --inspect-homes homes.json --json` output. This accepts at most eight explicit homes, never enumerates system users, excludes the invoking process PATH, and never invokes discovered executables. Each `entries[].evidence` item is administrator file-presence evidence, not an owning-user version report. Extract one item with `npx aienvmap reconcile --home-evidence aggregate.json --alias build-a --json`, then ask the owning user to run its `nextSafeCommand`. Compare the administrator and owner reports with `--portable-compare admin.json --against owner.json --owner-verification --json`. Owner verification reports category coverage only; it never proves identity, path or installation equivalence, authoritative versions for administrator paths, or permission to remove software.

For an external environment case, create the allowlisted JSON with `--case-summary`, or print a copyable draft with `--case-summary portable.json --markdown`. The Markdown mode writes nothing and uploads nothing. It never completes human verification or makes the draft market evidence; require the user to review every retained field and manually submit it.

For Node, read `node.managerInventories.volta`, `node.managerInventories.fnm`, `node.managerInventories.nvm`, `node.managerInventories.mise`, and each installation's `reportedExecutable` plus `managerEvidence`. Strong relationships are Volta `inventory-and-image-path-match`, fnm `list-and-version-path-match`, nvm `configured-root-version-path-match`, or mise `installed-json-path-match`. An nvm external symlink, version-only match, or root inference never proves ownership. Never uninstall, source/activate a shell manager, or rewrite project pins automatically.

For Java, read `otherRuntimes.java.discoveryEvidence` and each installation's `source`/`discovery`. Windows Registry, macOS `java_home`, and Linux alternatives are provenance signals only; do not infer that an OS-native entry is safe to remove.

Use `otherRuntimes.java.runtimeMetadata` and each Java installation's vendor, architecture, `runtimeKind`, `javaHome`, and `propertyEvidence` to distinguish same-version JDKs. Treat `jdk` as sibling-`javac` evidence and `jre-or-runtime-image` as a conservative label, not a cleanup decision.

Read `otherRuntimes.java.buildTools.bindings` before changing Java routing. Project `mvnw`/`gradlew` wrappers take precedence over PATH tools; keep Gradle Launcher and Daemon JVM evidence distinct. `exact-home` is strong evidence, Maven `unique-major-version` is only an inference, and `unresolved` requires review. Never rewrite wrappers, `JAVA_HOME`, or PATH from this evidence alone.

Read each Java installation's `managerEvidence` and root `aiDecision.javaManagerEvidence`. `canonical-home-in-install-root` may prove SDKMAN/mise install control; `registered-or-shimmed-runtime` and every jenv `registered-runtime-routing` entry prove routing only. Even `ownershipProven: true` leaves `removalAuthorized: false`; use the identified manager to prepare a rollback-capable proposal, not an automatic uninstall.

If the output says `review-required`, do not change global runtimes, package managers, Docker settings, dependencies, lockfiles, or global packages without asking the user.

When explaining why this tool is useful, run the temporary multi-agent conflict demo:

```bash
npx aienvmap demo
```

The demo should show a `review-before-env-change` collaboration state when multiple AI agents target the same dependency or environment surface.

## Before Environment Changes

Record intent before changing shared environment state:

```bash
npx aienvmap intent --actor agent:codex --session thread:id --action "<planned change>" --target "<tool-or-runtime>" --lease-minutes 60
```

On a shared server, use a stable per-session identifier when concurrent sessions may share one actor label. Lease expiry is review evidence only: never treat it as permission to resolve an intent, remove software, or change the environment.

Use this for changes such as:

- installing or upgrading Node, Python, Docker, package managers, or global CLIs
- changing `.nvmrc`, `.python-version`, `mise.toml`, `.tool-versions`, or `.aienvmap/policy.yml`
- switching package managers
- changing dependencies or lockfiles
- changing Docker daemon/context assumptions

## After Environment Changes

Use the one-command checkpoint after an accepted environment change:

```bash
npx aienvmap checkpoint --actor agent:codex --summary "<what changed>" --target "<tool-or-runtime>"
```

This records the change, refreshes the env map, writes status/summary/SBOM artifacts, and records a handoff.

If checkpoint is not available, use the explicit fallback:

```bash
npx aienvmap sync
npx aienvmap record --actor agent:codex --summary "<what changed>" --target "<tool-or-runtime>" --evidence "<command or file>"
npx aienvmap handoff --record --actor agent:codex
```

## Safety Rules

- `aienvmap` warnings are non-blocking by default.
- Use `npx aienvmap schema --json` and `operationalSafety` when deciding what must not be changed automatically.
- Treat policy mismatches as review-required.
- Do not install, upgrade, downgrade, or remove global software unless the user explicitly asks.
- Prefer project-local version files and local environments.
- Do not switch package managers or rewrite lockfiles only to satisfy a tool preference.
- Do not use warnings as permission to interrupt production or shared workspace operations.
- Use `npx aienvmap doctor --ci` only in CI or explicit strict-mode automation.

## Normal Coding Work

For ordinary source edits that do not affect runtime versions, package managers, Docker settings, global packages, or environment policy, you do not need to record an intent.
