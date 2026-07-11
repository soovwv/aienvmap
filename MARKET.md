# aienvmap market snapshot

Observed 2026-07-12 from public GitHub repository metadata, the npm registry, and the npm downloads API. This is a dated snapshot, not live telemetry or proof of unique users.

## Current traction

| Signal | Observed | Interpretation |
| --- | ---: | --- |
| GitHub stars | 0 | no public repository endorsement yet |
| GitHub forks | 0 | no visible downstream development yet |
| Open external environment cases | 0 | no independent outcome-verified evidence yet |
| npm downloads, 2026-06-11 through 2026-07-10 | 108 | requests, not unique people; may include bots, CI, maintainer use, and reinstalls |
| Published npm versions | 1 | release noise is intentionally low; latest remains 0.1.0 |

Do not convert downloads into users, retention, successful setups, or recommendation evidence. Market validation remains 43/100 until independent outcome-verified cases exist.

## Market map

| Product | Public GitHub signal at observation | Primary job | Relationship to aienvmap |
| --- | ---: | --- | --- |
| [mise](https://github.com/jdx/mise) | 30,646 stars | manage dev tools, environment variables, and tasks | adjacent runtime manager; aienvmap observes and coordinates rather than installs or switches |
| [Microsoft APM](https://github.com/microsoft/apm) | 3,181 stars | declare and reproduce agent instructions, skills, prompts, plugins, and MCP servers | complementary agent-context manager; aienvmap provides observed host runtime/routing evidence rather than agent packages |
| [Devbox](https://github.com/jetify-com/devbox) | 12,162 stars | create isolated, reproducible development environments | adjacent declarative environment; aienvmap focuses on existing non-clean machines without replacing the shell |
| [Flox](https://github.com/flox/flox) | 4,044 stars | define and activate reusable environments across local, CI, and production | closer AI/environment adjacency, but declarative activation differs from aienvmap's read-only host evidence and change coordination |
| [asdf](https://github.com/asdf-vm/asdf) | 25,450 stars | extensible multi-runtime version management | adjacent runtime manager with a mature plugin ecosystem |
| [Renovate](https://github.com/renovatebot/renovate) | 21,983 stars | automate dependency updates | complementary automation; aienvmap records AI intent, evidence, approval, and handoff |
| [Syft](https://github.com/anchore/syft) | 9,220 stars | generate full SBOMs from images and filesystems | complementary evidence generator imported by aienvmap |
| [Trivy](https://github.com/aquasecurity/trivy) | 36,881 stars | scan vulnerabilities, misconfiguration, secrets, and SBOMs | complementary security scanner; intentionally outside the lightweight default |
| [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli) | 518 stars | analyze, merge, diff, and convert SBOMs | complementary SBOM workflow; aienvmap emits/imports bounded coordination evidence |

Repository stars are reach signals, not quality scores, and products of different ages and scopes are not directly comparable. These tools have strong ownership of runtime management, dependency automation, or security/SBOM generation; competing head-on would weaken aienvmap's lightweight position.

## Competitive position

The narrow position remains defensible:

> A dependency-free AI workspace coordination and environment-evidence layer for existing, non-clean machines.

The strongest differentiation is the combination of:

- AI-readable startup and decision contracts;
- read-only multi-install discovery across Node, npm, Python, pip, Java, and information-only runtimes;
- explicit no-removal and approval boundaries;
- multi-AI intent, checkpoint, timeline, and handoff;
- light SBOM coordination with optional external scanner evidence;
- privacy-reviewed portable cases, fingerprints, and offline diffs.

The practical substitute is often not one product but a manual bundle: `AGENTS.md`, shell scripts, version-manager commands, SBOM tools, and team conventions. aienvmap must prove it reduces repeated AI rediscovery and unsafe environment assumptions enough to justify one more tool.

APM plus Flox/Devbox can increasingly cover agent context and reproducible clean environments as a bundle. aienvmap should not follow them into installation, activation, package resolution, or agent-package distribution; its defensible wedge is evidence from mixed existing hosts plus review-first multi-AI coordination.

## Strengths

- clear category boundary instead of replacing mature managers and scanners;
- zero runtime dependencies and measured performance budgets;
- useful on machines that are already mixed rather than only clean declarative environments;
- AI-first JSON contracts with human dashboard as a derived view;
- unusually conservative environment-change authority.

## Weaknesses

- zero public stars, forks, and independent verified cases at observation time;
- one very recent npm version with no retention or successful-use measurement;
- broad feature surface makes the one-sentence value proposition harder to learn;
- APM, Flox, and Devbox raise the evidence bar by combining mature agent-context or reproducible-environment workflows;
- no verified integration case for each major AI coding host;
- pre-0.2.0 contract status and no signed provenance release yet.

## Positioning and improvement strategy

1. Do not add package-manager, environment activation, agent-package distribution, or vulnerability-database behavior.
2. Collect three independent outcome-verified mixed-runtime cases using the portable case template.
3. Measure whether an AI identifies the real problem, requests missing evidence, avoids destructive advice, and improves after before/after comparison.
4. Publish host-specific proof only after it runs on that host; do not infer compatibility from instruction-file presence.
5. Stabilize the additive contract and batch a 0.2.0 release only when external evidence and release provenance are ready.

## Evidence sources

- GitHub repository API snapshots for [aienvmap](https://github.com/soovwv/aienvmap), [Microsoft APM](https://github.com/microsoft/apm), [Devbox](https://github.com/jetify-com/devbox), [Flox](https://github.com/flox/flox), [mise](https://github.com/jdx/mise), [asdf](https://github.com/asdf-vm/asdf), [Renovate](https://github.com/renovatebot/renovate), [Syft](https://github.com/anchore/syft), [Trivy](https://github.com/aquasecurity/trivy), and [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli).
- [npm package metadata](https://www.npmjs.com/package/aienvmap) and the public npm downloads point API for 2026-06-11 through 2026-07-10.
- Product scope is taken from each official repository description; category relationships are aienvmap's positioning analysis.
