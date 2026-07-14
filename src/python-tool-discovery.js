import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exists } from "./fsutil.js";
import { firstVersion, portableCommandResult } from "./shell.js";
import { classifyScope, classifySource, displayPath, namedFilesBelow, pathEntries } from "./path-evidence.js";

const pythonToolNames = process.platform === "win32" ? { uv: ["uv.exe"], pipx: ["pipx.exe"] } : { uv: ["uv"], pipx: ["pipx"] };

export async function findPythonToolCandidates(options = {}) {
  const found = [];
  const seen = new Set();
  const home = options.home || os.homedir();
  const env = options.env || process.env;
  const add = async (tool, file, discovery = "PATH") => {
    if (!(await exists(file))) return;
    let key = `${tool}:${path.resolve(file).toLowerCase()}`;
    try { key = `${tool}:${(await fs.realpath(file)).toLowerCase()}`; } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    const dir = path.dirname(file);
    found.push({ tool, path: path.resolve(file), source: classifySource(dir), scope: classifyScope(dir, home), discovery });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) for (const [tool, names] of Object.entries(pythonToolNames)) for (const name of names) await add(tool, path.join(dir, name));
  const userBins = process.platform === "win32" ? [path.join(env.USERPROFILE || home, ".local", "bin"), path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "Python", "Scripts")] : [path.join(home, ".local", "bin")];
  for (const dir of userBins) for (const [tool, names] of Object.entries(pythonToolNames)) for (const name of names) await add(tool, path.join(dir, name), "known-user-bin");
  if (process.platform === "win32") {
    const pythonUserRoot = path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "Python");
    const allNames = Object.values(pythonToolNames).flat();
    for (const file of await namedFilesBelow(pythonUserRoot, 3, allNames)) {
      const tool = Object.entries(pythonToolNames).find(([, names]) => names.includes(path.basename(file).toLowerCase()))?.[0];
      if (tool) await add(tool, file, "known-user-python-scripts");
    }
  }
  return found;
}

export async function inspectPythonToolCandidates(candidates = [], pipCommands = [], options = {}) {
  const inspected = await Promise.all(candidates.map(async (candidate) => {
    if (options.executeCandidates === false) {
      const shown = displayPath(candidate.path, options);
      return { tool: candidate.tool, version: "unverified-no-exec", versionVerified: false, path: shown, source: candidate.source, scope: candidate.scope, discovery: candidate.discovery, routingEvidence: "unverified-no-exec", ownershipProven: false, removalAuthorized: false, evidence: "file-presence-only" };
    }
    const result = await portableCommandResult(candidate.path, ["--version"], { timeout: 3500, platform: options.platform || process.platform });
    const version = result.ok ? firstVersion(`${result.stdout}\n${result.stderr}`) : null;
    const shown = displayPath(candidate.path, options);
    if (!version) return {
      tool: candidate.tool,
      version: "unverified-probe-failed",
      versionVerified: false,
      path: shown,
      source: candidate.source,
      scope: candidate.scope,
      discovery: candidate.discovery,
      routingEvidence: "unverified-probe-failed",
      ownershipProven: false,
      removalAuthorized: false,
      evidence: "probe-failed",
      probe: { status: "failed", reason: result.failure || "version-not-recognized" }
    };
    const pipDirs = new Set(pipCommands.map((item) => path.dirname(item.path).toLowerCase()));
    return { tool: candidate.tool, version, path: shown, source: candidate.source, scope: candidate.scope, discovery: candidate.discovery, routingEvidence: pipDirs.has(path.dirname(shown).toLowerCase()) ? "co-located-with-pip" : "standalone-or-unknown", ownershipProven: false, removalAuthorized: false };
  }));
  return Object.fromEntries(["uv", "pipx"].map((tool) => {
    const installations = inspected.filter((item) => item?.tool === tool).map((item, index) => ({ ...item, active: options.executeCandidates === false ? false : index === 0 }));
    return [tool, { installations, active: installations[0] || null, distinctVersions: [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => item.version))] }];
  }));
}

