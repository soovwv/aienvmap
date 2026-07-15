# External environment case review

This checklist keeps public tester reports separate from verified market evidence. A label records evidence maturity, not product quality or author credibility.

A completed local technical trial needs no user opinion and is useful for product debugging. Apply evidence labels only when the tester voluntarily chooses the public-case path; never turn routine testing into a review request.

## Intake

New environment-case issues opened through the repository template receive `evidence`, `environment-case`, and `submitted` automatically. A tester or their AI must not be asked to select, create, or pass labels. If an API or alternate client omits template labels, accept the issue and let a maintainer apply them; label handling must never block evidence submission. Before investigating:

1. Confirm the author used a real environment rather than a repository fixture or copied demo.
2. Confirm the public body contains the allowlisted case summary, not raw `portable.json` or reconciliation output.
3. Remove or ask the author to remove paths, usernames, hostnames, secrets, tokens, private project/package names, and proprietary details.
4. Confirm the human completed every verification field and explicitly authorized citation.
5. Treat unverifiable independence, identity, and ownership as limitations; do not infer them from the evidence fingerprint.

Keep `evidence` and `environment-case` throughout review. Keep exactly one evidence-maturity label: `submitted`, `reproducible`, `outcome-verified`, or `longitudinal`. Begin with `submitted`; when a case advances, replace the prior maturity label rather than stacking labels.

## Reproducible

Replace `submitted` with `reproducible` only when a maintainer can reproduce the reported behavior or evidence shape with a sanitized fixture or equivalent host state. Record:

- a minimal reproduction that contains no submitter data;
- the tested aienvmap version and platform category;
- whether the result matches, partly matches, or contradicts the report;
- any confirmed false positive, false negative, or unclear judgment.

Reproduction does not prove the submitter's identity, machine ownership, or real-world outcome.

## Outcome verified

Replace the current maturity label with `outcome-verified` only when all of these are present:

- the independent tester confirms whether the detected problem was real;
- the tester records the AI's judgment and whether it was useful;
- the chosen outcome is stated, including a valid no-change decision;
- any environment change was approved outside aienvmap and verified after the change;
- false positives, false negatives, and missing context are disclosed;
- privacy and citation consent remain checked.

Do not add this label for downloads, stars, repository fixtures, maintainer-only tests, copied reports, generated drafts, or positive comments without a verified outcome.

## Longitudinal

Replace the current maturity label with `longitudinal` only after a later reviewed report shows whether the environment remained intentional, drifted again, or benefited from the recorded decision. Link the follow-up without publishing a raw fingerprint or using it as an identity.

## Counting rule

Count one external environment once at its highest verified maturity. Never count submitted, reproducible, outcome-verified, and longitudinal labels as separate users or separate cases. A maintainer should update `MARKET.md` and the scorecard only from linkable public issues that satisfy this checklist.

## Response priorities

1. Privacy or secret exposure
2. Destructive or overconfident AI advice
3. Missed or incorrectly routed installations
4. False positives and unclear questions
5. Performance and onboarding friction

Thank the tester for accurate evidence, including negative results. Never request a positive review or pressure an author to keep a public issue open.
