import fs from "node:fs/promises";
import { stateDir, workspaceDir } from "../paths.js";

export async function initWorkspace(args) {
  const dir = workspaceDir(args);
  await fs.mkdir(stateDir(dir), { recursive: true });
  await fs.writeFile(`${stateDir(dir)}/policy.yml`, [
    "# aienvmap policy",
    "# Keep this small and explicit so AI agents can avoid version drift.",
    "# Default behavior is non-blocking: warn, ask, and record instead of locking.",
    "# node: 24",
    "# python: 3.11",
    "# packageManager: npm",
    "globalInstalls: ask-first",
    "runtimeChanges: ask-first",
    ""
  ].join("\n"), { flag: "wx" }).catch(() => {});
  if (!args.quiet) console.log(`initialized ${stateDir(dir)}`);
  return { stateDir: stateDir(dir) };
}
