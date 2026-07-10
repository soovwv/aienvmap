import path from "node:path";
import { markerBegin, markerEnd, renderAgentPointer } from "../render.js";
import { replaceMarkerBlock } from "../fsutil.js";
import { workspaceDir } from "../paths.js";

const defaultTargets = {
  agents: "AGENTS.md",
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  gemini: "GEMINI.md",
  cursor: path.join(".cursor", "rules", "environment.md"),
  copilot: path.join(".github", "copilot-instructions.md")
};
const knownTargets = new Set(Object.keys(defaultTargets));

export async function snippetWorkspace(args) {
  const target = String(args._?.[0] || args.agent || "agents").toLowerCase();
  if (!knownTargets.has(target)) {
    throw new Error(`unknown snippet target "${target}"; use agents, codex, claude, gemini, cursor, or copilot`);
  }
  const block = renderAgentPointer(target);

  if (args.write) {
    const dir = workspaceDir(args);
    const rel = args.write === true ? defaultTargets[target] || "AGENTS.md" : String(args.write);
    await replaceMarkerBlock(path.join(dir, rel), markerBegin, markerEnd, block);
    if (!args.quiet) console.log(`snippet written: ${rel}`);
    return { file: rel, target };
  }

  console.log(block);
  return { target };
}
