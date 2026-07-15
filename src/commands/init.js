import fs from "node:fs/promises";
import path from "node:path";
import { assertWritePathInsideWorkspace } from "../fsutil.js";
import { stateDir, workspaceDir } from "../paths.js";

export async function initWorkspace(args) {
  const dir = workspaceDir(args);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(stateDir(dir), { recursive: true });
  const policy = path.join(stateDir(dir), "policy.yml");
  await assertWritePathInsideWorkspace(dir, policy);
  await fs.writeFile(policy, [
    "# aienvmap policy",
    "# Keep this small and explicit so AI agents can avoid version drift.",
    "# Default behavior is non-blocking: warn, ask, and record instead of locking.",
    "# node: 24",
    "# python: 3.11",
    "# packageManager: npm",
    "# intentional-node-versions: 20,22",
    "# intentional-python-versions: 3.11,3.12",
    "# intentional-java-versions: 17,21",
    "globalInstalls: ask-first",
    "runtimeChanges: ask-first",
    ""
  ].join("\n"), { flag: "wx" }).catch((error) => {
    if (error?.code !== "EEXIST") throw error;
  });
  if (!args.quiet) console.log(`initialized ${stateDir(dir)}`);
  return { stateDir: stateDir(dir) };
}
