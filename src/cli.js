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
import { trialWorkspace } from "./commands/trial.js";
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
  ["scorecard", scorecardWorkspace],
  ["trial", trialWorkspace]
]);

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const globalValueOptions = new Set(["--dir"]);
const booleanOptions = new Set([
  "all", "check", "ci", "clear_import", "compact", "deep", "dry_run", "full_packages", "inspect_project_wrappers",
  "json", "markdown", "no_sync", "open", "owner_verification", "portable", "quick", "quiet", "record",
  "security", "show_paths", "uninstall", "verbose"
]);
const requiredValueOptions = new Set([
  "action", "actor", "after", "against", "agent", "agents", "alias", "baseline", "before", "case_summary",
  "change", "comparison", "dir", "evidence", "format", "home_evidence", "id", "if_revision", "import",
  "inspect_home", "inspect_homes", "lease_minutes", "portable_compare", "portable_from", "reason", "ref",
  "review", "scenario", "session", "status", "strict", "summary", "target", "type"
]);
const knownOptions = new Set([...booleanOptions, ...requiredValueOptions, "write"]);
const positionalCommands = new Set(["demo", "onboard", "snippet"]);
const commandUsage = new Map([
  ["start", "aienvmap start [--dir .] [--json] [--compact]"],
  ["status", "aienvmap status [--dir .] [--json] [--compact] [--write] [--quiet] [--verbose]"],
  ["onboard", "aienvmap onboard [codex claude gemini] [--agents codex,claude,gemini,cursor,copilot] [--dry-run|--uninstall] [--no-sync]"],
  ["sync", "aienvmap sync [--dir .] [--json] [--quiet] [--deep] [--security]"],
  ["context", "aienvmap context [--dir .] [--json]"],
  ["discover", "aienvmap discover [--dir .] [--json]"],
  ["reconcile", "aienvmap reconcile [--dir .] [--json] [--write|--check|--portable] [--quick|--full-packages]"],
  ["intent", "aienvmap intent [--dir .] --actor agent:id --action planned-change [--target dependency] [--if-revision ir1:...]"],
  ["resolve", "aienvmap resolve [--dir .] --actor human:id (--id intent-id|--target dependency|--all) [--if-revision ir1:...]"],
  ["checkpoint", "aienvmap checkpoint [--dir .] --actor agent:id --summary what-changed [--target dependency] [--json]"],
  ["handoff", "aienvmap handoff [--dir .] [--json] [--record --actor agent:id]"],
  ["plan", "aienvmap plan [--dir .] [--json] [--write]"],
  ["doctor", "aienvmap doctor [--dir .] [--json] [--ci] [--strict security|policy|coordination|all]"],
  ["sbom", "aienvmap sbom [--dir .] [--json] [--write] [--import workspace-sbom.json|--clear-import]"],
  ["trial", "aienvmap trial [--dir .] [--json]"],
  ["dash", "aienvmap dash [--dir .] [--open]"],
  ["schema", "aienvmap schema [--json]"],
  ["scorecard", "aienvmap scorecard [--json]"],
  ["init", "aienvmap init [--dir .]"],
  ["scan", "aienvmap scan [--dir .] [--json] [--deep] [--security]"],
  ["compile", "aienvmap compile [--dir .]"],
  ["diff", "aienvmap diff [--dir .]"],
  ["record", "aienvmap record [--dir .] --actor agent:id --summary what-changed [--target environment]"],
  ["summary", "aienvmap summary [--dir .] [--write]"],
  ["snippet", "aienvmap snippet [agents|codex|claude|gemini|cursor|copilot] [--write AGENTS.md]"],
  ["demo", "aienvmap demo [conflict] [--json]"]
]);

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
  if (command === "help") {
    const args = parseArgs(rest);
    if (args._.length) throw new Error(`help: unexpected argument "${args._[0]}"`);
    printUsage({ all: args.all === true });
    return;
  }
  const run = commands.get(command);
  if (!run) {
    printUsage();
    throw new Error(`unknown command "${command}"`);
  }
  if (rest.includes("--help") || rest.includes("-h")) {
    printCommandUsage(command);
    return;
  }
  const args = { ...globalArgs, ...parseArgs(rest) };
  if (args.compact && !["start", "status"].includes(command)) {
    throw new Error(`${command}: --compact is only supported by start and status`);
  }
  if (args.compact && !args.json) {
    throw new Error(`${command}: --compact requires --json`);
  }
  if (!positionalCommands.has(command) && args._.length) {
    throw new Error(`${command}: unexpected argument "${args._[0]}"`);
  }
  if (["demo", "snippet"].includes(command) && args._.length > 1) {
    throw new Error(`${command}: unexpected argument "${args._[1]}"`);
  }
  await run(args);
}

function splitCommand(argv) {
  if (["-h", "--help", "-v", "--version", "version"].includes(argv[0])) {
    return { command: argv[0], rest: argv.slice(1), globalArgs: { _: [] } };
  }
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
    if (!knownOptions.has(key)) throw new Error(`unknown option "--${rawKey}"`);
    if (inline !== undefined) {
      out[key] = inline;
    } else if (booleanOptions.has(key)) {
      out[key] = true;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out[key] = argv[++i];
    } else if (requiredValueOptions.has(key)) {
      throw new Error(`--${rawKey} requires a value`);
    } else {
      out[key] = true;
    }
  }
  return out;
}

function printUsage(options = {}) {
  const advanced = options.all ? `
Advanced commands:
  sync        refresh all generated artifacts
  context     print the full AI preflight brief
  discover    verify AI instruction-file discovery
  reconcile   inspect mixed runtime and package-manager routing
  intent      record a planned environment change
  resolve     resolve or cancel recorded change intent
  checkpoint  record, refresh, and hand off an environment change
  handoff     prepare the next-agent environment summary
  plan        prepare a read-only environment action plan
  doctor      check policy, security, and coordination gates
  sbom        inspect or import dependency and SBOM evidence
  trial       run a local technical test and prepare optional evidence
  dash        regenerate or open the human dashboard
  schema      print stable machine-readable contracts
  scorecard   separate engineering readiness from market evidence
  init, scan, compile, diff, record, summary, snippet, demo

Run \`aienvmap <command> --help\` for the accepted command syntax.
` : `
More:
  aienvmap help --all
`;
  console.log(`aienvmap - know the development environment before an AI changes it

Usage:
  aienvmap start [--dir .] [--json] [--compact]
  aienvmap status [--dir .] [--json] [--compact] [--write] [--quiet] [--verbose]
  aienvmap onboard [codex claude gemini] [--agents codex,claude,gemini,cursor,copilot] [--dry-run|--uninstall] [--no-sync]

Start here:
  aienvmap start    one-command AI startup with a copy-paste fallback prompt
  aienvmap status    print a 5-line AI/human environment decision; --verbose shows command details
  aienvmap onboard  install thin AI instruction pointers and refresh outputs
${advanced}
`);
}

function printCommandUsage(command) {
  const usage = commandUsage.get(command);
  if (!usage) {
    printUsage();
    return;
  }
  console.log(`${usage}

This command never gains environment-change authority from help or discovery output.
Run \`aienvmap help --all\` to see the complete command map.`);
}
