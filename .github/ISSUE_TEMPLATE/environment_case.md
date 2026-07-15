---
name: Portable environment case
about: Submit reviewed, redacted evidence from a real mixed-runtime or multi-AI environment
title: "[environment case] "
labels: evidence, environment-case, submitted
assignees: ""
---

<!-- Public issue. Do not paste raw reconcile output, paths, usernames, hostnames, project/package names, secrets, tokens, or proprietary details. -->
<!-- Do not select or pass labels when submitting. This template applies the intake labels; maintainers manage evidence-maturity labels. -->

## Problem observed before aienvmap

Describe the real runtime/version/AI-coordination problem and its user-visible impact.

## AI consumer and judgment

- AI host or agent:
- aienvmap command used:
- What the AI concluded from the portable evidence:
- What action it proposed, if any:

## Minimal evidence summary

Prefer reviewed output from this command; it omits versions and the linkable fingerprint:

```bash
aienvmap reconcile --case-summary portable.json --comparison comparison.json --json
```

```json
{}
```

To generate this entire copyable issue draft from the same allowlisted summary, run:

```bash
aienvmap reconcile --case-summary portable.json --comparison comparison.json --markdown
```

Do not treat the generated draft as evidence until the human verification below is complete. If no comparison exists, omit `--comparison` and explain why no environment change was made.

## Human verification

- Was the detected problem real? yes / partly / no
- Was the AI judgment useful? 1 / 2 / 3 / 4 / 5
- False positive, false negative, or missing context:
- Outcome verified by:
- Did aienvmap itself change or remove software? (expected: no)

## Privacy and evidence checklist

- [ ] This is an independent real environment, not a repository fixture or copied demo.
- [ ] I reviewed the portable JSON and comparison output before posting.
- [ ] I did not paste raw reconcile output or local paths.
- [ ] I removed usernames, hostnames, project/package names, secrets, tokens, and proprietary details from prose.
- [ ] I understand `aerp1` fingerprints are linkable pseudonymous fact-set tokens, not anonymous machine IDs.
- [ ] I authorize maintainers to cite this public issue as product evidence with a link; sensitive details must not be inferred or reconstructed.
