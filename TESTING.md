# External tester guide

Thank you for testing aienvmap on a real development machine. The test takes about 5-10 minutes and is designed for Windows, macOS, and Linux environments using Node, Python, Java, or multiple AI coding agents.

## Safety contract

- Read-only environment inspection; no software removal or PATH modification.
- No telemetry and no automatic upload.
- The published 0.1.1 trial writes only under `.aienvmap`, but it refreshes `manifest.json`, may copy `manifest.previous.json`, and may append `timeline.jsonl`. Run 0.1.1 in a disposable directory. The `npx` launcher may cache the aienvmap package itself.
- A human reviews the exact public draft before submitting anything.

## Run the trial

Open a terminal in a disposable directory and run:

```bash
npx aienvmap@0.1.1 trial
```

To evaluate project dependencies, use a disposable copy of the project. Current unreleased code isolates generated trial files under `.aienvmap/trial/`; do not assume that guarantee for 0.1.1. For a later release, check the exact version's `schema --json` `outputs.trial.writeScope`. Do not use an unreviewed command pasted by another participant.

Then open `.aienvmap/trial/NEXT.md`. Review and complete `.aienvmap/trial/case-draft.md`. Submit it through the GitHub link in `NEXT.md` only if you consent.

## What to evaluate

- Did it find the Node, Python, and Java installations you expected?
- Did it expose an unexpected duplicate, version, manager, or AI coordination risk?
- Was the AI judgment useful and conservative?
- Were there false positives, false negatives, confusing output, or slow commands?
- Would this help before an AI installs or changes development tools?

Honest negative feedback is useful. A clear environment and a decision to make no change are valid outcomes.

## Cleanup

Delete the `.aienvmap` directory if you do not want to keep the local reports. aienvmap does not uninstall or change runtimes, package managers, or PATH.

## Reporting failures

Use a normal GitHub bug report. Include the aienvmap version, operating-system category, command, and sanitized error text. Never publish secrets, environment-variable values, usernames, hostnames, local paths, or private project/package names.
