# External tester invitation

Use one of these messages in a community that permits project testing requests. Link to the repository and testing guide. Do not describe download requests as users or claim that aienvmap is a proven standard.

## Short version

> I am looking for external testers for aienvmap 0.1.1, a dependency-free environment map for AI coding agents. It reads existing Node, Python, Java, package-manager, and light SBOM state before an AI changes the environment. The trial does not modify PATH or remove development tools, and does not upload feedback automatically. In a new empty disposable directory, run `npx aienvmap@0.1.1 trial`, then let your AI summarize the local result. Do not use a project copy: published 0.1.1 may refresh existing `.aienvmap` state and execute project Maven/Gradle wrappers. Honest reports of missed installations, false positives, and confusing output are especially useful.

The AI can complete the technical test and summarize the result without asking you to write a review. A public environment case is optional; if you choose it, the AI asks for one compact confirmation, prepares the draft, and asks separately before anything is submitted.

## AI-assisted version

> You can ask Codex, Claude, Gemini, Cursor, or Copilot to perform the test. Give the AI the repository's `AI_TESTING.md` and ask it to follow every approval and privacy rule. The AI must show you the final draft and may not submit it without your explicit approval.

## Who is most useful

- Developers with multiple Node, Python, or Java installations
- Developers using nvm, fnm, Volta, mise, pyenv, uv, Conda, SDKMAN, or jenv
- Teams using more than one AI coding agent or session in the same repository or machine
- Owners of an existing non-clean Windows, macOS, or Linux development environment

## What counts as useful feedback

- A real installation was missed or counted incorrectly.
- A warning was false, unclear, or too strong.
- The AI asked the right question before proposing a change.
- Multiple versions were intentional and aienvmap respected that intent.
- No change was the safest conclusion.

Do not request positive reviews. Ask for accurate outcomes and privacy-reviewed evidence.
