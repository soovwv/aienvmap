# Promotion and community guide

This guide is for sharing `aienvmap` without overstating adoption or pressuring people for positive reviews.

Use `https://aienvmap.svwvs.com/` as the primary public introduction URL. Link the GitHub repository only when readers need source code, issues, or technical evidence.

## Goal

The current goal is not maximum impressions. It is ten real trials, three public outcome-verified cases, at least one Linux case, one macOS case, and one later report showing whether the recorded environment decision remained useful.

Count GitHub stars, npm requests, and post views as reach only. Do not describe them as users, successful setups, retention, or product validation.

## One-line description

> A read-only environment preflight for AI coding agents: see runtime drift and pending changes before an agent touches your setup.

Short alternative:

> Know the development environment before an AI changes it.

## The story to show

Lead with one failure mode, one command, and one safety boundary:

```text
Agent A assumes Python A.
Agent B sees Python B and a pending dependency change.
$ npx aienvmap start
The workspace becomes review-first; aienvmap installs or removes nothing.
```

Do not lead with the full JSON contract, SBOM interoperability, manager ownership proof, or every supported runtime. Link those details after a reader understands the problem.

## Proof that can be cited

- 372 automated tests in the repository.
- Maintainer-run Windows, Linux, and macOS compatibility evidence in `VALIDATION.md`.
- npm provenance and release controls described in `SECURITY.md` and `SCORECARD.md`.

Keep submitted cases in the evidence pipeline, but do not introduce, quote, link, or feature an individual public submission in promotional material until at least five public external case submissions have been collected. Reaching five permits evidence-based introduction; it does not by itself prove broad adoption, retention, or product-market fit. Continue to classify every case under `CASE_REVIEW.md`.

## Before posting

1. Open the repository in a signed-out browser and confirm the first screen explains the problem, command, and safety boundary.
2. Run the command in the post exactly as written.
3. Check every number and evidence link.
4. Read the destination community's current self-promotion and disclosure rules.
5. Disclose that you are the maintainer.
6. Ask for critical feedback or a bounded trial, not stars or positive reviews.
7. Prepare time to answer questions on the day of the post.

## Channel order

### 1. Small technical communities

Start with communities where runtime routing and AI coding workflows are familiar. Use a feedback request rather than a launch announcement. Share with one community at a time so feedback can improve the next post.

Suggested order:

1. GeekNews or another Korean developer community.
2. A relevant Reddit community whose current rules allow maintainer posts.
3. DEV Community or Hashnode with a technical case article.
4. Show HN after the landing story and demo have survived the earlier feedback.
5. Product Hunt only when there are several independent cases and a polished visual demo.

### 2. Direct tester outreach

Contact people who actually use multiple AI coding sessions or have mixed Node/Python/Java installations. Ask for one bounded action:

> In a disposable directory, run `npx aienvmap@0.2.1 trial` (`npx.cmd` on policy-restricted Windows PowerShell) and tell me whether the findings match your environment. Public submission is optional, and raw paths or environment dumps should not be shared.

Personal contacts are valid testers. Disclose material relationships and do not describe a contributor, coauthor, paid tester, or maintainer-assisted review as fully independent.

## Ready-to-post copy

### Show HN

Title:

> Show HN: aienvmap - Read-only environment preflight for AI coding agents

Body:

> I built aienvmap after noticing that separate AI coding sessions can work in the same repository while assuming different Node, Python, Java, or package-manager routes. It records observed runtime evidence and pending change intent so the next agent can review them before changing the environment.
>
> Try it with `npx aienvmap@0.2.1 start`. The default workflow writes local aienvmap artifacts but does not install, remove, switch, or rewrite the development environment.
>
> I am looking for critical feedback on whether the first-run decision is useful, which findings are unclear, and whether this solves a real multi-agent problem.
>
> Project: https://aienvmap.svwvs.com/

### Short social post

> Codex and Copilot can share a repository without sharing the same assumptions about Node or Python. `npx aienvmap@0.2.1 start` gives the next agent observed runtime evidence and pending change intent without installing, removing, or switching anything. Critical feedback and real-environment trials are welcome: https://aienvmap.svwvs.com/

### Korean community draft

Translate this structure naturally rather than copying a machine-generated feature list:

1. State that you are the maintainer.
2. Describe one concrete multi-agent runtime mismatch.
3. Show `npx aienvmap@0.2.1 start`.
4. State that installation, removal, PATH edits, and runtime switching are outside the default behavior.
5. Link the project website; do not introduce individual submissions before the five-case threshold.
6. Ask whether the problem is real and whether the first output is understandable.

## Responding to feedback

- Thank people for negative results and reproducible failures.
- Ask for the operating system, command, expected result, and redacted observed result; never request secrets or raw environment dumps.
- Move reproducible defects to focused GitHub issues.
- Do not implement a request merely because it appears once. Record it and prioritize repeated problems or safety defects.
- Correct overclaims publicly instead of silently changing the wording.
- Never argue that a user misunderstood the product when the first-run output failed to explain itself.

## Evidence pipeline

Classify public cases using `CASE_REVIEW.md`:

```text
submitted -> reproducible -> outcome-verified -> longitudinal
```

Only independent outcome-verified or longitudinal cases increase market-validation claims. Keep repository-owned demos, maintainer compatibility runs, package requests, and public trials in their correct evidence categories.

## Two-week operating plan

### Week 1

- Confirm the README first screen and all links in a signed-out browser.
- Publish one Korean technical-community post.
- Invite five suitable testers with the bounded trial request.
- Answer questions and record recurring confusion without adding features immediately.

### Week 2

- Improve only messaging, documentation, or confirmed safety defects.
- Publish one English technical post using what was learned in week 1.
- Review submitted cases using `CASE_REVIEW.md` and apply exactly one maturity label per case.
- Update `MARKET.md` and `SCORECARD.md` only from reviewed, linkable evidence.

At the end of two weeks, decide whether to continue outreach, simplify onboarding, or resume product work based on trial completion and repeated feedback rather than impressions.
