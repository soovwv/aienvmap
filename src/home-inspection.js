import fs from "node:fs/promises";
import path from "node:path";
import { inspectPackageManagers } from "./package-managers.js";
import { buildPortableReconciliation, validatePortableReconciliation } from "./portable-reconcile.js";

export const maximumInspectedHomes = 8;

export async function resolveInspectedHome(value) {
  if (!value || value === true) throw new Error("--inspect-home requires an absolute existing directory");
  const requested = path.normalize(String(value));
  if (!path.isAbsolute(requested)) throw new Error("--inspect-home requires an absolute existing directory");
  let stat;
  let canonical;
  try {
    [stat, canonical] = await Promise.all([fs.stat(requested), fs.realpath(requested)]);
  } catch {
    throw new Error("--inspect-home requires an absolute existing directory");
  }
  if (!stat.isDirectory()) throw new Error("--inspect-home requires an absolute existing directory");
  return path.normalize(canonical);
}

export function isolatedHomeEnvironment(home, env = process.env) {
  const next = { ...env, HOME: home, USERPROFILE: home };
  for (const key of ["NVM_HOME", "NVM_SYMLINK", "NVM_DIR", "FNM_DIR", "MISE_INSTALLS_DIR", "PYENV_ROOT", "CONDA_EXE", "CONDA_PREFIX", "SDKMAN_DIR", "JENV_ROOT", "UV_PYTHON_INSTALL_DIR", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"]) delete next[key];
  if (process.platform === "win32") {
    next.APPDATA = path.join(home, "AppData", "Roaming");
    next.LOCALAPPDATA = path.join(home, "AppData", "Local");
  }
  return next;
}

export async function inspectExplicitHome(projectDir, home) {
  return inspectPackageManagers(projectDir, {
    showPaths: false,
    fullPackages: false,
    quick: true,
    home,
    env: isolatedHomeEnvironment(home),
    pathValue: "",
    inspectedHome: true,
    executeCandidates: false
  });
}

export async function readHomesManifest(file) {
  let value;
  try { value = JSON.parse(await fs.readFile(file, "utf8")); } catch { throw new Error("--inspect-homes requires a valid aienvmap.inspect-homes v1 JSON manifest"); }
  if (value?.schemaName !== "aienvmap.inspect-homes" || value?.schemaVersion !== 1 || !Array.isArray(value.homes)) throw new Error("--inspect-homes requires a valid aienvmap.inspect-homes v1 JSON manifest");
  if (!value.homes.length || value.homes.length > maximumInspectedHomes) throw new Error(`--inspect-homes requires 1 to ${maximumInspectedHomes} explicit home entries`);
  const aliases = new Set();
  const canonicalHomes = new Set();
  const homes = [];
  for (const entry of value.homes) {
    const alias = String(entry?.alias || "");
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(alias)) throw new Error("each inspected home alias must match ^[a-z][a-z0-9_-]{0,31}$");
    if (aliases.has(alias)) throw new Error(`duplicate inspected home alias: ${alias}`);
    const home = await resolveInspectedHome(entry?.home);
    const key = process.platform === "win32" ? home.toLowerCase() : home;
    if (canonicalHomes.has(key)) throw new Error("duplicate canonical home in --inspect-homes manifest");
    aliases.add(alias);
    canonicalHomes.add(key);
    homes.push({ alias, home });
  }
  return homes;
}

export async function inspectHomes(projectDir, homes) {
  const entries = [];
  for (const item of homes) {
    const raw = await inspectExplicitHome(projectDir, item.home);
    entries.push({ alias: item.alias, evidence: buildPortableReconciliation(raw, { sourceMode: "administrator-manifest-no-exec" }) });
  }
  return {
    schemaName: "aienvmap.reconcile-homes",
    schemaVersion: 1,
    mode: "sequential-read-only-no-exec",
    scope: "explicit-bounded-user-homes+visible-host",
    entryCount: entries.length,
    entries,
    privacy: { manifestPathIncluded: false, homePathsIncluded: false, aliasesAreOperatorProvided: true, warning: "Use non-identifying aliases and review retained platform, architecture, source, finding, and fingerprint evidence before sharing." },
    environmentChangesAuthorized: false,
    removalAuthorized: false,
    nextSafeAction: "Save this aggregate, extract one alias with --home-evidence <aggregate.json> --alias <alias>, give its evidence.nextSafeCommand to the owning user, then compare reviewed reports with --owner-verification.",
    rule: `Only ${maximumInspectedHomes} explicit readable homes are accepted; system users are never enumerated and discovered executables are never invoked.`
  };
}

export async function readHomeEvidence(file, aliasValue) {
  const alias = String(aliasValue || "");
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(alias)) throw new Error("--alias must match ^[a-z][a-z0-9_-]{0,31}$");
  let value;
  try { value = JSON.parse(await fs.readFile(file, "utf8")); } catch { throw new Error("--home-evidence requires a valid aienvmap.reconcile-homes v1 JSON artifact"); }
  if (value?.schemaName !== "aienvmap.reconcile-homes" || value?.schemaVersion !== 1 || !Array.isArray(value.entries)) throw new Error("--home-evidence requires a valid aienvmap.reconcile-homes v1 JSON artifact");
  const matches = value.entries.filter((entry) => entry?.alias === alias);
  if (matches.length !== 1) throw new Error(`--home-evidence requires exactly one entry for alias: ${alias}`);
  validatePortableReconciliation(matches[0].evidence);
  return matches[0].evidence;
}
