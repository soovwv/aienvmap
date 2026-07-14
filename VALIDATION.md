# Cross-platform validation

Observed 2026-07-12. This record contains redacted maintainer-run compatibility evidence. It is not independent adoption, a user count, or an outcome-verified market case.

| Environment | Runtime | Checks | Result |
| --- | --- | --- | --- |
| Windows 11 x64 workstation | Node 24.14.1, npm 11.11.0 | full `npm run release:check`; real-host quick reconciliation | pass |
| Ephemeral Alpine Linux x64 container | official `node:20-alpine`, Node 20.20.2 | English text policy, 314 tests, version/help smoke, quick reconciliation | pass; 5 platform-specific skips |
| Intel macOS 26.2 host | official Node 20.20.2 Darwin x64 archive in a temporary directory | published SHA-256 verification, English text policy, 314 tests, version/help smoke, quick reconciliation | pass; 5 platform-specific skips |

## Redacted reconciliation observations

| Environment | Node | npm | Python | Java | Decision | Findings | Removal authorized |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Windows | 1 | 1 | 2 | 0 | review | 2 | false |
| Alpine Linux | 1 | 1 | 0 | 0 | clear | 0 | false |
| macOS | 1 | 1 | 1 | 0 | clear | 0 | false |

Counts are visible-command evidence from quick read-only scans, not proof of complete machine inventory or installation ownership.

## APM consumer integration

Observed 2026-07-14 with pinned APM CLI 0.25.0. A clean temporary consumer project installed the local skill subpath for `agent-skills,claude`, producing the shared and Claude-native skill roots. `discover` reported all five supported AI tools as skill-covered, while `onboard --no-sync` preserved the skills and created no `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`. No hook, MCP, executable, or Claude plugin configuration was produced.

The dependency-free `scripts/apm-consumer-check.mjs` reproduces this check in CI and always reports `hostAutomaticPickupVerified: false`. It proves package placement and aienvmap coexistence, not automatic loading by an AI host or independent adoption.

## Maintainer scenario validation

The dependency-free `scripts/scenario-check.mjs` runner was executed on the Windows host, Ubuntu WSL2 with a checksum-verified temporary official Node 20.20.2 archive, and the guarded macOS host with the same verified temporary runtime approach. It creates an isolated workspace, runs first-start artifact generation, portable reconciliation, light SBOM generation, CycloneDX preview import, privacy-safe case-draft rendering, and then deletes the workspace.

| Scenario | Windows | Linux | macOS | Expected safety result |
| --- | --- | --- | --- | --- |
| First start | pass | pass | pass | ten workspace artifacts; missing pointers remain `fallback-required` |
| Real-host portable reconciliation | pass; mixed Python produced `review` | pass; `clear` | pass; `clear` | `consolidation.removalAuthorized` is false |
| Light SBOM fixture | pass | pass | pass | one manifest dependency; no scanner is installed or run |
| CycloneDX preview bridge | pass | pass | pass | `read-original-before-claims`; format `cyclonedx-json` |
| Public case draft | pass | pass | pass | no workspace path in Markdown |
| Intentional complexity policy | pass | pass | pass | ask before consolidation; choices are keep, review, or gather evidence; removal remains unauthorized |
| Persisted intentional versions | pass | pass | pass | exact reviewed Node/Python/Java version sets suppress repeat questions; an unexpected version restores review; Java remains outside consolidation candidates |

This scenario matrix is maintainer validation, not three independent users or three market cases. The intentional-complexity row is a deterministic policy fixture executed on each platform; independent user confirmation is still required to prove that the question and choices are useful in real workflows.

An attempted rerun in an ephemeral Docker Desktop Alpine container was inconclusive because the local Docker backend stopped responding and exceeded the harness timeout. The container/repository setup was read-only and was terminated; the successful earlier Alpine compatibility run remains recorded above. This infrastructure failure is not reported as a product pass or failure.

## Safety and cleanup

- The Linux container used a read-only repository mount and was removed automatically.
- The macOS run did not install Node system-wide. It used the official archive in a guarded `/tmp` directory after SHA-256 verification.
- Temporary macOS repository, runtime, and log paths were deleted and cleanup was verified.
- Host addresses, account names, home paths, credentials, and raw reconciliation artifacts are intentionally excluded.
- No test authorized package installation, runtime switching, PATH edits, or software removal.
- The scenario runner contains no telemetry or external submission and emits only a redacted summary; raw temporary artifacts are deleted.
