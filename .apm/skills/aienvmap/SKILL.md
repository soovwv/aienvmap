---
name: aienvmap
description: Use before an AI installs, removes, switches, or upgrades runtimes, package managers, global tools, dependencies, Docker settings, lockfiles, or environment policy on an existing or shared development machine. Observe first, coordinate the proposed change, and preserve explicit human approval boundaries.
---

<!-- aienvmap-agent-skill:v1 -->

# aienvmap environment preflight

Use aienvmap as a lightweight evidence and handoff layer. It observes the existing host; it is not a package manager, sandbox, full SBOM scanner, or permission to modify the environment.

## Trigger

Use this skill when work may affect:

- Node, Python, Java, or another runtime;
- npm, pnpm, Yarn, Corepack, pip, uv, pipx, or Conda;
- global tools, PATH routing, Docker, lockfiles, or dependency policy;
- a repository, workstation, CI runner, GPU host, or server shared by multiple AI agents or people.

Skip it for a project-local source edit that cannot affect the development environment. Keep Syft, Trivy, Grype, Dependency-Track, mise, Flox, Devbox, and other specialist tools in their own roles.

## Safety before execution

1. Prefer an already available `aienvmap` command.
2. If it is unavailable, explain that `npx aienvmap@0.2.1` may download and cache the exact npm release. Ask for approval before any network-backed execution.
3. Never install aienvmap globally, edit PATH, remove software, consolidate versions, or run a package manager merely because this skill was loaded.
4. Treat Java discovery as information-only.
5. On Windows PowerShell, if `npx` resolves to a policy-blocked `npx.ps1`, use `npx.cmd` with identical package arguments. Never change or bypass PowerShell execution policy.

For detailed boundaries, read `references/safety.md`.

## Short workflow

Start with the read-oriented entry point:

```bash
aienvmap start --json
```

If the command is not already available and the user approved exact-version npm execution:

```bash
npx aienvmap@0.2.1 start --json
```

Then:

1. Read `aiDecisionEnvelope`, `discoveryDecision`, `aiEntry`, `artifactFreshness`, and `nextSafeCommand`. When `questionRequired` is true, ask the provided `userQuestion` without inferring intent; treat `observationAuthority: observed-not-approved` and `neverDo` as hard interpretation boundaries.
2. Use `aienvmap discover --json` when instruction or skill pickup is uncertain.
3. Use `aienvmap reconcile --quick --json` before judging mixed runtime or package-manager routing.
4. Ask whether multiple versions are intentional. Duplication alone never authorizes cleanup.
5. Before an approved environment change, record intent with a specific actor and target.
6. After the change, run checkpoint and handoff so another AI can review the result.

```bash
aienvmap intent --actor agent:id --action planned-change --target environment
aienvmap checkpoint --actor agent:id --summary what-changed --target environment
aienvmap handoff --record --actor agent:id
```

## Decision boundary

- Continue project-local work when the result allows it.
- Stop before removal, global installation, runtime switching, PATH changes, or lockfile rewrites unless the user explicitly approved that action.
- Use the reported evidence and next command; do not invent ownership, installation identity, security confidence, or automatic AI-host pickup.
- A marker or skill file proves only that project context exists. It does not prove that the current AI host loaded it.

## Interoperability

- Read `schema --json` `aiAdoptionDecision.uniqueJob`, `chooseInstead`, and `compositionOrder` before recommending aienvmap or an adjacent tool.
- APM distributes this skill; aienvmap observes the host.
- mise, Flox, Devbox, native installers, or version managers may perform a separately approved change.
- Syft, Trivy, Grype, or Dependency-Track may provide authoritative SBOM or vulnerability evidence.
- aienvmap records the pre-change evidence, decision boundary, checkpoint, and handoff.

For the detailed tool boundary and light SBOM workflow, read `references/interoperability.md`.

## Completion report

Report:

- what environment evidence was observed;
- whether multiple versions or routing conflicts require clarification;
- what was intentionally left unchanged;
- the exact approved change, if any;
- the checkpoint and handoff status;
- whether external scanner evidence was used.
