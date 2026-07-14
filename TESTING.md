# External tester guide

Thank you for testing aienvmap on a real development machine. The test takes about 5-10 minutes and is designed for Windows, macOS, and Linux environments using Node, Python, Java, or multiple AI coding agents.

## Safety contract

- Bounded runtime version probes; aienvmap requests no software removal or PATH modification. Current unreleased trial and quick mode do not execute project Maven/Gradle wrappers. Arbitrary discovered executables are not guaranteed side-effect-free, so use a disposable directory or project copy.
- No telemetry and no automatic upload.
- The published 0.1.1 trial writes only under `.aienvmap`, refreshes state, and may execute project Maven/Gradle wrappers. Run 0.1.1 only in a new empty disposable directory, not a project copy. The `npx` launcher may cache the aienvmap package itself.
- A human reviews the exact public draft before submitting anything.

## Run the trial

Open a terminal in a disposable directory and run:

```bash
npx aienvmap@0.1.1 trial
```

Do not use a project copy with published 0.1.1. Current unreleased code isolates generated trial files under `.aienvmap/trial/` and skips project wrappers; do not assume those guarantees for 0.1.1. For a later release, check the exact version's `schema --json` `outputs.trial.writeScope`. Do not use an unreviewed command pasted by another participant.

Then give `.aienvmap/trial/NEXT.md` to the AI that ran the test. The generated summary completes the technical test; you do not need to write a review or answer a questionnaire. If you voluntarily want to publish an environment case, the AI will fill the factual draft and request one compact confirmation plus separate submission approval.

## What to evaluate

- Did it find the Node, Python, and Java installations you expected?
- Did it expose an unexpected duplicate, version, manager, or AI coordination risk?
- Was the AI judgment useful and conservative?
- Were there false positives, false negatives, confusing output, or slow commands?
- Would this help before an AI installs or changes development tools?

Honest negative feedback is useful. A clear environment and a decision to make no change are valid outcomes.

## Optional one-line public-case confirmation

Only when you want to contribute public evidence, reply once with:

`real=yes|partly|no; useful=1|2|3|4|5|skip; outcome=no-change|follow-up|change-made|other; independent=yes|no`

The AI must show the completed draft and obtain separate explicit approval before submitting it. Running the trial or replying to the confirmation never grants publication consent.

## Cleanup

Delete the `.aienvmap` directory if you do not want to keep the local reports. aienvmap does not uninstall or change runtimes, package managers, or PATH.

## Reporting failures

Use a normal GitHub bug report. Include the aienvmap version, operating-system category, command, and sanitized error text. Never publish secrets, environment-variable values, usernames, hostnames, local paths, or private project/package names.
