import { isStaleTimestamp } from "./trust.js";

export function diagnose(manifest, context = {}) {
  const warnings = [];
  const hints = manifest.projectHints || {};
  const runtimes = manifest.runtimes || {};
  if (hints.nvmrc && runtimes.node && !String(runtimes.node).startsWith(String(hints.nvmrc).replace(/^v/, ""))) {
    warnings.push({
      code: "node-version-mismatch",
      message: `.nvmrc requests ${hints.nvmrc}, but detected node is ${runtimes.node}.`
    });
  }
  const py = runtimes.python || runtimes.python3;
  if (hints.pythonVersion && py && !String(py).startsWith(String(hints.pythonVersion))) {
    warnings.push({
      code: "python-version-mismatch",
      message: `.python-version requests ${hints.pythonVersion}, but detected python is ${py}.`
    });
  }
  const locks = ["packageLock", "pnpmLock", "yarnLock"].filter((key) => hints[key]);
  if (locks.length > 1) {
    warnings.push({
      code: "mixed-node-lockfiles",
      message: `Multiple Node lockfiles detected: ${locks.join(", ")}. Prefer one package manager.`
    });
  }
  if ((hints.pyproject || hints.requirements) && !py) {
    warnings.push({
      code: "python-missing",
      message: "Python project hints detected, but no Python runtime was found."
    });
  }
  if (hints.dockerfile && !manifest.containers?.docker) {
    warnings.push({
      code: "docker-missing",
      message: "Dockerfile detected, but Docker CLI was not found."
    });
  }
  if (isStaleTimestamp(manifest.generatedAt)) {
    warnings.push({
      code: "manifest-stale",
      message: "Environment snapshot is older than 24 hours. Run `aienvmap sync` before changing the environment."
    });
  }
  warnings.push(...securityWarnings(manifest.security));
  warnings.push(...coordinationWarnings(context.intents || []));
  warnings.push(...staleIntentWarnings(context.intents || []));
  warnings.push(...handoffWarnings(context.timeline || []));
  warnings.push(...multiAgentRecordWarnings(context.timeline || []));
  return warnings;
}

export function securityWarnings(security = {}) {
  if (!security.enabled || !security.summary) return [];
  const summary = security.summary;
  if (Number(summary.critical || 0) > 0 || Number(summary.high || 0) > 0) {
    return [{
      code: "security-vulnerabilities",
      message: `Security scan found ${summary.critical || 0} critical and ${summary.high || 0} high vulnerabilities. Review before changing or deploying the environment.`
    }];
  }
  return [];
}

export function coordinationWarnings(intents = []) {
  const warnings = [];
  const byTarget = new Map();
  for (const intent of intents) {
    const target = String(intent.target || inferTarget(intent.action) || "").trim().toLowerCase();
    if (!target) continue;
    const list = byTarget.get(target) || [];
    list.push(intent);
    byTarget.set(target, list);
  }
  for (const [target, list] of byTarget) {
    const actors = new Set(list.map((intent) => intent.actor).filter(Boolean));
    if (list.length > 1 && actors.size > 1) {
      warnings.push({
        code: "conflicting-open-intents",
        target,
        message: `Multiple agents have open environment intents for ${target}. Resolve or coordinate before changing it.`
      });
    }
  }
  return warnings;
}

export function staleIntentWarnings(intents = [], now = new Date(), maxAgeHours = 4) {
  const warnings = [];
  for (const intent of intents) {
    if (!isStaleTimestamp(intent.at, now, maxAgeHours)) continue;
    warnings.push({
      code: "stale-open-intent",
      target: intent.target || inferTarget(intent.action) || "",
      message: `Open intent ${intent.id || ""} from ${intent.actor || "unknown"} is older than ${maxAgeHours} hours. Resolve it or confirm it before environment changes.`.replace(/\s+/g, " ").trim()
    });
  }
  return warnings;
}

export function handoffWarnings(timeline = []) {
  const lastEnvChange = [...timeline].reverse().find(isEnvironmentChange);
  if (!lastEnvChange) return [];
  const lastHandoff = [...timeline].reverse().find((item) => item.type === "agent-handoff");
  if (lastHandoff && new Date(lastHandoff.at).getTime() >= new Date(lastEnvChange.at).getTime()) return [];
  return [{
    code: "handoff-stale",
    message: "Environment changes were recorded after the last AI handoff. Run `aienvmap handoff --record --actor agent:id` before the next agent continues."
  }];
}

export function multiAgentRecordWarnings(timeline = []) {
  const lastHandoffAt = lastTime(timeline, (item) => item.type === "agent-handoff");
  const byTarget = new Map();
  for (const item of timeline) {
    if (!isEnvironmentChange(item)) continue;
    if (lastHandoffAt && timeOf(item) <= lastHandoffAt) continue;
    const actor = String(item.actor || "").trim();
    if (!actor) continue;
    const target = normalizeTarget(item.target || inferTarget(`${item.summary || ""} ${item.action || ""} ${item.change?.key || ""}`) || "environment");
    const list = byTarget.get(target) || [];
    list.push(item);
    byTarget.set(target, list);
  }
  const warnings = [];
  for (const [target, list] of byTarget) {
    const actors = [...new Set(list.map((item) => item.actor).filter(Boolean))];
    if (actors.length < 2) continue;
    warnings.push({
      code: "multi-agent-records",
      target,
      message: `Multiple agents recorded environment changes for ${target} after the last handoff. Run handoff and review follow-ups before continuing.`
    });
  }
  return warnings;
}

function inferTarget(action = "") {
  const normalized = String(action).toLowerCase();
  for (const target of ["dependency", "node", "python", "docker", "npm", "pnpm", "yarn", "uv", "pip", "pipx"]) {
    if (normalized.includes(target)) return target;
  }
  if (normalized.includes("package") || normalized.includes("lockfile") || normalized.includes("vulnerab")) return "dependency";
  return "";
}

function normalizeTarget(target = "") {
  const normalized = String(target).trim().toLowerCase();
  if (["npm", "pnpm", "yarn"].includes(normalized)) return "package-manager";
  if (["pip", "pipx", "uv"].includes(normalized)) return "python";
  return normalized || "environment";
}

function lastTime(items = [], predicate) {
  const item = [...items].reverse().find(predicate);
  return item ? timeOf(item) : 0;
}

function timeOf(item = {}) {
  const value = new Date(item.at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isEnvironmentChange(item = {}) {
  if (["runtime", "package-manager", "container", "dependency"].includes(item.change?.scope)) return true;
  if (item.type === "detected-change") return false;
  const text = `${item.type || ""} ${item.target || ""} ${item.summary || ""} ${item.action || ""} ${item.change?.scope || ""} ${item.change?.key || ""}`.toLowerCase();
  return [
    "dependency",
    "dependencies",
    "package",
    "lockfile",
    "vulnerability",
    "runtime",
    "node",
    "python",
    "docker",
    "package manager",
    "package-manager",
    "npm",
    "pnpm",
    "yarn",
    "uv",
    "pip",
    "pipx",
    "global"
  ].some((token) => text.includes(token));
}
