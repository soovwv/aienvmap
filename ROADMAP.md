# Roadmap

`aienvmap` focuses on AI coding workspace operations: helping multiple AI agents avoid runtime/version drift while keeping humans in control.

Primary positioning: AI workspace coordination first, lightweight SBOM context second. Full SBOM generators and vulnerability scanners remain complementary optional inputs.

## Competitive Boundary

- mise, Flox, and Devbox declare, install, lock, or reproduce environments; aienvmap observes the runtime state that already exists on a host and gives AI agents review-first coordination evidence.
- Microsoft APM packages and reproduces agent instructions, prompts, skills, plugins, and MCP declarations; aienvmap supplies runtime/package-manager truth that those agents can read before acting.
- Syft, Trivy, Grype, and Dependency-Track generate or analyze full security evidence; aienvmap imports only bounded CycloneDX/SPDX references with digest freshness and points AI back to originals instead of duplicating their databases.
- `reconcile --check` detects drift from a reviewed host snapshot. It does not replace runtime lockfiles, create an isolated shell, or repair the machine.

## Reconciliation Track

The default remains advisory and lightweight: observe existing state, explain conflicts, and write only aienvmap artifacts unless a human explicitly approves a targeted change.

- Current evidence: `reconcile` discovers visible Node/npm executables from PATH and known nvm/Volta/mise locations, compares versions, prefixes, global roots/packages, project expectations, and lockfiles; full scans add bounded Volta plain and mise installed JSON inventory with exact reported-path ownership evidence.
- Instruction safety: preview pointer changes with `onboard --dry-run`, keep content inside marker blocks, remove only those blocks with `onboard --uninstall`, and reject paths outside the workspace.
- Current Python coverage: discover PATH, project `.venv`/`venv`, python.org, pyenv, mise, uv, Homebrew, common Unix, and macOS Framework locations; record interpreter, prefix/base prefix, venv state, visible package locations, count/digest/sample, and optional full package evidence.
- Current runtime-link evidence: connect npm to Node and pip to Python using executable co-location, Python package locations, unique version matching, or explicit PATH inference; every link states that installation ownership is not proven.
- Current Python installer evidence: `--full-packages` summarizes pip's stable inspect report, including installer/requested/editable metadata and redacted locations, while default and quick scans remain unchanged.
- Current Python manager proof: `--full-packages` uses uv's offline JSON, bounded pyenv root/version inventory, and mise installed JSON to prove exact interpreter/prefix/install-path matches while keeping removal authorization false; defaults remain inference-only.
- Next package-manager coverage: add pnpm, Yarn/Corepack, standalone pip/uv/pipx entry-point conflicts, and Conda without adding runtime dependencies.
- Information-only runtime coverage stays lightweight: Java includes `java`/`javac`/`JAVA_HOME` plus standard JDK roots, .NET includes SDK/runtime lists, Rust includes rustup toolchains, Go includes core env paths, and Ruby includes gem home; package enumeration remains out of scope for these runtimes.
- Current Java native discovery: add read-only Windows Registry, macOS `java_home`, and Linux alternatives candidates with bounded command timeouts and explicit provenance; inaccessible sources fall back to PATH and known roots.
- Current Java identity: use selected standard Java system properties plus sibling `javac` evidence to report vendor, architecture, VM/runtime names, reported home, and conservative `jdk` versus `jre-or-runtime-image` classification.
- Current Java build-tool routing: prefer project Maven/Gradle wrappers, retain only bounded version/JVM identity evidence, distinguish Gradle Launcher and Daemon JVMs, link exact homes strongly or Maven's unique major version conservatively, and flag ambiguous or active-Java divergence for AI review.
- Current Java manager evidence: inspect default and configured SDKMAN, mise, and jenv roots; prove SDKMAN/mise install control only for canonical homes inside their install roots; keep external links and every jenv registration routing-only with removal authorization false.
- Current shared-server safety: distinguish project, current-user, and visible-host facts, redact user paths by default, atomically replace generated artifacts, serialize concurrent JSONL writes with stale-lock recovery, and optionally reject stale intent/resolution writes with `coordinationRevision` plus `--if-revision`.
- Next shared-server safety: add explicit actor/session ownership and lease expiry before claiming complete concurrent multi-user coordination.
- Current lifecycle integration: startup/status surface a compact reconciliation decision, and `reconcile --check` provides an opt-in exit-code drift gate for stable or self-hosted PR environments; no cleanup or installation runs automatically.
- SBOM boundary: keep manifest-derived light SBOM as coordination context; explicitly import workspace-local CycloneDX/SPDX JSON as digest-verified summaries, never auto-run generators, and never build a competing vulnerability database.

Acceptance gates: cross-platform fixtures for every manager, no writes in default reconciliation, explicit evidence and limitations in JSON, bounded scan time, no version bump as part of feature development, and full test/smoke/pack verification before release review.

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
  - expand Node ownership evidence from Volta/mise to safe nvm and fnm inventories
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

- Richer CycloneDX/SPDX relationship comparison without copying full external evidence
- Optional signed/attested evidence verification
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
