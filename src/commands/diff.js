import { diffManifests } from "../diff.js";
import { readJson } from "../fsutil.js";
import { manifestPath, previousManifestPath, workspaceDir } from "../paths.js";

export async function diffWorkspace(args) {
  const dir = workspaceDir(args);
  const previous = await readJson(previousManifestPath(dir));
  const current = await readJson(manifestPath(dir));
  if (!current) throw new Error("missing manifest; run `aienvmap sync` first");
  const changes = diffManifests(previous, current);
  if (!changes.length) {
    console.log("no environment changes detected");
    return;
  }
  for (const change of changes) {
    console.log(format(change));
  }
}

function format(change) {
  if (change.type === "changed") return `${change.scope} ${change.key}: ${change.before} -> ${change.after}`;
  return `${change.scope} ${change.key}: ${change.type} ${change.after ?? change.before}`;
}
