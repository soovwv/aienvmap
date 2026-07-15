import path from "node:path";
import { markerBegin, markerEnd, renderAgentPointer } from "../render.js";
import { assertWritePathInsideWorkspace, previewMarkerBlock, removeMarkerBlock, replaceMarkerBlock } from "../fsutil.js";
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

  if (args.write || args.dry_run || args.uninstall) {
    const dir = workspaceDir(args);
    const rel = typeof args.write === "string" ? args.write : defaultTargets[target] || "AGENTS.md";
    const file = path.resolve(dir, rel);
    const relative = path.relative(dir, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("instruction pointer target must stay inside the workspace");
    }
    await assertWritePathInsideWorkspace(dir, file);
    if (args.dry_run) {
      const preview = await previewMarkerBlock(file, markerBegin, markerEnd, block);
      if (!args.quiet) console.log(`snippet preview: ${relative} ${preview.action} ${preview.beforeBytes}->${preview.afterBytes} bytes`);
      return { file: relative, target, mode: "dry-run", ...preview };
    }
    if (args.uninstall) {
      const removed = await removeMarkerBlock(file, markerBegin, markerEnd);
      if (!args.quiet) console.log(`snippet uninstall: ${relative} ${removed.action}`);
      return { file: relative, target, mode: "uninstall", ...removed };
    }
    await replaceMarkerBlock(file, markerBegin, markerEnd, block);
    if (!args.quiet) console.log(`snippet written: ${relative}`);
    return { file: relative, target };
  }

  console.log(block);
  return { target };
}
