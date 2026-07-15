import fs from "node:fs/promises";
import path from "node:path";

const supportedPolicyKeys = new Set([
  "globalInstalls", "intentionalJavaVersions", "intentionalNodeVersions", "intentionalPythonVersions",
  "node", "packageManager", "python", "runtimeChanges"
]);

export async function loadPolicy(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, ".aienvmap", "policy.yml"), "utf8");
    return parseSimplePolicy(raw);
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export function parseSimplePolicy(raw) {
  const policy = {};
  for (const [index, line] of String(raw).split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z][\w-]*)\s*:\s*(.+)$/);
    if (!match) throw policyError(`policy.yml contains invalid syntax on line ${index + 1}`, index + 1);
    const key = normalizeKey(match[1]);
    if (!supportedPolicyKeys.has(key)) throw policyError(`policy.yml contains unsupported key on line ${index + 1}`, index + 1);
    if (Object.hasOwn(policy, key)) throw policyError(`policy.yml contains duplicate key on line ${index + 1}`, index + 1);
    policy[key] = unquote(match[2].trim());
  }
  return policy;
}

export function policyWarnings(manifest, policy = {}) {
  const warnings = [];
  if (policy.node) {
    compareVersionPolicy(warnings, "node", policy.node, manifest.runtimes?.node, ".aienvmap/policy.yml");
    compareVersionPolicy(warnings, ".nvmrc", policy.node, manifest.projectHints?.nvmrc, ".aienvmap/policy.yml");
  }
  if (policy.python) {
    const py = manifest.runtimes?.python || manifest.runtimes?.python3;
    compareVersionPolicy(warnings, "python", policy.python, py, ".aienvmap/policy.yml");
    compareVersionPolicy(warnings, ".python-version", policy.python, manifest.projectHints?.pythonVersion, ".aienvmap/policy.yml");
  }
  if (policy.packageManager) {
    const locks = lockManagers(manifest.projectHints || {});
    if (locks.length && !locks.includes(policy.packageManager)) {
      warnings.push({
        code: "package-manager-policy-mismatch",
        message: `Policy requires ${policy.packageManager}, but detected lockfile(s) for ${locks.join(", ")}.`
      });
    }
  }
  return warnings;
}

export function intentionalRuntimeVersions(policy = {}, runtime) {
  const key = `intentional${String(runtime || "").replace(/^./, (value) => value.toUpperCase())}Versions`;
  return [...new Set(String(policy[key] || "").split(",").map((value) => value.trim().replace(/^v/, "")).filter((value) => /^\d+(?:\.\d+){0,2}$/.test(value)))].sort();
}

export function runtimeVersionsMatchIntentionalPolicy(installations = [], policy = {}, runtime) {
  const allowed = intentionalRuntimeVersions(policy, runtime);
  const detected = [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => String(item.runtimeVersion || item.version || "").replace(/^v/, "")).filter(Boolean))].sort();
  return allowed.length > 1 && detected.length > 1 && detected.every((version) => allowed.some((expected) => version === expected || version.startsWith(`${expected}.`)));
}

function compareVersionPolicy(warnings, target, expected, actual, source) {
  if (!actual) return;
  const expectedVersion = String(expected).replace(/^v/, "");
  const actualVersion = String(actual).replace(/^v/, "");
  if (!actualVersion.startsWith(expectedVersion)) {
    warnings.push({
      code: "policy-version-mismatch",
      message: `${source} requires ${target} ${expectedVersion}, but detected ${actualVersion}.`
    });
  }
}

function lockManagers(hints) {
  const managers = [];
  if (hints.packageLock) managers.push("npm");
  if (hints.pnpmLock) managers.push("pnpm");
  if (hints.yarnLock) managers.push("yarn");
  return managers;
}

function normalizeKey(key) {
  return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}

function policyError(message, line) {
  const error = new Error(message);
  error.code = "AIENVMAP_INVALID_POLICY";
  error.line = line;
  return error;
}
