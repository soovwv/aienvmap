import fs from "node:fs/promises";
import { diagnose } from "../doctor.js";
import { readJson, writeJson } from "../fsutil.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { intentsPath, manifestPath, planJsonPath, planMdPath, timelinePath, workspaceDir } from "../paths.js";
import { renderPlan } from "../render.js";
import { recommendedActions } from "../actions.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { aiDecision } from "../decision.js";
import { enforcementAdvice } from "../enforcement.js";
import { buildPreflight } from "../preflight.js";

export async function planWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const policy = await loadPolicy(dir);
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const plan = buildPlan(manifest, warnings, intents, policy, timeline);

  if (args.write) {
    await writeJson(planJsonPath(dir), plan);
    await fs.writeFile(planMdPath(dir), renderPlan(plan), "utf8");
  }

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(renderPlan(plan));
  }
  return plan;
}

export function buildPlan(manifest, warnings = [], intents = [], policy = {}, timeline = []) {
  const actions = recommendedActions(manifest, { warnings, intents });
  const status = warnings.length || intents.length ? "review-required" : "clear";
  const preflight = buildPreflight(manifest, warnings, intents, timeline);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status,
    aiBootstrap: preflight.aiBootstrap,
    nextSafeCommand: preflight.nextSafeCommand || preflight.nextCommand,
    followUpPlan: preflight.followUpPlan,
    preflight,
    workspace: manifest.workspace || {},
    trust: manifest.trust || {},
    decision: aiDecision(warnings, intents),
    enforcement: enforcementAdvice(warnings),
    policy: {
      node: policy.node || "not set",
      python: policy.python || "not set",
      packageManager: policy.packageManager || "not set",
      runtimeChanges: policy.runtimeChanges || "ask-first",
      globalInstalls: policy.globalInstalls || "ask-first"
    },
    recommendedActions: actions,
    reviewGates: reviewGates(warnings, intents, manifest.security),
    warnings,
    openIntents: intents.slice(-5).reverse(),
    security: {
      mode: manifest.security?.mode || "basic",
      enabled: manifest.security?.enabled === true,
      summary: manifest.security?.summary || { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
      topPackages: manifest.security?.topPackages || []
    },
    remediationSteps: remediationSteps(manifest.security),
    environmentSteps: environmentSteps(warnings),
    notes: [
      "This plan is read-only.",
      "Ask the user before global runtime, package manager, Docker, or global package changes.",
      "Prefer project-local version files and local environments."
    ]
  };
}

export function compactStepSummary(plan = {}) {
  return {
    remediation: (plan.remediationSteps || []).slice(0, 3).map((item) => ({
      package: item.package,
      severity: item.severity,
      priority: item.remediationPriority?.level || "low",
      score: item.remediationPriority?.score || 0,
      fixVersions: (item.fixVersions || []).slice(0, 3),
      advisoryIds: (item.advisories || []).map((advisory) => advisory.id || advisory.title).filter(Boolean).slice(0, 3)
    })),
    environment: (plan.environmentSteps || []).slice(0, 3).map((item) => ({
      code: item.code,
      category: item.category,
      summary: item.summary
    }))
  };
}

function environmentSteps(warnings = []) {
  return warnings
    .filter((warning) => warning.code !== "security-vulnerabilities")
    .slice(0, 8)
    .map((warning) => ({
      code: warning.code,
      category: environmentCategory(warning.code),
      summary: warning.message,
      steps: environmentStepLines(warning.code)
    }));
}

function environmentCategory(code = "") {
  if (["conflicting-open-intents", "stale-open-intent", "expired-intent-lease", "handoff-stale", "multi-agent-records"].includes(code)) return "coordination";
  if (code.includes("docker")) return "container";
  if (code.includes("lockfile") || code.includes("package-manager")) return "package-manager";
  if (code.includes("node") || code.includes("python") || code.includes("version") || code.includes("runtime")) return "runtime";
  return "environment";
}

