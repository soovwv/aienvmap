# aienvmap market snapshot

Observed 2026-08-15 from public GitHub repository metadata, the npm registry, the npm downloads API, and official product documentation. The timestamped API values and source URLs are preserved in `evidence/market-snapshot-2026-08-15.json`. Counts may change after collection; this is not live telemetry or proof of unique users.

## Current traction

As of 2026-08-15, two public submissions remain in review (`#95` and `#96`); neither is outcome-verified. No new public case, star, fork, or longitudinal-use evidence has appeared since the previous snapshot. Individual submissions remain excluded from promotional material before the five-public-submission threshold.

| Signal | Observed | Interpretation |
| --- | ---: | --- |
| GitHub stars | 0 | no public repository endorsement yet |
| GitHub forks | 0 | no visible downstream development yet |
| Public environment submissions | 2 | awaiting evidence-maturity review; neither is outcome-verified and individual cases are not promoted until at least 5 have been collected |
| npm downloads, 2026-07-11 through 2026-08-09 | 586 | requests, not unique people; may include bots, CI, maintainer use, and reinstalls |
| Published npm versions | 5 | latest is 0.2.2; version count is release history, not adoption evidence |

Do not convert downloads into users, retention, successful setups, or recommendation evidence. Market readiness is 73/100, while independent market validation remains 2/100.

## Market map

