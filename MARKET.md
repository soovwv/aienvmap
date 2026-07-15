# aienvmap market snapshot

Observed 2026-07-15 from public GitHub repository metadata, the npm registry, the npm downloads API, and official product documentation. The timestamped API values and source URLs are preserved in `evidence/market-snapshot-2026-07-15.json`. Counts may change after collection; this is not live telemetry or proof of unique users.

## Current traction

| Signal | Observed | Interpretation |
| --- | ---: | --- |
| GitHub stars | 0 | no public repository endorsement yet |
| GitHub forks | 0 | no visible downstream development yet |
| Open external environment cases | 0 | no independent outcome-verified evidence yet |
| npm downloads, 2026-06-14 through 2026-07-13 | 268 | requests, not unique people; may include bots, CI, maintainer use, and reinstalls |
| Published npm versions | 2 | release noise remains low; latest is the signed-provenance 0.1.1 tester release |

Do not convert downloads into users, retention, successful setups, or recommendation evidence. Market readiness is 73/100, while independent market validation remains 2/100.

## Market map

| Product | Public GitHub signal at observation | Primary job | Relationship to aienvmap |
| --- | ---: | --- | --- |
| [mise](https://github.com/jdx/mise) | 30,763 stars; latest v2026.7.6 | manage dev tools, environment variables, tasks, and config trust; its MCP server exposes tools, tasks, environment variables, and config to AI assistants | direct AI-workspace adjacency, but aienvmap observes mixed active routing and coordinates changes rather than trusting config, installing, or switching tools |
| [Microsoft APM](https://github.com/microsoft/apm) | 3,235 stars; latest v0.25.0 | declare, lock, audit, govern, and reproduce agent context; export agent-package SBOMs | distribution channel for aienvmap's bounded skill; aienvmap remains the observed host-runtime evidence and review-first coordination layer |
| [Devbox](https://github.com/jetify-com/devbox) | 12,172 stars; latest 0.17.5 | create isolated, reproducible development environments | adjacent declarative environment; aienvmap focuses on existing non-clean machines without replacing the shell |
| [Flox](https://github.com/flox/flox) | 4,049 stars; latest v1.13.2 | define and activate reusable environments and deterministic AI toolchains | closer AI/environment adjacency, but declarative activation differs from aienvmap's read-only host evidence and change coordination |
| [envinfo](https://github.com/tabrindle/envinfo) | 793 stars; latest v7.22.0 | report common active development binaries and system information | closest lightweight inventory substitute; aienvmap adds multi-path evidence, AI decisions, and change handoff |
| [asdf](https://github.com/asdf-vm/asdf) | 25,459 stars; latest v0.20.0 | extensible multi-runtime version management | adjacent runtime manager with a mature plugin ecosystem |
| [Renovate](https://github.com/renovatebot/renovate) | 22,000 stars; latest 43.263.5 | automate dependency updates | complementary automation; aienvmap records AI intent, evidence, approval, and handoff |
| [Syft](https://github.com/anchore/syft) | 9,235 stars; latest v1.46.0 | generate full SBOMs from images and filesystems | complementary evidence generator imported by aienvmap |
| [Trivy](https://github.com/aquasecurity/trivy) | 36,921 stars; latest v0.72.0 | scan vulnerabilities, misconfiguration, secrets, and SBOMs | complementary security scanner; intentionally outside the lightweight default |
| [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli) | 519 stars; latest v0.32.0 | analyze, merge, diff, and convert SBOMs | complementary SBOM workflow; aienvmap emits/imports bounded coordination evidence |

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

APM plus Flox/Devbox can increasingly cover agent context, AI runtime CLI setup, and reproducible clean environments as a bundle. APM now exports agent-package SBOMs and detects agent-context drift, while mise exposes managed tools and environment data through MCP. aienvmap should use APM for skill distribution and dedicated scanners for full SBOM evidence instead of rebuilding either ecosystem. Its defensible wedge remains manager-agnostic evidence from mixed existing hosts plus review-first multi-AI coordination.

## Strengths

- clear category boundary instead of replacing mature managers and scanners;
- zero runtime dependencies and measured performance budgets;
- useful on machines that are already mixed rather than only clean declarative environments;
- AI-first JSON contracts with human dashboard as a derived view;
- unusually conservative environment-change authority.
- explicit shared-server home evidence that never invokes another user's discovered executables.

## Weaknesses

- zero public stars, forks, and independent verified cases at observation time;
- one very recent npm version with no retention or successful-use measurement;
- broad feature surface makes the one-sentence value proposition harder to learn;
- APM, mise, Flox, and Devbox raise the evidence bar by combining mature agent-context, AI worktree/tool setup, or reproducible-environment workflows;
- no verified integration case for each major AI coding host;
- coordination remains convention-based: its value degrades when a participating agent does not consume a pointer, skill, or explicitly pasted fallback prompt;
- the 0.2 contract is technically reviewed but still lacks independent proof that AI hosts and users find the workflow useful.
- cross-user file-presence evidence cannot prove versions or active routing until the owning user supplies a reviewed report.

## Positioning and improvement strategy

1. Do not build an agent package manager, environment activator, runtime installer, or vulnerability database; use APM only to distribute the bounded advisory skill.
2. Collect three independent outcome-verified mixed-runtime cases using the portable case template; include one shared-server case pairing administrator file-presence evidence with an owning-user report.
3. Measure whether an AI identifies the real problem, requests missing evidence, avoids destructive advice, and improves after before/after comparison.
4. Publish host-specific proof only after it runs on that host; do not infer compatibility from instruction-file presence.
5. Publish 0.2.0 as a stable contract release after final package and authentication checks; do not present it as market-proven.
6. Publish the immutable APM-compatible v0.2.0 tag with the release, then verify actual host pickup separately from package placement.

## Evidence sources

- GitHub repository API snapshots for [aienvmap](https://github.com/soovwv/aienvmap), [Microsoft APM](https://github.com/microsoft/apm), [Devbox](https://github.com/jetify-com/devbox), [Flox](https://github.com/flox/flox), [mise](https://github.com/jdx/mise), [asdf](https://github.com/asdf-vm/asdf), [Renovate](https://github.com/renovatebot/renovate), [Syft](https://github.com/anchore/syft), [Trivy](https://github.com/aquasecurity/trivy), and [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli).
- [npm package metadata](https://www.npmjs.com/package/aienvmap) and the public npm downloads point API for 2026-06-14 through 2026-07-13.
- [Microsoft APM documentation](https://github.com/microsoft/apm), [Microsoft APM v0.25.0 release](https://github.com/microsoft/apm/releases/tag/v0.25.0), [mise documentation](https://mise.jdx.dev/), [mise MCP documentation](https://mise.jdx.dev/cli/mcp.html), [Flox environment documentation](https://flox.dev/docs/concepts/environments), and each official repository description define the current product boundaries.
- Product scope is taken from each official repository description; category relationships are aienvmap's positioning analysis.
