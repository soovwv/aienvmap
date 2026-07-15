# aienvmap 0.2.0

## Stable AI environment evidence contract

This release establishes the `0.2` additive JSON contract for a dependency-free environment map and coordination layer used primarily by AI coding agents.

```bash
npx aienvmap@0.2.0 trial
```

Run the trial in a disposable directory or disposable project copy. It writes only under `.aienvmap/trial/`, skips project Maven/Gradle wrappers, requests no installation, removal, consolidation, or PATH change, and uploads nothing automatically. It invokes discovered runtime executables with bounded version arguments; arbitrary third-party executable side effects cannot be guaranteed absent.

## Highlights

- Observed multi-install and routing evidence for Node, Python, Java, and common package/version managers.
- Conservative AI decisions that preserve intentional multiple versions and require owner approval before environment changes.
- Evidence-derived `userQuestion`, explicit `observed-not-approved` authority, and never-do boundaries so an AI asks instead of guessing intent.
- Machine-readable `uniqueJob`, `chooseInstead`, and composition order for correct use with APM, runtime managers, and full scanners.
- Windows PowerShell guidance uses the existing `.cmd` launchers when `.ps1` shims are policy-blocked and explicitly forbids execution-policy weakening.
- Test and demo temporary workspaces are tracked and removed after use, with regression coverage for cleanup-helper adoption.
- Multi-agent intent, checkpoint, handoff, and compare-and-swap coordination for shared workspaces and hosts, verified with competing independent Node processes and stale-lock recovery.
- Light SBOM summaries with CycloneDX/SPDX import and optional full-scanner handoff.
- Bounded APM skill distribution without hooks, MCP configuration, executable deployment, or automatic tool installation.
- Privacy-reviewed trial artifacts and optional public-case drafting without telemetry or automatic submission.
- A one-command `start` path that creates an automatic environment observation without silently accepting it as a CI drift baseline.
- Explicit artifact-sharing guidance that treats raw manifests, reconciliation, SBOM, dashboards, and portable trial evidence as local-only by default.
- Separate market-readiness and independent market-validation scores, backed by a timestamped official-API snapshot.

## Compatibility and verification

- Documented JSON root fields are additive from contract version `0.2`; breaking changes require a contract-version bump and migration note.
- Zero runtime dependencies and Node.js 18 or newer.
- CI covers Windows, Ubuntu, and macOS across the supported Node.js matrix.
- The release gate packs the exact npm artifact, installs it in a clean consumer, and runs its installed CLI and isolated trial.
- GitHub Actions used by CI and release are pinned to reviewed commit SHAs.
- npm releases require a matching version tag, explicit confirmation, Trusted Publishing, provenance, and post-publish integrity verification. Long-lived publishing credentials are not used.

Independent adoption and AI-host automatic-pickup evidence remain limited. This release should not be presented as proof of market adoption or as a package manager, vulnerability scanner, or full SBOM generator.
