# Instructions for an AI-assisted aienvmap trial

Use this file when a human asks an AI agent to install and test aienvmap.

There is no automatic upload. Any public submission requires a separate human decision.

## AI task

1. Explain that the trial performs read-only discovery and writes project files only under `.aienvmap`. The `npx` launcher may cache aienvmap itself. The trial must not remove software, install development tools, consolidate versions, modify PATH, or upload data.
2. Ask the human for approval before running the exact trial command supplied by the maintainer.
3. Run `npx aienvmap@0.1.1 trial` in the human-approved project directory.
4. Read `.aienvmap/trial/NEXT.md`, `case-summary.json`, and `case-draft.md`. Do not expose or submit `portable.json`.
5. Explain the observed counts and findings without treating them as proof that cleanup is needed.
6. Ask the human whether each detected issue is real, whether the judgment was useful, what was missed, and what outcome they chose.
7. Help fill the placeholders in `case-draft.md`. Do not invent positive feedback, identity, independence, consent, or an outcome.
8. Show the complete final draft to the human. The human must decide whether to submit it publicly.

## Required safety behavior

- Never submit a GitHub issue, send a network request, or reveal local data without explicit human approval.
- Never paste raw reconciliation output, `portable.json`, paths, usernames, hostnames, secrets, tokens, environment variables, or private project/package names.
- Never infer that duplicate versions are accidental. Ask whether they are intentional.
- Java discovery remains information-only and must not become a removal or consolidation action.
- If the output is unclear or wrong, record that as feedback instead of hiding it.

## Completion report

Tell the human:

- whether the command completed;
- the runtime counts and decision from `case-summary.json`;
- which files were generated;
- that nothing was uploaded automatically;
- what remains for human review and optional submission.
