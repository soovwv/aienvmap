# aienvmap scorecard

This scorecard deliberately separates product engineering from market proof. Run `aienvmap scorecard --json` for the bounded AI-readable evidence and methodology.

Maintainer-run Windows, Alpine Linux, and macOS compatibility evidence is recorded in [VALIDATION.md](VALIDATION.md). It improves confidence in portability but does not count as independent market adoption.

The dated public traction and adjacent-tool comparison live in [MARKET.md](MARKET.md); download requests are not counted as verified users.

| Category | Score | Interpretation |
| --- | ---: | --- |
| Technical readiness | 92/100 | Released 0.2.0: dependency-free, cross-platform tested, AI-readable, safety-bounded, performance-budgeted, APM consumer-install checked, SBOM-interoperable, and guarded by a fail-closed 0.2 root-field contract. Independent probe-boundary validation remains limited. |
| Market readiness | 73/100 | Positioning, distribution, one-command onboarding, release gates, privacy-reviewed external proof flows, and npm trusted publishing are present; real AI-host pickup still needs external verification. |
| Market validation | 2/100 | Public package requests exist, but there are no independent outcome-verified cases, retention signals, or external contributions. |
| Weighted release readiness | 86/100 | 70% technical readiness and 30% market readiness. Independent market validation is deliberately excluded and shown separately. |

## 0.2.0 qualification axes

| Axis | Score | Required | Result |
| --- | ---: | ---: | --- |
| Core feature completeness | 92 | 90 | pass |
| Stability and testing | 94 | 90 | pass |
| Lightweight operation | 93 | 90 | pass |
| AI usability | 92 | 90 | pass |
| Differentiation | 91 | 90 | pass |
| Market readiness | 73 | 70 | pass |

All release engineering gates passed for v0.2.0. The package was published from the CI-verified tag through npm Trusted Publishing with provenance. This confirms release integrity, not product-market fit or independent adoption. Future npm releases remain batched and must pass the same release controls.

AI usability is supported by a compact decision envelope that states the next safe action, evidence references, whether a user question is required, a reason-derived question, and explicit non-authority boundaries. Differentiation is supported by the machine-readable `aiAdoptionDecision.uniqueJob`, `chooseInstead`, and composition order so an AI can combine aienvmap with environment managers and scanners without misrepresenting its role. These are technical readiness scores, not independent adoption evidence.

## Position

aienvmap is an AI workspace coordination and environment-evidence layer. It observes existing runtime installations, gives multiple AI agents a shared map and change protocol, and provides a light SBOM bridge. It does not replace a runtime manager, dependency update bot, vulnerability scanner, or full SBOM generator.

Adjacent tools establish the boundaries: [Microsoft APM](https://github.com/microsoft/apm) packages agent context, [Devbox](https://github.com/jetify-com/devbox), [Flox](https://github.com/flox/flox), and [mise](https://mise.jdx.dev/) create or manage environments, [Renovate](https://docs.renovatebot.com/) automates dependency updates, and [Syft](https://github.com/anchore/syft) generates full inventories. aienvmap remains the observed mixed-host evidence and coordination layer.

The APM skill-subpath install and native-pointer coexistence now have a clean consumer regression gate. This is technical distribution evidence only; it does not prove that Codex, Claude, Gemini, Cursor, or Copilot automatically loaded the skill in a real session.

The APM gate is pinned to the observed v0.25.0 release. A future pin update requires the same clean consumer-install regression check; ecosystem release velocity does not increase aienvmap's market score.

## Evidence policy

- Repository features and CI count toward technical readiness.
- Repository-owned demos do not count as independent adoption.
- Unknown or uncited evidence receives no credit.
- Readiness scores increase only when cited product or release proof changes. Market-validation scores increase only from independent evidence.
- External cases progress through submitted, reproducible, outcome-verified, and longitudinal levels; market credit starts only at independent outcome-verified evidence.
- The [portable environment case guide](examples/portable-environment-case-guide.md) defines manual submission, privacy review, AI judgment assessment, and no-double-counting rules.

## Improvement order

1. Document at least three reproducible external runtime-drift environments with before/after evidence, including one shared-server case verified by the owning user.
2. Verify integration examples on major coding-agent hosts.
3. Preserve reproducible release evidence and keep npm trusted publishing as the only supported release path; do not introduce long-lived publish credentials.