function environmentStepLines(code = "") {
  if (code === "node-version-mismatch") return [
    "Read .nvmrc and the detected Node version before changing tools.",
    "Prefer project-local version managers such as nvm, mise, or asdf.",
    "Ask before changing global Node or npm installations.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target node after alignment."
  ];
  if (code === "python-version-mismatch") return [
    "Read .python-version and the detected Python version before changing tools.",
    "Prefer project-local virtual environments or version managers.",
    "Ask before changing global Python installations.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target python after alignment."
  ];
  if (code === "mixed-node-lockfiles" || code === "package-manager-policy-mismatch") return [
    "Identify the intended package manager from project policy and lockfiles.",
    "Do not delete lockfiles without user approval.",
    "Use one package manager for dependency changes.",
    "Record the chosen package manager policy if it changes."
  ];
  if (code === "python-missing") return [
    "Confirm whether the Python project is active.",
    "Prefer project-local Python setup before global installation.",
    "Ask before installing a global Python runtime.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target python after setup."
  ];
  if (code === "docker-missing") return [
    "Confirm whether Docker is required for the current task.",
    "Do not change Docker daemon or context without user approval.",
    "Document fallback commands if Docker is unavailable.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target docker after Docker availability changes."
  ];
  if (code === "manifest-stale") return [
    "Run aienvmap sync before environment changes.",
    "Review context again after refresh."
  ];
  if (code === "conflicting-open-intents") return [
    "Review open intents before changing the environment.",
    "Coordinate with the user or other agent.",
    "Resolve stale or superseded intents before proceeding."
  ];
  if (code === "stale-open-intent") return [
    "Confirm whether the old intent is still valid.",
    "Resolve or renew the intent before changing the environment."
  ];
  if (code === "expired-intent-lease") return [
    "Confirm whether the owning AI session is still active.",
    "Resolve the old intent or record a new leased intent after review.",
    "Do not treat lease expiry as permission to change the environment."
  ];
  if (code === "handoff-stale") return [
    "Run aienvmap handoff --record --actor agent:id before the next AI continues.",
    "Review recent changes before new environment work."
  ];
  if (code === "multi-agent-records") return [
    "Review agentActivity and recent timeline records for the shared target.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target environment before more environment work."
  ];
  return [
    "Review the warning before changing environment state.",
    "Ask before global environment changes.",
    "Run aienvmap checkpoint --actor agent:id --summary what-changed --target environment after any accepted change."
  ];
}

function remediationSteps(security = {}) {
  if (!security.enabled) return [];
  return (security.topPackages || []).slice(0, 8).map((pkg) => {
    const fixVersions = Array.isArray(pkg.fixVersions) ? pkg.fixVersions.slice(0, 5) : [];
    const advisories = Array.isArray(pkg.advisories)
      ? pkg.advisories.map((item) => ({
        id: item.id || "",
        title: item.title || "",
        url: item.url || "",
        severity: item.severity || pkg.severity || "unknown"
      })).slice(0, 5)
      : [];
    return {
      package: pkg.name,
      scanner: pkg.scanner || "unknown",
      severity: pkg.severity || "unknown",
      remediationPriority: pkg.remediationPriority || { level: "low", score: 0, reasons: [] },
      directDependency: pkg.directDependency === true,
      dependency: pkg.dependency || null,
      fixAvailable: pkg.fixAvailable === true,
      fixVersions,
      advisories,
      steps: [
        "Review the package changelog and advisory details.",
        fixVersions.length ? `Prefer an upgrade path to ${fixVersions.join(", ")} if compatible.` : "Identify a compatible patched version before changing dependencies.",
        "Run project tests after dependency changes.",
        "Record the environment or dependency change with aienvmap record."
      ]
    };
  });
}

function reviewGates(warnings, intents, security = {}) {
  const gates = [];
  if (warnings.length) gates.push("Review warnings before changing the environment.");
  if (intents.length) gates.push("Resolve or coordinate open intents before overlapping environment changes.");
  const summary = security.summary || {};
  if (security.enabled && (Number(summary.critical || 0) > 0 || Number(summary.high || 0) > 0)) {
    gates.push("Review high or critical vulnerability remediation before dependency or deployment changes.");
  }
  if (!gates.length) gates.push("No blocking gates detected; continue project-local work and record intent before environment changes.");
  return gates;
}
