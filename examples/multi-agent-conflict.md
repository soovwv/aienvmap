# Multi-Agent Conflict Demo

Use this demo when explaining why `aienvmap` exists: two AI agents touch one workspace and must avoid silent dependency or runtime drift.

`aienvmap` is an AI workspace coordination layer, not a replacement for package managers, SBOM generators, or vulnerability scanners. The light SBOM gives agents enough dependency context to coordinate; deeper scanners can stay optional.

## Real Use Case

A shared server, repo, or CI workspace may be touched by Codex, Claude, Gemini, and humans in the same day. One agent may upgrade a test runner, another may change the package manager, and a third may read an old environment assumption before either change is handed off.

`aienvmap` gives every AI the same environment truth before work starts:

- read `.aienvmap/status.json` first
- record intent before runtime, dependency, package manager, Docker, or global tool changes
- use the light SBOM as dependency context, not as a heavy blocking scanner
- keep local work advisory unless a human or CI explicitly requests strict mode

## One Command

```bash
npx aienvmap demo
```

The command creates a temporary workspace, onboards Codex/Claude/Gemini pointers, records two dependency intents, refreshes the env map, and prints the detected collaboration conflict.

For local development in this repository:

```bash
npm run demo:conflict
```

## Setup

```bash
npx aienvmap onboard
npx aienvmap status
```

`onboard` writes pointers into `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` so each AI can discover the same live environment map from its normal instruction file.

## Conflict Scenario

Agent A plans a dependency change:

```bash
npx aienvmap intent --actor agent:codex --action "upgrade test runner" --target dependency
```

Agent B plans a different dependency change before Agent A finishes:

```bash
npx aienvmap intent --actor agent:claude --action "replace package manager" --target dependency
```

Now refresh and inspect:

```bash
npx aienvmap sync
npx aienvmap status
npx aienvmap context --json
```

Expected result: `status` and `context --json` surface review-needed collaboration state instead of blocking local work or silently letting both agents mutate the same target.

What the next AI sees:

- `aiSession.start`: run `aienvmap status --json`, then refresh or inspect context.
- `collaboration.status`: `review-before-env-change`.
- `coordination.conflictTargets`: `dependency`.
- `lightSbom.riskSummary`: dependency risk context without installing packages.
- `agentPointers.discovery`: whether Codex, Claude, Gemini, or optional pointers can find the env map.
- `aiDiscovery.copyPastePrompt`: the handoff text to paste when the next AI did not auto-load the pointer.

## Safe Resolution

After the human or lead agent chooses the accepted path:

```bash
npx aienvmap resolve --actor human:you --target dependency --status resolved
npx aienvmap checkpoint --actor agent:codex --summary "accepted dependency path" --target dependency
npx aienvmap handoff --record --actor agent:codex
```

The next AI reads `.aienvmap/status.json`, `.aienvmap/summary.md`, or `aienvmap context --json` and continues from the same env map and light SBOM state.