export async function findCondaCandidates(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  const names = platform === "win32" ? ["conda.exe", "conda.bat"] : ["conda"];
  const found = [];
  const seen = new Set();
  const add = async (file, discovery) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    const dir = path.dirname(file);
    found.push({ path: path.resolve(file), source: classifySource(dir), scope: classifyScope(dir, home), discovery });
  };
  if (env.CONDA_EXE) await add(env.CONDA_EXE, "CONDA_EXE");
  for (const dir of pathEntries(options.pathValue ?? env.PATH)) for (const name of names) await add(path.join(dir, name), "PATH");
  for (const root of ["miniconda3", "anaconda3", "miniforge3", "mambaforge"]) {
    const base = path.join(home, root);
    for (const name of names) await add(platform === "win32" ? path.join(base, "Scripts", name) : path.join(base, "bin", name), "known-user-root");
  }
  return found;
}

export async function inspectCondaCandidates(candidates = [], options = {}) {
  const installations = [];
  for (const candidate of candidates.slice(0, 20)) {
    if (options.executeCandidates === false) {
      installations.push({ manager: "conda", version: "unverified-no-exec", versionVerified: false, path: displayPath(candidate.path, options), source: candidate.source, scope: candidate.scope, discovery: candidate.discovery, environmentEvidence: { collection: "not-requested", count: 0, activePrefix: "", prefixes: [], truncated: false }, ownershipProven: false, removalAuthorized: false, active: false, evidence: "file-presence-only" });
      continue;
    }
    const versionResult = await portableCommandResult(candidate.path, ["--version"], { timeout: 4000, platform: options.platform || process.platform });
    const version = versionResult.ok ? firstVersion(`${versionResult.stdout}\n${versionResult.stderr}`) : null;
    if (!version) {
      installations.push({
        manager: "conda", version: "unverified-probe-failed", versionVerified: false,
        path: displayPath(candidate.path, options), source: candidate.source, scope: candidate.scope, discovery: candidate.discovery,
        environmentEvidence: { collection: "probe-failed", count: 0, activePrefix: "", prefixes: [], truncated: false },
        ownershipProven: false, removalAuthorized: false, active: installations.length === 0,
        evidence: "probe-failed", probe: { status: "failed", reason: versionResult.failure || "version-not-recognized" }
      });
      continue;
    }
    let environmentEvidence = { collection: options.fullPackages ? "unsupported-or-failed" : "not-requested", count: 0, activePrefix: "", prefixes: [], truncated: false };
    if (options.fullPackages) {
      const envResult = await portableCommandResult(candidate.path, ["info", "--envs", "--json"], { timeout: 8000, maxBuffer: 2 * 1024 * 1024, platform: options.platform || process.platform });
      environmentEvidence = parseCondaEnvironmentInfo(envResult.ok ? envResult.stdout : "", options);
    }
    installations.push({ manager: "conda", version, path: displayPath(candidate.path, options), source: candidate.source, scope: candidate.scope, discovery: candidate.discovery, environmentEvidence, ownershipProven: false, removalAuthorized: false, active: installations.length === 0 });
  }
  return { installations, active: installations[0] || null, distinctVersions: [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => item.version))], collection: options.fullPackages ? "environment-summary-requested" : "version-only" };
}

export function parseCondaEnvironmentInfo(raw, options = {}) {
  let value;
  try { value = JSON.parse(String(raw || "")); } catch { return { collection: "unsupported-or-failed", count: 0, activePrefix: "", prefixes: [], truncated: false }; }
  const all = Array.isArray(value.envs) ? value.envs.filter((item) => typeof item === "string").slice(0, 501) : [];
  return { collection: "collected", count: Math.min(all.length, 500), activePrefix: displayPath(value.active_prefix || "", options), prefixes: all.slice(0, 500).map((item) => displayPath(item, options)), truncated: all.length > 500, semantics: "Environment paths only; packages, channels, credentials, and tokens are not collected." };
}
