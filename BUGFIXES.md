# Bugfix Log

Short record of bugs, fixes, and follow-up checks.

## 2026-07-10

### CI matrix could fail from queued job cancellation

- Issue: a push run could show failed even when completed jobs passed, because several large matrix jobs stayed queued and were cancelled.
- Fix: CI now keeps cross-platform Node 20 coverage and Windows Node 18/20/22 compatibility while reducing the matrix from 9 jobs to 5.
- Verification: `npm run release:check` passes locally; the next GitHub Actions run should confirm the lighter matrix.

## 2026-07-08

### GitHub Action hid strict-plan guidance inside artifacts

- Issue: the Action produced `doctor.json` and `summary.md`, but the recommended local/CI strict commands were not visible as a dedicated Step Summary block.
- Fix: the Action now appends an `aienvmap strict plan` section sourced from advisory doctor metadata, using a temporary payload when `write-doctor-json` is disabled.
- Verification: Action regression tests check the strict-plan block, `strictPlan` source, CI command, and temporary-file fallback.

### CLI version was hardcoded

- Issue: `npm run smoke` printed `0.1.0` after the package version changed.
- Fix: CLI now reads the version from `package.json`.
- Verification: `npm run smoke` prints the package version.

### AGENTS.md default generation conflicted with product focus

- Issue: default agent instruction file generation made `aienvmap` look like an AGENTS.md generator.
- Fix: `sync` now focuses on `AIENV.md`, manifest, intent log, timeline, and dashboard. Agent instruction integration is explicit through `aienvmap snippet`.
- Verification: `node --test` confirms `sync` does not create `AGENTS.md` by default and `snippet --write` only updates the marker block.

### npm publish metadata appeared stale

- Issue: npm publish returned success for `0.1.2`, but `npm view aienvmap version` briefly returned `0.1.1`.
- Fix: verified with `npm view aienvmap versions --json` and `npm dist-tag ls aienvmap`; registry later reported `0.1.2`.
- Verification: `npm view aienvmap version` returns `0.1.2`.

### macOS SSH PATH did not expose Node/npm

- Issue: remote macOS non-interactive SSH command did not find `node` or `npm`.
- Fix: test command used `/bin/zsh -lc` to load login shell PATH.
- Verification: remote test detected Node `v25.3.0`, npm `11.11.0`, and completed `aienvmap sync`.

### Security summaries lacked remediation hints

- Issue: AI agents could see vulnerable package names but not enough bounded detail to plan the next dependency update.
- Fix: npm and Python security summaries now include fix versions and advisory references when scanners provide them.
- Verification: parser tests cover npm remediation objects and pip-audit advisory ids; Windows and macOS tarball tests completed `sync --security`.

### Advisory doctor behavior needed clearer verification

- Issue: `doctor` warnings can look like failures to AI/CI consumers even though local operation should stay non-blocking by default.
- Fix: `doctor --json` now exposes `exitBehavior`, and enforcement gate metadata explains when strict mode sets a failure exit code.
- Verification: Windows and macOS candidate smoke checks confirmed default `doctor --json` exits successfully while `doctor --strict policy --json` fails on matching policy warnings.

### Record follow-up loop needed platform verification

- Issue: dependency/security records need to guide the next AI back through sync, status, and handoff without forcing operations.
- Fix: `record` timeline entries now include follow-up metadata, and status/context/dashboard surface unresolved follow-ups.
- Verification: Windows and macOS candidate smoke checks confirmed `record --target dependency` appears in `status --json` followUps and the dashboard Follow-ups card.

### Multi-agent records were less visible than open intents

- Issue: open intents showed planning conflicts, but two agents could record changes to the same env target after a handoff without a compact coordination signal.
- Fix: `doctor`, status/context, handoff, and the dashboard now expose same-target multi-agent records through advisory warnings and `agentActivity`.
- Verification: tests cover multi-agent record detection, later handoff reset, status JSON, handoff text, dashboard HTML, and recommended actions.

### Post-change loop was too many commands for routine AI handoff

- Issue: after an environment change, agents had to remember separate record, sync, status, and handoff commands.
- Fix: `aienvmap checkpoint` now performs the post-change loop and records an explicit sync ledger entry so follow-ups can be closed.
- Verification: checkpoint tests cover text/JSON output, status artifact refresh, timeline entries, handoff recording, and cleared follow-ups.

### Light SBOM risk required too much parsing

- Issue: AI consumers could see package and vulnerability details, but had to infer risk level and next commands from several nested fields.
- Fix: `lightSbom.riskSummary` and preflight `sbomRisk` now provide a compact risk score, signals, review targets, and advisory next steps.
- Verification: tests cover risk scoring, top-risk severity fallback, scanner-off guidance, status/context exposure, dashboard rendering, and recommended actions.

### Light SBOM was only nested inside larger artifacts

- Issue: CI tools and AI agents that only need dependency/SBOM context had to read the full manifest or context payload.
- Fix: `aienvmap sbom --json` and `.aienvmap/sbom.json` now expose a standalone light SBOM artifact.
- Verification: tests cover standalone SBOM construction, writing, sync output, schema metadata, and dashboard linking.

### Light SBOM needed a lightweight standard export

- Issue: the standalone SBOM was AI-friendly, but less convenient for tools expecting CycloneDX-shaped data.
- Fix: `aienvmap sbom --format cyclonedx-lite` and `.aienvmap/sbom.cdx.json` now export project-manifest packages in a CycloneDX-compatible shape with explicit limitations.
- Verification: tests cover component mapping, vulnerability hints, sync output, schema metadata, and dashboard links.

### CI example did not surface SBOM artifacts clearly

