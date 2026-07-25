import fs from "node:fs/promises";
import path from "node:path";

const maximumAgeMs = 24 * 60 * 60 * 1000;
const timestampToleranceMs = 1000;
const projectEvidenceFiles = [
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".nvmrc", ".node-version", ".python-version",
  ".tool-versions", "mise.toml", "pyproject.toml", "requirements.txt", "devbox.json", ".devcontainer.json", path.join(".devcontainer", "devcontainer.json")
];

export async function reconciliationFresh(value, dir, now = Date.now()) {
  const generated = Date.parse(value?.generatedAt || "");
  if (!Number.isFinite(generated) || now - generated >= maximumAgeMs) return false;
  const modified = await Promise.all(projectEvidenceFiles.map(async (file) => {
    try { return (await fs.stat(path.join(dir, file))).mtimeMs; } catch { return 0; }
  }));
  return modified.every((mtime) => mtime <= generated + timestampToleranceMs);
}
