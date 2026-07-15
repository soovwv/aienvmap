# Portable environment case guide

This guide turns a real environment problem into privacy-reviewed evidence that humans and AI agents can evaluate. It is not telemetry: aienvmap does not upload reports, and submission is always manual.

## 1. Capture redacted evidence

For a quick case:

```bash
npx aienvmap reconcile --portable --json
```

For manager-native ownership evidence, first save and review a full report locally, then redact it offline:

```bash
npx aienvmap reconcile --full-packages --write
npx aienvmap reconcile --portable-from .aienvmap/reconcile.json --json
```

Never submit the raw `.aienvmap/reconcile.json`. Review portable output because versions, platform, architecture, source categories, finding codes, and a linkable pseudonymous fingerprint remain visible.

## 2. Ask an AI to judge the case

Give the AI only the reviewed portable report and ask it to state:

- the detected environment problem;
- evidence supporting and contradicting its conclusion;
- missing evidence and the next safe read-only command;
- whether it recommends no change, further review, or an approval-gated proposal;
- why removal, PATH edits, runtime switching, and global package migration remain unauthorized.

Record false positives, false negatives, and missing context rather than editing them out.

## 3. Verify the outcome

If an approved environment change occurs, capture a second portable report and compare it offline:

```bash
npx aienvmap reconcile --portable-compare before.json --against after.json --json
```

Do not make a change merely to produce a case. A verified "no change was safest" outcome is valid evidence.

## 4. Create a minimal public draft

After reviewing the portable report locally, create a smaller submission draft that excludes versions and the linkable evidence fingerprint:

```bash
npx aienvmap reconcile --case-summary portable.json --comparison comparison.json --json
```

`--comparison` is optional. Routine technical testing needs no human opinion. For an optional public case, the AI fills factual fields, asks once for the compact human confirmation documented in `AI_TESTING.md`, shows the complete draft, and obtains separate submission consent. The generated draft is never market evidence by itself.

For a copyable GitHub issue draft generated only from the allowlisted summary, use:

```bash
npx aienvmap reconcile --case-summary portable.json --comparison comparison.json --markdown
```

The command prints Markdown to standard output. It does not create an issue, upload evidence, write a file, or complete the required human verification.

## Evidence levels

| Level | Required proof | Market-score use |
| --- | --- | --- |
| submitted | reviewed portable report and problem description | no |
| reproducible | independent environment plus repeatable commands and AI judgment | no |
| outcome-verified | human confirms detection/judgment and actual outcome | eligible |
| longitudinal | verified before/after evidence or repeated sessions over time | strongest |

Repository fixtures, maintainer-only examples, copied reports, unreviewed JSON, and feature count are not independent market evidence. Each case keeps exactly one maturity label; maintainers replace it as evidence advances. Maintain separate counts for submitted, reproducible, outcome-verified, and longitudinal cases, and never count one case twice because it has multiple reports.

## Submission

Open a GitHub issue using the **Portable environment case** template. Do not choose or pass labels; the template and maintainers manage them. If a client reports a label error, retry the approved issue body without label arguments. Public issues must not contain raw paths, usernames, hostnames, project/package names, secrets, tokens, or proprietary details. Do not infer missing sensitive details from a fingerprint or combine it with external tracking data.
