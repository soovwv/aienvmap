---
name: Portable environment case
about: Submit reviewed, redacted evidence from a real mixed-runtime or multi-AI environment
title: "[environment case] "
labels: evidence, environment-case
assignees: ""
---

<!-- Public issue. Do not paste raw reconcile output, paths, usernames, hostnames, project/package names, secrets, tokens, or proprietary details. -->

## Problem observed before aienvmap

Describe the real runtime/version/AI-coordination problem and its user-visible impact.

## AI consumer and judgment

- AI host or agent:
- aienvmap command used:
- What the AI concluded from the portable evidence:
- What action it proposed, if any:

## Portable evidence

Paste only reviewed output from one of these commands:

```bash
aienvmap reconcile --portable --json
aienvmap reconcile --portable-from .aienvmap/reconcile.json --json
```

```json
{}
```

## Before/after comparison (optional)

Paste the reviewed result of `aienvmap reconcile --portable-compare before.json --against after.json --json`, or explain why no environment change was made.

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
