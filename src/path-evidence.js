import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exists } from "./fsutil.js";

export function pathEntries(value) {
  return String(value || "").split(path.delimiter).map((item) => item.trim()).filter(Boolean);
}

export async function namedFilesBelow(root, depth, names) {
  if (!root || depth < 0 || !(await exists(root))) return [];
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await namedFilesBelow(full, depth - 1, names));
    else if (names.includes(entry.name.toLowerCase())) out.push(full);
  }
  return out;
}

export function classifySource(value) {
  const lower = String(value).toLowerCase();
  if (lower.includes("nvm")) return "nvm";
  if (lower.includes("volta")) return "volta";
  if (lower.includes("fnm")) return "fnm";
  if (lower.includes("mise")) return "mise";
  if (lower.includes("pyenv")) return "pyenv";
  if (lower.includes("uv")) return "uv";
  if (lower.includes("homebrew")) return "homebrew";
  if (lower.includes("programs\\python")) return "python-org";
  if (lower.includes("program files") || lower.startsWith("/usr/") || lower.startsWith("/opt/")) return "system";
  return "path";
}

export function classifyScope(value, home = os.homedir()) {
  return pathIsWithin(home, value) ? "user" : "host";
}

export function displayPath(value, options = {}) {
  if (!value) return "";
  if (options.showPaths) return path.normalize(value);
  const home = options.home || os.homedir();
  const normalized = path.normalize(value);
  return pathIsWithin(home, normalized) ? `$HOME${normalized.slice(path.normalize(home).length)}` : normalized;
}

export function pathIsWithin(root, value) {
  if (!root || !value) return false;
  const relative = path.relative(path.resolve(root), path.resolve(value));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
