# Instructions for an AI-assisted aienvmap trial

Use this file when a human asks an AI agent to install and test aienvmap.

There is no automatic upload. Any public submission requires a separate human decision.

## AI task

1. Explain that 0.2.0 performs bounded environment discovery by running version probes for discovered runtime executables. It writes trial artifacts only under `.aienvmap/trial/` and skips project Maven/Gradle wrappers. The `npx` launcher may cache aienvmap itself. The trial requests no software removal, development-tool installation, version consolidation, PATH modification, or upload.
2. Ask the human for approval before running the exact trial command supplied by the maintainer. On Windows PowerShell, explain and use `npx.cmd aienvmap@0.2.0 trial` when `npx` would resolve to a policy-blocked `npx.ps1`; keep every package argument unchanged.
3. Run `npx aienvmap@0.2.0 trial`, or the Windows PowerShell `npx.cmd` equivalent above, only in the human-approved disposable directory or disposable project copy. Read and obey that exact version's `schema --json` `outputs.trial` contract. Version 0.1.1 is a legacy trial with broader project-local writes and must not be substituted.
4. Read `.aienvmap/trial/NEXT.md` and `case-summary.json`. Read `case-draft.md` only if the human chooses the optional public-case path. Do not expose or submit `portable.json`.
5. Explain the observed counts and findings without treating them as proof that cleanup is needed.
6. Treat the technical test as complete without requesting a review. Summarize the generated result and ask no opinion questions unless the human wants to create a public environment case.
7. For an optional public case, fill every factual field you can from the generated artifacts and your own actions. Ask the human once for: `real=yes|partly|no; useful=1|2|3|4|5|skip; outcome=no-change|follow-up|change-made|other; independent=yes|no`. Accept an optional correction in the same reply.
8. Fill `case-draft.md` from that reply. Do not invent positive feedback, identity, independence, consent, or an outcome.
9. Show the complete final draft to the human and ask separately for explicit submission approval. Never interpret silence, trial approval, or the compact confirmation as approval to publish.

## Required safety behavior

- Never submit a GitHub issue, send a network request, or reveal local data without explicit human approval.
- Do not burden the human with a questionnaire for routine technical testing. Public case evidence is optional.
- Never paste raw reconciliation output, `portable.json`, paths, usernames, hostnames, secrets, tokens, environment variables, or private project/package names.
- Never infer that duplicate versions are accidental. Ask whether they are intentional.
- Runtime version probes execute discovered third-party files with bounded arguments. Never claim that arbitrary executables are guaranteed side-effect-free; use a disposable directory or project copy.
- Java discovery remains information-only and must not become a removal or consolidation action.
- Never run `Set-ExecutionPolicy`, use a PowerShell bypass, or weaken machine policy for aienvmap. Use the existing `.cmd` shim on Windows instead.
- If the output is unclear or wrong, record that as feedback instead of hiding it.

## Completion report

Tell the human:

- whether the command completed;
- the runtime counts and decision from `case-summary.json`;
- which files were generated;
- that nothing was uploaded automatically;
- what remains for human review and optional submission.