- Issue: sync could generate SBOM artifacts, but the GitHub Action and example upload list did not make them explicit.
- Fix: the Action now has `write-sbom` and the example uploads both native and CycloneDX-lite SBOM artifacts.
- Verification: Action tests cover input metadata, SBOM write commands, and example artifact paths.

### CI and AI review still needed a short handoff view

- Issue: `status.json` was AI-friendly, but GitHub Actions and quick human review still required opening JSON artifacts or the dashboard.
- Fix: `aienvmap summary` now writes `.aienvmap/summary.md`, `sync` creates it by default, and the GitHub Action appends it to `GITHUB_STEP_SUMMARY`.
- Verification: tests cover summary rendering, sync artifact creation, schema metadata, Action wiring, and example upload paths.

### Windows-created JSON files could be missed

- Issue: UTF-8 BOM JSON files created by some Windows tools could fail JSON parsing and make dependency snapshots look empty.
- Fix: `readJson` now strips a leading UTF-8 BOM before parsing.
- Verification: regression tests cover BOM JSON parsing and Windows smoke testing confirmed dependency counts in `summary.md`.

### Agent instructions lagged behind the current protocol

- Issue: packaged skill and pointer snippets still emphasized older context/record flows and did not direct agents to `summary.md`.
- Fix: snippets and the Codex skill now use the current status, summary, context, intent, and checkpoint flow with agent-specific actor examples.
- Verification: regression tests cover snippet output for AGENTS.md, Claude, and Gemini, and summary/status tests cover the read order and dependency protocol.

### AI pointer files were only detected as booleans

- Issue: AI and humans could see that an instruction file existed, but not whether it actually contained the aienvmap pointer.
- Fix: `agentFiles` now records path, existence, pointer marker state, role, and install command; recommended actions suggest installing a pointer without failing local work.
- Verification: tests cover sync pointer scanning, recommended action output, and dashboard status labels.

### AI consumers had to inspect the full manifest for pointer state

- Issue: `status`, `context`, and `doctor` did not expose a compact pointer summary even after manifest scanning detected it.
- Fix: `agentPointers` now appears in status/preflight, context JSON, doctor JSON, and summary markdown.
- Verification: regression tests cover status, context, doctor, schema, and summary outputs.

### AI continuation readiness was spread across several fields

- Issue: AI consumers had to infer readiness from status, intents, activity, follow-ups, pointer state, and SBOM risk separately.
- Fix: `aiReadiness` now provides one advisory ready/review signal across status, context, doctor, summary, and dashboard.
- Verification: regression tests cover ready/review summaries, text status output, schema metadata, and dashboard rendering.

### AI readiness was visible but not first in human review surfaces

- Issue: CI Step Summary and the dashboard showed readiness, but agents and humans still had to scan past broader status fields to find the main AI continuation signal.
- Fix: `.aienvmap/summary.md` now starts with `AI readiness`, `AI signals`, and `AI next`; the dashboard audit band includes readiness signals in its hint.
- Verification: regression tests assert the summary top block and dashboard readiness signals; Windows and macOS package smoke checks cover generated artifacts.

### AI review state could sound more blocking than intended

- Issue: `aiReadiness.level: review` made risk visible, but did not explicitly tell AI agents which local actions remain safe and which environment changes need intent/review first.
- Fix: `aiReadiness` now includes `requiresHumanReview`, `safeProjectLocalActions`, and `reviewOnlyEnvironmentChanges`; `summary.md` includes the first safe-local-work hint.
- Verification: regression tests cover status, context, summary, and schema outputs; Windows smoke confirmed generated JSON and summary fields.

### Standalone SBOM did not expose the dependency-change loop directly

- Issue: AI agents reading only `.aienvmap/sbom.json` could see risk and hints, but still had to infer the safe dependency-change sequence from several fields.
- Fix: `aiDependencyReview` now gives a top-level advisory review block with read order, safe actions, review targets, before-change commands, and after-change checkpoint guidance.
- Verification: regression tests cover the new SBOM block and schema metadata; local sync smoke confirmed generated `sbom.json` separates before-change commands from after-change checkpoint commands.

### SBOM dependency review was not visible across all review surfaces

- Issue: `aiDependencyReview` was available in standalone SBOM output, but the manifest-backed dashboard and compact summary did not surface the same dependency-review guidance.
- Fix: manifest generation now includes `lightSbom.aiDependencyReview`; the dashboard Light SBOM card and `summary.md` show the AI dependency review status and commands.
- Verification: regression tests cover generation, dashboard rendering, SBOM artifact reuse, and summary output; local sync smoke confirmed dashboard and SBOM artifacts include the block.

### Scanner-off SBOM state could look safer than intended

- Issue: AI agents could read `aiDependencyReview.status: ready` while the security scanner was off, making the state look more verified than it was.
- Fix: `aiDependencyReview` now includes `statusReason` and `securityConfidence`, and generation reuses the computed risk summary instead of recalculating a weaker review signal.
- Verification: regression tests cover scanner-off confidence, dashboard/summary rendering, schema metadata, and standalone SBOM fallback behavior; local sync smoke confirmed `scanner-off` appears in generated artifacts.

### Strict mode guidance required too much inference

- Issue: AI and CI consumers could see scoped strict results, but still had to infer which `doctor --strict` command should be used without disrupting local operation.
- Fix: `strictPlan` now provides local advisory command, recommended strict scope, CI command, all-scope command, scope statuses, and the strict-use rule.
- Verification: regression tests cover enforcement advice, doctor JSON, status/context, summary, dashboard, and schema outputs; local sync smoke confirmed summary emits the CI strict command.

## Template

### Title

- Issue:
- Fix:
- Verification:
- Follow-up:
