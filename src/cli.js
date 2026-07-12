import { initWorkspace } from "./commands/init.js";
import { scanWorkspace } from "./commands/scan.js";
import { compileWorkspace } from "./commands/compile.js";
import { diffWorkspace } from "./commands/diff.js";
import { doctorWorkspace } from "./commands/doctor.js";
import { dashWorkspace } from "./commands/dash.js";
import { contextWorkspace } from "./commands/context.js";
import { recordWorkspace } from "./commands/record.js";
import { intentWorkspace } from "./commands/intent.js";
import { resolveWorkspace } from "./commands/resolve.js";
import { syncWorkspace } from "./commands/sync.js";
import { snippetWorkspace } from "./commands/snippet.js";
import { handoffWorkspace } from "./commands/handoff.js";
import { planWorkspace } from "./commands/plan.js";
import { statusWorkspace } from "./commands/status.js";
import { schemaWorkspace } from "./commands/schema.js";
import { checkpointWorkspace } from "./commands/checkpoint.js";
import { sbomWorkspace } from "./commands/sbom.js";
import { summaryWorkspace } from "./commands/summary.js";
import { onboardWorkspace } from "./commands/onboard.js";
import { demoWorkspace } from "./commands/demo.js";
import { discoverWorkspace } from "./commands/discover.js";
import { startWorkspace } from "./commands/start.js";
import { reconcileWorkspace } from "./commands/reconcile.js";
import { scorecardWorkspace } from "./commands/scorecard.js";
import { readFileSync } from "node:fs";

const commands = new Map([
  ["init", initWorkspace],
  ["scan", scanWorkspace],
  ["compile", compileWorkspace],
  ["diff", diffWorkspace],
  ["doctor", doctorWorkspace],
  ["dash", dashWorkspace],
  ["context", contextWorkspace],
  ["record", recordWorkspace],
  ["intent", intentWorkspace],
  ["resolve", resolveWorkspace],
  ["sync", syncWorkspace],
  ["snippet", snippetWorkspace],
  ["handoff", handoffWorkspace],
  ["plan", planWorkspace],
  ["status", statusWorkspace],
  ["schema", schemaWorkspace],
  ["checkpoint", checkpointWorkspace],
  ["sbom", sbomWorkspace],
  ["summary", summaryWorkspace],
  ["onboard", onboardWorkspace],
  ["demo", demoWorkspace],
  ["discover", discoverWorkspace],
  ["start", startWorkspace],
  ["reconcile", reconcileWorkspace],
  ["scorecard", scorecardWorkspace]
]);

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const globalValueOptions = new Set(["--dir"]);

export async function main(argv) {
  const { command, rest, globalArgs } = splitCommand(argv);
  if (command === "-v" || command === "--version" || command === "version") {
    console.log(version);
    return;
  }
  if (!command || command === "-h" || command === "--help") {
    printUsage();
    return;
  }
  const run = commands.get(command);
  if (!run) {
    printUsage();
    throw new Error(`unknown command "${command}"`);
  }
  await run({ ...globalArgs, ...parseArgs(rest) });
}

function splitCommand(argv) {
  const leading = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      return {
        command: arg,
        rest: argv.slice(i + 1),
        globalArgs: parseArgs(leading)
      };
    }
    leading.push(arg);
    if (!arg.includes("=") && globalValueOptions.has(arg) && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      leading.push(argv[++i]);
    }
  }
  return {
    command: argv[0],
    rest: [],
    globalArgs: parseArgs(leading)
  };
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const [rawKey, inline] = arg.slice(2).split("=", 2);
    const key = rawKey.replaceAll("-", "_");
    if (inline !== undefined) {
      out[key] = inline;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out[key] = argv[++i];
    } else {
      out[key] = true;
    }
  }
  return out;
}

function printUsage() {
  console.log(`aienvmap - AI-first env map + light SBOM coordination for shared AI workspaces

Usage:
  aienvmap sync [--dir .] [--json] [--quiet] [--deep] [--security]
  aienvmap context [--dir .] [--json]
  aienvmap status [--dir .] [--json] [--write] [--quiet] [--verbose]
  aienvmap handoff [--dir .] [--json] [--record --actor agent:id]
  aienvmap checkpoint [--dir .] --actor agent:id --summary "what changed" [--target dependency] [--json]
  aienvmap plan [--dir .] [--json] [--write]
  aienvmap sbom [--dir .] [--json] [--write] [--import workspace-sbom.json|--clear-import]
  aienvmap summary [--dir .] [--write]
  aienvmap schema [--json]
  aienvmap start [--dir .] [--json]
  aienvmap discover [--dir .] [--json]
  aienvmap reconcile [--dir .] [--json] [--write|--check|--portable] [--inspect-home /absolute/home] [--portable-from reconcile.json] [--baseline file] [--quick|--full-packages] [--show-paths]
  aienvmap reconcile --portable-compare before.json --against after.json [--owner-verification] [--json]
  aienvmap reconcile --case-summary portable.json [--comparison compare.json] [--json]
  aienvmap scorecard [--json]
  aienvmap onboard [codex claude gemini] [--agents codex,claude,gemini,cursor,copilot] [--dry-run|--uninstall] [--no-sync]
  aienvmap demo [conflict] [--json]

Common:
  aienvmap start    one-command AI startup with a copy-paste fallback prompt
  aienvmap onboard   install AI instruction-file pointers and refresh outputs
  aienvmap sync      update AIENV.md, discovery, start-here README, status, summary, SBOM, ledger, intents, and dashboard
  aienvmap status    print a 5-line AI/human environment decision; --verbose shows command details
  aienvmap context   print the AI preflight brief
  aienvmap handoff   print the next-agent handoff summary
  aienvmap checkpoint record, sync, status, and handoff after an env change
  aienvmap plan      print a read-only AI environment action plan
  aienvmap sbom      print/write light SBOM plus dependencyQuickCheck
  aienvmap summary   print/write a compact Markdown summary for AI and CI
  aienvmap schema    print the stable AI-readable output contract
  aienvmap discover  read-only detection plus aiDiscovery.decision and copy-paste prompt
  aienvmap reconcile read-only package-manager traffic report for existing, non-clean environments
  aienvmap scorecard evidence-bounded technical readiness and market validation scores
  aienvmap snippet   print an AGENTS.md pointer snippet
  aienvmap demo      run the temporary multi-agent conflict demo
  aienvmap dash      regenerate/open the lightweight dashboard

Advanced:
  aienvmap init [--dir .]
  aienvmap scan [--dir .] [--deep] [--security]
  aienvmap intent [--dir .] --actor agent:codex [--session thread:id] --action "install pnpm" [--lease-minutes 60] [--if-revision ir1:...]
  aienvmap resolve [--dir .] --actor human:you (--id <intent-id>|--target dependency|--all) [--status resolved|cancelled] [--if-revision ir1:...] [--json]
  aienvmap record [--dir .] --actor agent:codex --summary "updated .nvmrc" [--target node] [--before 20] [--after 24]
  aienvmap checkpoint [--dir .] --actor agent:codex --summary "updated dependency" [--target dependency]
  aienvmap snippet [agents|codex|claude|gemini|cursor|copilot] [--write AGENTS.md]
  aienvmap onboard [codex claude gemini] [--agents codex,claude,gemini,cursor,copilot] [--dry-run|--uninstall] [--no-sync]
  aienvmap compile [--dir .]
  aienvmap diff [--dir .]
  aienvmap doctor [--dir .] [--json] [--ci] [--strict security|policy|coordination|all]
  aienvmap sbom [--dir .] [--json] [--write] [--import workspace-sbom.json|--clear-import]
  aienvmap summary [--dir .] [--write]
  aienvmap start [--dir .] [--json]
  aienvmap discover [--dir .] [--json]
  aienvmap reconcile [--dir .] [--json] [--write|--check] [--inspect-home /absolute/home] [--baseline file] [--quick|--full-packages] [--show-paths]
  aienvmap demo [conflict] [--json]
  aienvmap dash [--dir .] [--open]
`);
}
