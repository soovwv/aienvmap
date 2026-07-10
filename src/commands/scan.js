import fs from "node:fs/promises";
import { buildManifest } from "../manifest.js";
import { diffManifests } from "../diff.js";
import { appendJsonLine, exists, readJson, writeJson } from "../fsutil.js";
import { manifestPath, previousManifestPath, timelinePath, workspaceDir } from "../paths.js";

export async function scanWorkspace(args) {
  const dir = workspaceDir(args);
  const currentPath = manifestPath(dir);
  const previous = await readJson(currentPath, null);
  if (previous && await exists(currentPath)) {
    await fs.copyFile(currentPath, previousManifestPath(dir));
  }
  const manifest = await buildManifest(dir, { deep: args.deep, security: args.security });
  await writeJson(currentPath, manifest);
  const changes = diffManifests(previous, manifest);
  for (const change of changes) {
    await appendJsonLine(timelinePath(dir), {
      at: manifest.generatedAt,
      actor: "system:scan",
      type: "detected-change",
      change
    });
  }
  if (!args.quiet) {
    console.log(`scanned ${dir}`);
    console.log(`manifest: ${currentPath}`);
    console.log(`changes: ${changes.length}`);
  }
  return {
    dir,
    manifest: currentPath,
    timeline: timelinePath(dir),
    changes: changes.length
  };
}
