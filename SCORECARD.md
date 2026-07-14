# aienvmap scorecard

This scorecard deliberately separates product engineering from market proof. Run `aienvmap scorecard --json` for the bounded AI-readable evidence and methodology.

Maintainer-run Windows, Alpine Linux, and macOS compatibility evidence is recorded in [VALIDATION.md](VALIDATION.md). It improves confidence in portability but does not count as independent market adoption.

The dated public traction and adjacent-tool comparison live in [MARKET.md](MARKET.md); download requests are not counted as verified users.

| Category | Score | Interpretation |
| --- | ---: | --- |
| Technical readiness | 93/100 | Strong prototype: dependency-free, cross-platform tested, AI-readable, safety-bounded, performance-budgeted, APM consumer-install checked, SBOM-interoperable, signed with npm provenance, and guarded by a fail-closed root-field freeze candidate; the contract is not stable until 0.2.0. |
| Market validation | 43/100 | Differentiated position and usable proof flows exist, but independent users, external cases, and ecosystem verification remain limited. |
| Weighted overall | 78/100 | 70% technical readiness and 30% market validation; never use this number alone as an adoption or release decision. |

## Position

aienvmap is an AI workspace coordination and environment-evidence layer. It observes existing runtime installations, gives multiple AI agents a shared map and change protocol, and provides a light SBOM bridge. It does not replace a runtime manager, dependency update bot, vulnerability scanner, or full SBOM generator.

Adjacent tools establish the boundaries: [Microsoft APM](https://github.com/microsoft/apm) packages agent context, [Devbox](https://github.com/jetify-com/devbox), [Flox](https://github.com/flox/flox), and [mise](https://mise.jdx.dev/) create or manage environments, [Renovate](https://docs.renovatebot.com/) automates dependency updates, and [Syft](https://github.com/anchore/syft) generates full inventories. aienvmap remains the observed mixed-host evidence and coordination layer.

The APM skill-subpath install and native-pointer coexistence now have a clean consumer regression gate. This is technical distribution evidence only; it does not prove that Codex, Claude, Gemini, Cursor, or Copilot automatically loaded the skill in a real session.

## Evidence policy

- Repository features and CI count toward technical readiness.
- Repository-owned demos do not count as independent adoption.
- Unknown or uncited evidence receives no credit.
- Scores increase only when the cited proof changes.
- External cases progress through submitted, reproducible, outcome-verified, and longitudinal levels; market credit starts only at independent outcome-verified evidence.
- The [portable environment case guide](examples/portable-environment-case-guide.md) defines manual submission, privacy review, AI judgment assessment, and no-double-counting rules.

## Improvement order

1. Document at least three reproducible external runtime-drift environments with before/after evidence, including one shared-server case verified by the owning user.
2. Verify integration examples on major coding-agent hosts.
3. Preserve reproducible release evidence and configure npm trusted publishing before the next release; 0.1.1 used the explicit token fallback with signed provenance.
