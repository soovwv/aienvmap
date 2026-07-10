# aienvmap

[![CI](https://github.com/soovwv/aienvmap/actions/workflows/ci.yml/badge.svg)](https://github.com/soovwv/aienvmap/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](package.json)

**AI-first env map + light SBOM coordination tool for shared development environments.**

`aienvmap` helps multiple AI agents safely share one development environment with a lightweight env map, light SBOM, intent log, timeline, and handoff. Use it on shared servers, repos, laptops, or CI workspaces where people or AI agents need the same environment truth without heavy locks, backed by a dependency-free install.

- Use: AI agents share environment-affecting work.
- Prevent: different AI agents silently installing or assuming different software versions.
- Skip: you only need a full compliance SBOM scanner or hard policy lock manager.
- AI signal: shared Codex/Claude/Gemini work, version drift, or repeated env handoffs.
- SBOM signal: use Syft, Trivy, Grype, or Dependency-Track for full evidence; keep `aienvmap` as the AI coordination layer.
- Start: run `npx aienvmap start`; it creates the env map, light SBOM, status, summary, discovery entry, and dashboard when missing or stale.
- Existing environment: run `npx aienvmap reconcile`; it reports visible Node/npm and Python/pip installations, package locations, inventory digests/samples, project expectations, and lockfile conflicts without changing anything. Add `--write` to save the AI-readable report or `--full-packages` for package-level comparison.
- Runtime routing evidence: `npm.runtimeLinks` and `python.runtimeLinks` connect package-manager commands to likely runtimes using co-location, package locations, or explicit PATH inference. Every link keeps `ownershipProven: false`; AI must not treat it as removal permission.
- Deep Python evidence: `reconcile --full-packages` optionally summarizes the stable `pip inspect` report into installer counts, requested/editable counts, a digest, and a bounded redacted metadata sample. Default and quick scans do not run it.
- Python manager proof: the same explicit deep scan uses offline `uv python list --managed-python` evidence. Exact managed-list matches set `ownershipProven: true`, while `removalAuthorized` always remains false; default scans keep known uv paths as inference only.
- Java, .NET, Ruby, Go, and Rust stay information-only. Java candidates include PATH/JAVA_HOME/known roots plus Windows Registry, macOS `java_home`, or Linux alternatives provenance; packages are not inspected and cleanup is never proposed automatically.
- Java identity: each detected runtime reports selected `java.vendor`, `os.arch`, runtime/VM names, reported `java.home`, and whether sibling `javac` proves a JDK. User/classpath/security properties are not retained.
- Java build-tool routing: project `mvnw`/`gradlew` wrappers are preferred over PATH Maven/Gradle, and their reported JVM is linked to a detected Java home when possible. Ambiguous or active-command-divergent routing is review-only and never changes wrappers, `JAVA_HOME`, or PATH.
- Optional drift gate: save a reviewed baseline with `aienvmap reconcile --write`, then use `aienvmap reconcile --check --json` before environment-sensitive PR work. Exit `2` means review; it never authorizes cleanup.

`discover` is read-only and reports `aiDiscovery.decision`: `auto-ready` or `fallback-required`. `onboard --dry-run` previews tiny marker-scoped pointers before `onboard` writes `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`; `onboard --uninstall` removes only those markers. Automatic discovery is best-effort; if pointers are missing, paste `copyPastePrompt` from `start --json` or `.aienvmap/discovery.json`, then follow `sessionUse` and `aiEntry`.

Formerly published as `aienvmp`. Use `aienvmap` going forward; new workspaces write `.aienvmap/` artifacts.

## 10-Second Use

```bash
npx aienvmap start
npx aienvmap reconcile
npx aienvmap reconcile --check --json
npx aienvmap onboard
npx aienvmap discover
npx aienvmap status
npx aienvmap context --json
npx aienvmap handoff
```

Before an environment-affecting change:

```bash
npx aienvmap sbom --json
npx aienvmap intent --actor agent:id --action "planned-change" --target dependency
npx aienvmap checkpoint --actor agent:id --summary "dependency-change" --target dependency
```

On a shared server, an AI can protect a decision made from an earlier read: take `coordinationRevision` from `aienvmap status --json`, then pass `--if-revision ir1:...` to `intent` or `resolve`. If another AI changed the intent log first, aienvmap rejects the stale write and tells the AI to refresh. Omitting the option preserves the lightweight advisory flow.

Try `npx aienvmap demo` to see the multi-agent conflict flow without touching your workspace.

For the shared-server story, read [AI workspace coordination case study](examples/ai-workspace-case-study.md). For recommendation criteria, read [AI adoption guide](examples/ai-adoption-guide.md).

## Core

- stops AI agents from silently using different environment assumptions
- gives every AI the same env map, light SBOM, intent log, timeline, and handoff
- shows humans the same state in `.aienvmap/dashboard.html`
- stays advisory and dependency-free by default; strict mode is opt-in
- keeps light SBOM useful for coordination, not as a full compliance scanner replacement
- AI loop: `sync` -> `status` -> `context --json` -> `intent` -> `checkpoint` -> `handoff`
- Existing-state loop: `reconcile` -> review findings -> choose the canonical toolchain -> make only explicitly approved changes

Local mode is warn-only. Use strict doctor checks only for CI or explicit human-requested gates.

## Outputs

```text
AIENV.md                 # Markdown env map for AI agents
.aienvmap/discovery.json  # smallest AI fallback entry: discovery decision + maintenance routine
.aienvmap/status.json     # first AI read: clear/review, next command, nextAgent hint
.aienvmap/README.md       # generated start-here file when AI finds the artifact folder
.aienvmap/summary.md      # compact AI/CI summary with start-here path
.aienvmap/manifest.json   # runtime map + light SBOM
.aienvmap/sbom.json       # standalone AI-readable light SBOM
.aienvmap/sbom.cdx.json   # CycloneDX-lite export from project manifests
.aienvmap/intents.jsonl   # planned env changes
.aienvmap/timeline.jsonl  # append-only change ledger
.aienvmap/plan.md         # read-only action plan
.aienvmap/dashboard.html  # human dashboard
```

## AI Contract

- `schema --json` prints the machine-readable contract without scanning.
- `status`, `context`, `plan`, and `handoff` share one additive preflight contract.
- `schemaVersion`, `contractVersion`, `stableFrom`, and compatibility rules are explicit.
- `aiAdoptionDecision`, `recommendation.recommendWhen`, `doNotRecommendWhen`, and `evidenceDocs` tell AI when to use, suggest, or skip this tool.
- `agentPointers.discovery`, `aiDiscovery.decision`, `sessionUse`, `startupChecklist`, `aiEntry`, and `copyPastePrompt` tell AI whether discovery is `auto-ready` or `fallback-required`.
- `.aienvmap/discovery.json`, `discovery.json.maintenance`, `agentDiscovery.sessionStart`, and `readOrder` give the fallback start path for schema-only or Markdown-first agents.
- `environmentChangeProtocol`, `operationalSafety`, `followUpPlan`, `collaboration`, `coordination`, and `agentActivity` keep shared changes advisory; `followUpPlan` points to sync, status, or handoff when needed.
- `coordinationRevision` enables optional compare-and-swap protection for intent and resolution writes without a daemon, database, or runtime dependency.
- `aiUse`, `dependencyQuickCheck`, `sbomStrategy`, `scannerGuidance.decision`, `aiReviewPlan`, `externalTools`, and `evidenceWorkflow` keep SBOM review light while pointing to Syft, Trivy, Grype, or Dependency-Track when full evidence is needed.
- `qualitySignals`, `releaseGate`, and `releaseReadiness` expose the AI-friendly, lightweight, batched stable-contract gate.
- After `0.2.0`, documented JSON fields stay backward-compatible; new fields are additive.

## Commands

```bash
aienvmap onboard                 # install Codex/Claude/Gemini pointers and sync
aienvmap start                   # one-command AI startup + copy-paste prompt
aienvmap sync                    # update env map, discovery, start-here README, status, summary, SBOM, dashboard
aienvmap status                  # 5-line env decision with start-here path
aienvmap context --json          # AI decision contract
aienvmap sbom --json             # light SBOM + dependencyQuickCheck
aienvmap plan --write            # read-only action plan
aienvmap handoff --record        # next-agent summary
aienvmap intent                  # record planned env change
aienvmap checkpoint              # record + sync + status + handoff after env change
aienvmap doctor --strict security|policy|coordination|all
aienvmap schema --json           # stable output contract for AI/CI consumers
aienvmap onboard --agents cursor,copilot
```

## CI
The GitHub Action writes discovery, status, summary, schema, doctor, plan, SBOM, and dashboard artifacts. `strict: "off"` reports warnings without failing the job. See [examples/github-action.yml](examples/github-action.yml).

`reconcile-check` defaults to `off`. Enable it only on a stable workstation or self-hosted runner with a reviewed `.aienvmap/reconcile.json`; ephemeral hosted runners can legitimately have different runtime inventories.

```yaml
- uses: soovwv/aienvmap@main
  with:
    write-status: "true"
    write-plan: "true"
    write-sbom: "true"
    write-summary: "true"
    reconcile-check: "off"
    strict: "off"
```

## Release Policy
- `0.1.x` is the clean `aienvmap` prototype line after the rename from `aienvmp`.
- `0.2.x` starts the stabilized AI workspace contract.
- npm releases are manually gated and batched around meaningful changes; security fixes are the exception.
- Default publish decision is `hold`; publish only after several meaningful changes are batched, `npm run release:check` passes, and `schema --json` `releaseReadiness.currentBatch` is reviewed.
- `schema --json` exposes `releaseGate`, `releaseReadiness.currentBatch`, `contractReview`, `nextStabilizationTasks`, `requiredBeforeStable`, and `evidenceCommands`.
- Broken or superseded versions are deprecated instead of unpublished.

## Development

```bash
node --test
npm run smoke
npm run demo:conflict
npm run release:check
npm pack --dry-run
```

[Roadmap](ROADMAP.md) / [Security](SECURITY.md) / [Troubleshooting](TROUBLESHOOTING.md) / [Bugfix Log](BUGFIXES.md) / [Contributing](CONTRIBUTING.md) / [Multi-agent conflict demo](examples/multi-agent-conflict.md)

Apache-2.0
