# Roadmap

`aienvmap` focuses on AI coding workspace operations: helping multiple AI agents avoid runtime/version drift while keeping humans in control.

Primary positioning: AI workspace coordination first, lightweight SBOM context second. Full SBOM generators and vulnerability scanners remain complementary optional inputs.

## Near Term

- Prepare `0.2.0` as one stabilized AI workspace contract release, not a per-commit npm stream
- Freeze and review documented JSON root fields before `0.2.0`
- Use `releaseReadiness.contractReview` as the AI-readable checklist for root-field compatibility review
- Keep `releaseReadiness.nextStabilizationTasks` current so AI agents can choose the next hardening step
- Keep `releaseReadiness.evidenceCommands` current so AI/CI can prove the release gate before npm publish
- Keep README, examples, schema, dashboard, and packaged skill aligned on AI workspace coordination
- Validate start/onboard/discover fallback behavior across Codex, Claude, Gemini, Cursor, and Copilot surfaces
- Keep JSON contracts additive after `0.2.0`; breaking changes require a contract version bump and migration notes
- Deprecate `0.1.x` prototype versions after `0.2.0` is published
- Strengthen trust states: observed, planned, changed, review, verified, stale
- Detect multi-agent environment intent conflicts
- Keep one advisory decision engine with optional strict enforcement
- Keep vulnerability checks opt-in and read-only
- Keep external SBOM/security tools optional; do not require Syft, Trivy, Grype, or similar tools for the default flow
- Stabilize `.aienvmap/manifest.json` and JSON command schemas
- Keep `sync`, `context`, and `handoff` as the simple core flow
- Simplify the dashboard around the essential 10-second review cards: AI Session, Environment Health, Collaboration, Light SBOM, Agent Pointers, Timeline/Intents, and Release/Strict Gate
- Keep runnable case studies that show real AI workspace coordination failures and recovery flows

## Next

- Deeper runtime discovery:
  - nvm, fnm, volta
  - pyenv, uv, conda
  - mise, asdf
- Global tool inventory:
  - richer summaries for `npm -g`, `pipx list`, `uv tool list`, and Homebrew
  - optional `--deep` scanners for more toolchains
- Security summaries:
  - Python vulnerability summary via optional scanner detection
  - OS/container vulnerability summaries through optional external tools
- Conflict detection:
  - package manager policy vs lockfile mismatch
  - monorepo/project boundary aware intent targets
- CI mode:
  - stable exit codes
  - GitHub Action example

## Later

- CycloneDX/SPDX export
- Optional Syft/Trivy integration
- Team dashboard mode
- Signed/attested environment snapshots
- Policy presets for common AI coding workspaces

## Non-goals

- Replacing full SBOM generators
- Replacing vulnerability scanners
- Taking hard locks on shared machines by default
- Installing or modifying runtime versions automatically
- Unpublishing normal prototype history from npm
- Publishing every commit to npm
