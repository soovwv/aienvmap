# aienvmap

[![CI](https://github.com/soovwv/aienvmap/actions/workflows/ci.yml/badge.svg)](https://github.com/soovwv/aienvmap/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](package.json) / [Website](https://aienvmap.svwvs.com/)
**Know the development environment before an AI changes it.**

`aienvmap` is a dependency-free environment map and explicit change handoff for AI coding agents. It gives Codex, Claude, Gemini, Cursor, and Copilot a read-only preflight for the runtimes they are about to rely on and the environment changes another session already plans - before either agent guesses or changes the machine.

```bash
npx aienvmap@0.2.1 start
```

It reports evidence without silently installing, switching, or removing software. It does not upgrade, repair, or rewrite your development environment.

For a bounded external trial in a disposable directory, run `npx aienvmap@0.2.1 trial`; nothing is uploaded automatically.
![aienvmap terminal demo showing a review-first dependency conflict](examples/aienvmap-terminal-demo.svg)

## Why

AI coding agents are good at changing code. They are bad at remembering what another agent assumed about Node, Python, Java, package managers, or dependency changes. `aienvmap` gives the next agent observed evidence and pending intent before it guesses.

### Use it when

Use it if several AI agents or sessions share environment-affecting work in one repository, laptop, server, or CI workspace; several runtime installations make active routing unclear; or you want evidence and a handoff before approving a change.

### Choose another tool when

Skip it if you only need a full compliance SBOM scanner, runtime installer, hard policy lock manager, distributed lock, or automatic environment repair.

## 10-Second Use

`start` is the one-command AI preflight: it refreshes the environment map when needed, runs quick multi-install reconciliation, and returns the next safe command. To add project instruction pointers for supported AI hosts, preview with `npx aienvmap onboard --dry-run`, then run `npx aienvmap onboard` after review.

Windows PowerShell may select a blocked `npx.ps1` shim. In that case use `npx.cmd aienvmap@0.2.1 start`; do not change the machine execution policy. The same rule applies to `npm.cmd` and an installed `aienvmap.cmd` shim.

Try `npx aienvmap demo` for an isolated conflict example. It shows one agent's dependency intent becoming visible to the next agent; environment changes are never inferred automatically and remain approval-gated.

- Agent A records a planned dependency change.
- Agent B starts later and sees the pending intent.
- The workspace becomes review-first; no package is installed, removed, or switched.

## Evidence, not claims

There are 372 automated tests, plus maintainer-run Windows, Linux, and macOS [validation evidence](VALIDATION.md).

Public external cases are reviewed as evidence, but individual submissions are not used in promotion until at least five have been collected. Negative results and critical reviews are welcome. See [testing](TESTING.md), the [portable case guide](examples/portable-environment-case-guide.md), and the [promotion and community guide](PROMOTION.md).

## External Trial

Run `npx aienvmap@0.2.1 trial` in a disposable directory or disposable project copy on a real development machine. Trial artifacts are isolated under `.aienvmap/trial/`, project Maven/Gradle wrappers are skipped, and nothing is uploaded automatically. The trial runs bounded runtime version probes, so arbitrary discovered executables are not guaranteed side-effect-free. Follow [TESTING.md](TESTING.md), or give [AI_TESTING.md](AI_TESTING.md) to an AI agent. Technical testing needs no human review; optional public evidence uses one compact confirmation, complete-draft review, and separate submission consent. Community maintainers can reuse [TESTER_INVITE.md](TESTER_INVITE.md).

## What the AI gets

- observed Node, npm, pnpm, Yarn, Corepack, Python, pip, uv, pipx, Conda, and Java state;
- information-only .NET, Ruby, Go, and Rust presence;
- project expectations, routing conflicts, light SBOM context, and pending change intent;
- one bounded `aiDecisionEnvelope` with the next safe action, evidence-derived `userQuestion`, `observed-not-approved` authority, and approval boundaries.

`start` creates the env map, light SBOM, AI status, discovery entry, and human dashboard when missing or stale. `reconcile` is read-only by default. Removal, PATH edits, runtime switching, global installs, and lockfile rewrites always require review.

`discover` is read-only and reports `aiDiscovery.decision`: `auto-ready` or `fallback-required`. The bounded APM GitHub skill subpath can be installed with `apm install soovwv/aienvmap/.apm/skills/aienvmap#v0.2.0 --target agent-skills,claude` after the immutable release tag exists; this is a distribution channel, not a claimed central-marketplace listing. APM deploys the skill only: no hooks, MCP server, executable, runtime install, or automatic command execution. `onboard --dry-run` previews tiny marker-scoped pointers, while `onboard` preserves a recognized APM skill and writes native pointers only where coverage is missing. Automatic discovery is best-effort: verification proves marker or skill availability, never AI-host pickup. If pickup is uncertain, paste `copyPastePrompt` from `start --json` or `.aienvmap/discovery.json`, then follow `sessionUse` and `aiEntry`.

Formerly published as `aienvmp`. Use `aienvmap` going forward; new workspaces write `.aienvmap/` artifacts.

Before an environment-affecting change:

```bash
npx aienvmap sbom --json
npx aienvmap intent --actor agent:id --session thread:id --action "planned-change" --target dependency --lease-minutes 60
npx aienvmap checkpoint --actor agent:id --summary "dependency-change" --target dependency
```

On a shared server, an AI can protect a decision made from an earlier read: take `coordinationRevision` from `aienvmap status --json`, then pass `--if-revision ir1:...` to `intent` or `resolve`. If another AI changed the intent log first, aienvmap rejects the stale write and tells the AI to refresh. When the same AI label can run concurrently, pass a host/thread identifier with `--session` and an advisory duration from 5 to 1440 minutes with `--lease-minutes`. Different sessions under the same actor are separate conflict owners; expiry stays open for review and never grants permission to modify the environment.

For the shared-server story, read [AI workspace coordination case study](examples/ai-workspace-case-study.md). For recommendation criteria, read [AI adoption guide](examples/ai-adoption-guide.md).

## Advanced environment evidence

Bounded home inspection, portable redacted comparisons, manager ownership evidence, Java build-tool routing, external CycloneDX/SPDX summaries, and an opt-in drift gate are available for advanced review. None proves identity or authorizes cleanup; see the [roadmap](ROADMAP.md#reconciliation-track) for exact boundaries and commands.

## Outputs

```text
AIENV.md                 # Markdown env map for AI agents
.aienvmap/discovery.json  # smallest AI fallback entry: discovery decision + maintenance routine
.aienvmap/status.json     # first AI read: clear/review, next command, nextAgent hint
.aienvmap/README.md       # generated start-here file when AI finds the artifact folder
.aienvmap/summary.md      # compact AI/CI summary with start-here path
.aienvmap/manifest.json   # runtime map + light SBOM
.aienvmap/sbom.json       # light SBOM; optional external evidence summary lives beside it
.aienvmap/sbom.cdx.json   # CycloneDX-lite export from project manifests
.aienvmap/intents.jsonl   # planned env changes
.aienvmap/timeline.jsonl  # append-only change ledger
.aienvmap/plan.md         # read-only action plan
.aienvmap/dashboard.html  # human dashboard
```

Sharing policy: treat `manifest*.json`, `reconcile.json`, raw SBOM files, `dashboard.html`, and `trial/portable.json` as local-only unless a human reviews them. Coordination files can contain operator-supplied text and also require review. Use `reconcile --portable --json` or the generated case draft for redacted sharing. aienvmap never edits the project's `.gitignore` automatically.

## AI Contract

The 0.2.0 `schema --json` contract covers trial write scope, privacy, runtime-probe boundaries, and manual submission. `start`, `status`, `context`, `reconcile`, and SBOM outputs share `aiDecisionEnvelope`; `requiresHumanApprovalBefore` keeps destructive actions review-only. Reconciliation emits a proposal-only `consolidationPlan`, never an apply or removal command.
`aiAdoptionDecision.uniqueJob`, `chooseInstead`, and `compositionOrder` tell AI when to use, combine, or skip aienvmap. `agentPointers.discovery`, `aiDiscovery.decision`, `sessionUse`, `startupChecklist`, `aiEntry`, and `copyPastePrompt` distinguish `auto-ready` from `fallback-required`; marker verification never proves AI-host pickup.
`environmentChangeProtocol`, `operationalSafety`, `followUpPlan`, collaboration, coordination, and bounded session leases keep shared changes advisory. `followUpPlan` points to sync, status, or handoff; `coordinationRevision` adds optional compare-and-swap protection without a daemon or database.
`externalSbom`, `qualitySignals`, `releaseGate`, `releaseReadiness`, explicit schema versions, and additive post-0.2.0 fields preserve stable, evidence-bounded automation.

## Commands

```bash
aienvmap onboard                 # install Codex/Claude/Gemini pointers and sync
aienvmap start                   # one-command AI startup + copy-paste prompt
aienvmap sync                    # update env map, discovery, start-here README, status, summary, SBOM, dashboard
aienvmap status                  # 5-line env decision with start-here path
aienvmap context --json          # AI decision contract
aienvmap sbom --json             # light SBOM; add --import <workspace-json> --write for an external evidence reference
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

`reconcile-check` defaults to `off`. Enable it only on a stable workstation or self-hosted runner after reviewing the automatic observation and explicitly running `aienvmap reconcile --write`; ephemeral hosted runners can legitimately have different runtime inventories.

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
- npm releases are manually gated and batched; the workflow requires current main, a matching `v<version>` tag, an unpublished version, OIDC provenance, and post-publish registry integrity verification.
- Default publish decision is `hold`; publish only after several meaningful changes are batched, `npm run release:check` passes, and `schema --json` `releaseReadiness.currentBatch` is reviewed.
- `schema --json` exposes `releaseGate`, `releaseReadiness.currentBatch`, `contractReview`, `nextStabilizationTasks`, `requiredBeforeStable`, and `evidenceCommands`. `npm run contract:check` fail-closes on an unreviewed change to the 15 documented AI JSON root-field surfaces, including `trial`.
- Broken or superseded versions are deprecated instead of unpublished.

## Development

```bash
node --test
npm run smoke && npm run contract:check && npm run perf:check
npm run release:check
npm pack --dry-run
```

[Roadmap](ROADMAP.md) / [Scorecard](SCORECARD.md) / [Market snapshot](MARKET.md) / [Promotion guide](PROMOTION.md) / [Security](SECURITY.md) / [Troubleshooting](TROUBLESHOOTING.md) / [Bugfix Log](BUGFIXES.md) / [Contributing](CONTRIBUTING.md) / [Portable case guide](examples/portable-environment-case-guide.md) / [Multi-agent conflict demo](examples/multi-agent-conflict.md) / Apache-2.0