| Product | Public GitHub signal at observation | Primary job | Relationship to aienvmap |
| --- | ---: | --- | --- |
| [mise](https://github.com/jdx/mise) | 32,422 stars; latest v2026.8.6 | manage dev tools, environment variables, tasks, and config trust; its MCP server exposes tools, tasks, environment variables, and config to AI assistants | direct AI-workspace adjacency, but aienvmap observes mixed active routing and coordinates changes rather than trusting config, installing, or switching tools |
| [Microsoft APM](https://github.com/microsoft/apm) | 3,540 stars; latest v0.28.0 | declare, lock, audit, govern, and reproduce agent context; export agent-package SBOMs | distribution channel for aienvmap's bounded skill; aienvmap remains the observed host-runtime evidence and review-first coordination layer |
| [Devbox](https://github.com/jetify-com/devbox) | 12,272 stars; latest 0.17.5 | create isolated, reproducible development environments | adjacent declarative environment; aienvmap focuses on existing non-clean machines without replacing the shell |
| [Flox](https://github.com/flox/flox) | 4,090 stars; latest v1.14.1 | define and activate reusable environments and deterministic AI toolchains | closer AI/environment adjacency, but declarative activation differs from aienvmap's read-only host evidence and change coordination |
| [envinfo](https://github.com/tabrindle/envinfo) | 793 stars; latest v7.22.0 | report common active development binaries and system information | closest lightweight inventory substitute; aienvmap adds multi-path evidence, AI decisions, and change handoff |
| [asdf](https://github.com/asdf-vm/asdf) | 25,524 stars; latest v0.20.0 | extensible multi-runtime version management | adjacent runtime manager with a mature plugin ecosystem |
| [Renovate](https://github.com/renovatebot/renovate) | 22,265 stars; latest 44.30.2 | automate dependency updates | complementary automation; aienvmap records AI intent, evidence, approval, and handoff |
| [Syft](https://github.com/anchore/syft) | 9,400 stars; latest v1.51.0 | generate full SBOMs from images and filesystems | complementary evidence generator imported by aienvmap |
| [Trivy](https://github.com/aquasecurity/trivy) | 37,405 stars; latest v0.74.0 | scan vulnerabilities, misconfiguration, secrets, and SBOMs | complementary security scanner; intentionally outside the lightweight default |
| [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli) | 532 stars; latest v0.33.1 | analyze, merge, diff, and convert SBOMs | complementary SBOM workflow; aienvmap emits/imports bounded coordination evidence |
| [Dev Containers](https://containers.dev/) | not compared by repository stars | define and run containerized development environments from structured metadata | complementary environment construction; aienvmap observes an existing host and shared change intent without requiring a container |
| [GitHub Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) | not compared by repository stars | give an AI static repository, path, and agent guidance | complementary instruction layer; aienvmap adds generated environment evidence and session-to-session intent rather than coding conventions |

Repository stars are reach signals, not quality scores, and products of different ages and scopes are not directly comparable. These tools have strong ownership of runtime management, dependency automation, or security/SBOM generation; competing head-on would weaken aienvmap's lightweight position.

## Competitive position

The narrow position remains defensible:

> Dependency-free local environment evidence and explicit change handoff across coding agents on existing, non-clean machines.

The strongest differentiation is the combination of:

- AI-readable startup and decision contracts;
- read-only multi-install discovery across Node, npm, Python, pip, Java, and information-only runtimes;
- explicit no-removal and approval boundaries;
- multi-AI intent, checkpoint, timeline, and handoff;
- light SBOM coordination with optional external scanner evidence;
- privacy-reviewed portable cases, fingerprints, and offline diffs.

The practical substitute is often not one product but a manual bundle: `AGENTS.md`, shell scripts, version-manager commands, SBOM tools, and team conventions. aienvmap must prove it reduces repeated AI rediscovery and unsafe environment assumptions enough to justify one more tool.

The product should therefore be evaluated on a workflow boundary, not feature count:

```text
observe existing host -> expose evidence and pending intent -> human/AI review
-> use the appropriate manager or scanner -> checkpoint and hand off
```

It should not compete on package installation, isolated environment construction, vulnerability coverage, license compliance, or static coding instructions. Those categories already have mature owners.

APM plus Flox/Devbox can increasingly cover agent context, AI runtime CLI setup, and reproducible clean environments as a bundle. APM now exports agent-package SBOMs and detects agent-context drift, while mise exposes managed tools and environment data through MCP. aienvmap should use APM for skill distribution and dedicated scanners for full SBOM evidence instead of rebuilding either ecosystem. Its defensible wedge remains manager-agnostic evidence from mixed existing hosts plus review-first multi-AI coordination.

## Strengths

- clear category boundary instead of replacing mature managers and scanners;
- zero runtime dependencies and measured performance budgets;
- useful on machines that are already mixed rather than only clean declarative environments;
- AI-first JSON contracts with human dashboard as a derived view;
- unusually conservative environment-change authority.
- explicit shared-server home evidence that never invokes another user's discovered executables.

## Weaknesses

- zero public stars, forks, and outcome-verified independent cases at observation time;
- four npm versions but no retention or successful-use measurement;
- broad feature surface makes the one-sentence value proposition harder to learn;
- APM, mise, Flox, and Devbox raise the evidence bar by combining mature agent-context, AI worktree/tool setup, or reproducible-environment workflows;
- no verified integration case for each major AI coding host;
- coordination remains convention-based: its value degrades when a participating agent does not consume a pointer, skill, or explicitly pasted fallback prompt;
- the 0.2 contract is technically reviewed but still lacks independent proof that AI hosts and users find the workflow useful.
- cross-user file-presence evidence cannot prove versions or active routing until the owning user supplies a reviewed report.

## Positioning and improvement strategy

1. Do not build an agent package manager, environment activator, runtime installer, or vulnerability database; use APM only to distribute the bounded advisory skill.
2. Collect at least five public external submissions before introducing any individual case; separately classify strict independence and outcome maturity, including one shared-server case pairing administrator file-presence evidence with an owning-user report.
3. Measure whether an AI identifies the real problem, requests missing evidence, avoids destructive advice, and improves after before/after comparison.
4. Publish host-specific proof only after it runs on that host; do not infer compatibility from instruction-file presence.
5. Publish 0.2.0 as a stable contract release after final package and authentication checks; do not present it as market-proven.
6. Publish the immutable APM-compatible v0.2.0 tag with the release, then verify actual host pickup separately from package placement.

## Evidence sources

- GitHub repository API snapshots for [aienvmap](https://github.com/soovwv/aienvmap), [Microsoft APM](https://github.com/microsoft/apm), [Devbox](https://github.com/jetify-com/devbox), [Flox](https://github.com/flox/flox), [mise](https://github.com/jdx/mise), [asdf](https://github.com/asdf-vm/asdf), [Renovate](https://github.com/renovatebot/renovate), [Syft](https://github.com/anchore/syft), [Trivy](https://github.com/aquasecurity/trivy), and [CycloneDX CLI](https://github.com/CycloneDX/cyclonedx-cli).
- [npm package metadata](https://www.npmjs.com/package/aienvmap) and the public npm downloads point API for 2026-06-19 through 2026-07-18.
- [Microsoft APM documentation](https://github.com/microsoft/apm), [mise documentation](https://mise.jdx.dev/), [Devbox documentation](https://www.jetify.com/docs/devbox/), [Dev Containers specification](https://containers.dev/), [Syft documentation](https://oss.anchore.com/docs/guides/sbom/), [Trivy documentation](https://trivy.dev/docs/latest/), and GitHub's official Copilot instruction documentation define the current product boundaries.
- Product scope is taken from each official repository description; category relationships are aienvmap's positioning analysis.

## Capability scoring after the current improvement batch

These implementation scores are repository-evidence assessments, not market validation. The target is directional and does not authorize promotion or a release.

| Capability | Current | Target | Main remaining proof |
| --- | ---: | ---: | --- |
| Existing environment observation | 91 | 94 | independent mixed-manager combinations |
| Multi-AI handoff | 90 | 95 | external concurrent and multi-user operation |
| Usability | 82 | 92 | unfamiliar-user first-run completion evidence |
| Interoperability | 81 | 90 | real mise/asdf/Devbox/Dev Container and scanner combinations |
| Distribution and adoption | 74 | 88 | verified host pickup, trial completion, and retention |
| Imitation resistance | 60 | 78 | larger fixture corpus, stable integrations, and independent outcome data |
| Lightweight operation | 96 | 96 | preserve current dependency and performance budgets |
| Security/SBOM depth | 43 | 55 | richer provenance adapters, not a competing vulnerability database |

Market validation remains separate and low. Repository features, tests, and this table do not convert public submissions into independent outcomes.

## Improvement plan

### P0 - clarify and harden the wedge

- Keep `start` as the default first-run path and keep advanced evidence out of the human overview.
- Label every important result as observed, declared, inferred, or human-verified.
- Preserve independent dashboard error boundaries so one malformed section cannot blank the page.
- Normalize aliases and shims before reporting duplicate runtimes or package managers.
- Describe the built-in SBOM as light coordination context everywhere it appears.

### P1 - interoperate instead of replacing

- Compare declared expectations from `.tool-versions`, `mise.toml`, `devbox.json`, and `devcontainer.json` with observed active routes.
- Preserve every declaration source, flag incompatible declared intent, and summarize environment definitions without claiming they are active.
- Keep external Syft, Trivy, CycloneDX, and SPDX results provenance-labelled and linked to their original evidence.
- Provide concise CI and AI summaries while preserving the stable detailed JSON contracts for automation.

### P2 - prove adoption

- Reach five public submissions before case promotion and keep strict independent validation separate from submission count.
- Cover Windows, Linux, and macOS, including negative or no-problem results.
- Measure successful first run, result comprehension, avoided unsafe advice, and later reuse; do not infer these from npm requests or stars.
- Consider standalone Windows distribution only after the npm/npx workflow is measured as a repeated adoption barrier.
