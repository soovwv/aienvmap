import path from "node:path";

export function workspaceDir(args) {
  return path.resolve(String(args.dir || "."));
}

export function stateDir(dir) {
  return path.join(dir, ".aienvmap");
}

export function manifestPath(dir) {
  return path.join(stateDir(dir), "manifest.json");
}

export function statusJsonPath(dir) {
  return path.join(stateDir(dir), "status.json");
}

export function discoveryJsonPath(dir) {
  return path.join(stateDir(dir), "discovery.json");
}

export function sbomJsonPath(dir) {
  return path.join(stateDir(dir), "sbom.json");
}

export function cyclonedxSbomPath(dir) {
  return path.join(stateDir(dir), "sbom.cdx.json");
}

export function externalSbomEvidencePath(dir) {
  return path.join(stateDir(dir), "external-sbom-evidence.json");
}

export function previousManifestPath(dir) {
  return path.join(stateDir(dir), "manifest.previous.json");
}

export function timelinePath(dir) {
  return path.join(stateDir(dir), "timeline.jsonl");
}

export function intentsPath(dir) {
  return path.join(stateDir(dir), "intents.jsonl");
}

export function dashboardPath(dir) {
  return path.join(stateDir(dir), "dashboard.html");
}

export function planJsonPath(dir) {
  return path.join(stateDir(dir), "plan.json");
}

export function planMdPath(dir) {
  return path.join(stateDir(dir), "plan.md");
}

export function summaryMdPath(dir) {
  return path.join(stateDir(dir), "summary.md");
}

export function reconcileJsonPath(dir) {
  return path.join(stateDir(dir), "reconcile.json");
}

export function stateReadmePath(dir) {
  return path.join(stateDir(dir), "README.md");
}

export function aiEnvPath(dir) {
  return path.join(dir, "AIENV.md");
}
