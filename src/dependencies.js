import fs from "node:fs/promises";
import path from "node:path";
import { exists, readJson } from "./fsutil.js";

const NODE_GROUPS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const LOCKFILE_CANDIDATES = [
  { file: "package-lock.json", ecosystem: "npm", manager: "npm" },
  { file: "npm-shrinkwrap.json", ecosystem: "npm", manager: "npm" },
  { file: "pnpm-lock.yaml", ecosystem: "npm", manager: "pnpm" },
  { file: "yarn.lock", ecosystem: "npm", manager: "yarn" },
  { file: "bun.lockb", ecosystem: "npm", manager: "bun" },
  { file: "uv.lock", ecosystem: "python", manager: "uv" },
  { file: "poetry.lock", ecosystem: "python", manager: "poetry" },
  { file: "Pipfile.lock", ecosystem: "python", manager: "pipenv" }
];

export async function scanDependencySnapshot(dir) {
  const node = await scanNodeDependencies(dir);
  const python = await scanPythonDependencies(dir);
  const packages = [...node.packages, ...python.packages];
  const manifests = [...node.manifests, ...python.manifests];
  const lockfiles = await scanDependencyLockfiles(dir);
  return {
    mode: "snapshot",
    enabled: true,
    note: "Read-only dependency snapshot from project files. It does not install, update, or resolve packages.",
    manifests,
    lockfiles,
    summary: {
      ecosystems: [...new Set(packages.map((pkg) => pkg.ecosystem))],
      manifests: manifests.length,
      lockfiles: lockfiles.length,
      packages: packages.length
    },
    packages: packages.slice(0, 80)
  };
}

export function linkVulnerableDependencies(security = {}, snapshot = {}) {
  const dependencyIndex = new Map((snapshot.packages || []).map((pkg) => [dependencyKey(pkg.ecosystem, pkg.name), pkg]));
  return {
    ...security,
    topPackages: (security.topPackages || []).map((pkg) => {
      const dependency = dependencyIndex.get(dependencyKey(scannerEcosystem(pkg.scanner), pkg.name));
      const directDependency = Boolean(dependency);
      return {
        ...pkg,
        directDependency,
        dependency: dependency ? {
          ecosystem: dependency.ecosystem,
          manifest: dependency.manifest,
          group: dependency.group,
          version: dependency.version
        } : null,
        remediationPriority: remediationPriority(pkg, { directDependency })
      };
    })
  };
}

export function buildLightSbom(snapshot = {}, security = {}) {
  const packages = snapshot.packages || [];
  const vulnerable = security.topPackages || [];
  const directVulnerable = vulnerable.filter((pkg) => pkg.directDependency === true);
  const transitiveOrUnmatched = vulnerable.filter((pkg) => pkg.directDependency !== true);
  const topRisk = vulnerable.slice(0, 8).map((pkg) => ({
    name: pkg.name,
    ecosystem: scannerEcosystem(pkg.scanner),
    severity: pkg.severity || "unknown",
    directDependency: pkg.directDependency === true,
    manifest: pkg.dependency?.manifest || "",
    version: pkg.dependency?.version || pkg.version || "",
    priority: pkg.remediationPriority?.level || "low",
    score: pkg.remediationPriority?.score || 0,
    fixAvailable: pkg.fixAvailable === true || Boolean(pkg.fixVersions?.length),
    fixVersions: (pkg.fixVersions || []).slice(0, 3)
  }));
  const riskSummary = lightSbomRiskSummary({ packages, security, directVulnerable, transitiveOrUnmatched, topRisk, lockfiles: snapshot.lockfiles || [] });
  const pmPolicy = packageManagerPolicy(snapshot.lockfiles || []);
  const changeHints = dependencyChangeHints(packages, topRisk, snapshot.lockfiles || []);
  return {
    schemaVersion: 1,
    mode: "light-sbom",
    note: "AI-ready package and vulnerability summary from read-only project files and optional scanners.",
    source: {
      dependencies: "project manifests",
      lockfiles: "file presence only",
      vulnerabilities: security.enabled ? "optional scanner summary" : "not scanned",
      resolver: "not run"
    },
    confidence: {
      directDependencies: "high",
      lockfileManager: snapshot.lockfiles?.length ? "medium" : "none",
      transitiveDependencies: "not-resolved",
      vulnerabilities: security.enabled ? "scanner-provided" : "not-scanned"
    },
    limitations: [
      "Does not install packages.",
      "Does not resolve full transitive dependency graphs.",
      "Does not replace CycloneDX, SPDX, Syft, Trivy, npm audit, or pip-audit outputs."
    ],
    summary: {
      ecosystems: countBy(packages, "ecosystem"),
      managers: countBy(packages, "manager"),
      groups: countBy(packages, "group"),
      manifests: snapshot.manifests || [],
      lockfiles: snapshot.lockfiles || [],
      packages: packages.length,
      vulnerabilities: Number(security.summary?.total || 0),
      directVulnerablePackages: directVulnerable.length,
      transitiveOrUnmatchedVulnerablePackages: transitiveOrUnmatched.length
    },
    topRisk,
    riskSummary,
    packageManagerPolicy: pmPolicy,
    dependencyChangeHints: changeHints,
    aiDependencyReview: aiDependencyReview({ riskSummary, packageManagerPolicy: pmPolicy, security }),
    aiUse: {
      beforeDependencyChanges: "Read lightSbom.summary and lightSbom.topRisk before changing dependencies.",
      securityMode: security.enabled ? "scanner-summary" : "scanner-off",
      dependencySource: "project manifests only; no install or resolver is run",
      trustRule: "Use lightSbom as a fast AI planning map; verify with dedicated scanners before security claims."
    }
  };
}

function aiDependencyReview({ riskSummary = {}, packageManagerPolicy = {}, security = {} } = {}) {
  const review = ["urgent", "high", "medium"].includes(riskSummary.level) || packageManagerPolicy.status === "review-required";
  const scannerOff = security.enabled !== true;
  return {
    status: review ? "review" : "ready",
    statusReason: review
      ? "SBOM risk or package manager policy requires dependency review before changes."
      : scannerOff
        ? "No scanned vulnerability finding is present because the security scanner is off; run read-only security scan before security decisions."
        : "No light SBOM signal requires dependency review.",
    securityConfidence: scannerOff ? "scanner-off" : "scanner-summary",
    mode: "advisory",
    readFirst: ["riskSummary", "dependencyChangeHints", "packageManagerPolicy", "topRisk"],
    reviewTargets: riskSummary.reviewTargets || [],
    safeActions: [
      "read SBOM, status, summary, context, and dependency manifests before dependency changes",
      "plan remediation without installing, upgrading, downgrading, or switching package managers",
      "record intent before dependency or lockfile changes when another AI may be working"
    ],
    beforeDependencyChange: [
      "aienvmap sync --security",
      "aienvmap intent --actor agent:id --action dependency-review --target dependency",
      "aienvmap plan --write"
    ],
    afterDependencyChange: [
      "run the narrowest relevant project validation",
      "aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency"
    ],
    rule: review
      ? "Review SBOM risk and package manager policy before dependency changes; default behavior is advisory and non-blocking."
      : "No light SBOM signal requires action; still record intent before dependency or lockfile changes."
  };
}

export function lightSbomRiskSummary({ packages = [], security = {}, directVulnerable = [], transitiveOrUnmatched = [], topRisk = [], lockfiles = [] } = {}) {
  const signals = [];
  let score = 0;
  const critical = Math.max(Number(security.summary?.critical || 0), topRisk.filter((pkg) => pkg.severity === "critical").length);
  const high = Math.max(Number(security.summary?.high || 0), topRisk.filter((pkg) => pkg.severity === "high").length);
  const total = Number(security.summary?.total || 0);
  if (critical > 0) {
    score += 45;
    signals.push(`${critical} critical vulnerability finding(s)`);
  }
  if (high > 0) {
    score += 30;
    signals.push(`${high} high vulnerability finding(s)`);
  }
  if (directVulnerable.length) {
    score += 15;
    signals.push(`${directVulnerable.length} vulnerable direct dependency package(s)`);
  }
  if (transitiveOrUnmatched.length) {
    score += 8;
    signals.push(`${transitiveOrUnmatched.length} vulnerable transitive or unmatched package(s)`);
  }
  if (packageManagerPolicy(lockfiles).status === "review-required") {
    score += 10;
    signals.push("mixed package manager lockfiles");
  }
  if (packages.length && security.enabled !== true) {
    score += 5;
    signals.push("security scanner summary is off");
  }
  const level = score >= 90 ? "urgent" : score >= 60 ? "high" : score >= 30 ? "medium" : score > 0 ? "low" : "clear";
  const reviewTargets = [
    ...new Set([
      ...topRisk.map((pkg) => pkg.manifest).filter(Boolean),
      ...topRisk.map((pkg) => pkg.name).filter(Boolean).slice(0, 5)
    ])
  ].slice(0, 8);
  return {
    level,
    score,
    signals,
    scanner: security.enabled ? "enabled" : "off",
    vulnerabilityCount: total,
    directVulnerablePackages: directVulnerable.length,
    reviewTargets,
    next: riskNext(level, security.enabled, topRisk),
    commands: riskCommands(level, security.enabled)
  };
}

function riskNext(level, securityEnabled, topRisk = []) {
  if (!securityEnabled) return "Run read-only security scan before dependency or release decisions.";
  if (level === "urgent" || level === "high") return "Review dependency read set and topRisk before remediation; do not auto-fix without user approval.";
  if (topRisk.length) return "Review topRisk packages before dependency changes.";
  return "No SBOM risk signal requires action in the lightweight snapshot.";
}

function riskCommands(level, securityEnabled) {
  const commands = [];
  if (!securityEnabled) commands.push("aienvmap sync --security");
  if (["urgent", "high", "medium"].includes(level)) {
    commands.push("aienvmap intent --actor agent:id --action dependency-review --target dependency");
    commands.push("aienvmap plan --write");
  }
  commands.push("aienvmap checkpoint --actor agent:id --summary dependency-review --target dependency");
  return commands;
}

function packageManagerPolicy(lockfiles = []) {
  const byEcosystem = {};
  for (const lockfile of lockfiles) {
    const ecosystem = lockfile.ecosystem || "unknown";
    const managers = byEcosystem[ecosystem]?.managers || new Set();
    managers.add(lockfile.manager || "unknown");
    byEcosystem[ecosystem] = {
      ecosystem,
      managers,
      lockfiles: [...(byEcosystem[ecosystem]?.lockfiles || []), lockfile.file]
    };
  }
  const ecosystems = Object.fromEntries(Object.entries(byEcosystem).map(([name, value]) => {
    const managers = [...value.managers].sort();
    return [name, {
      managers,
      lockfiles: value.lockfiles.sort(),
      status: managers.length > 1 ? "mixed-lockfiles" : "single-manager",
      recommendedManager: managers[0] || "not-detected",
      guidance: managers.length > 1
        ? "Review with the user before dependency changes; multiple package manager lockfiles are present."
        : "Use the detected package manager for dependency changes unless the user says otherwise."
    }];
  }));
  return {
    status: Object.keys(ecosystems).length === 0
      ? "no-lockfile"
      : Object.values(ecosystems).some((item) => item.status === "mixed-lockfiles") ? "review-required" : "clear",
    ecosystems,
    guidance: Object.keys(ecosystems).length === 0
      ? "No lockfile detected; avoid creating one with an unexpected package manager without user approval."
      : "Preserve existing lockfile and package manager choices during dependency changes."
  };
}

function dependencyChangeHints(packages = [], topRisk = [], lockfiles = []) {
  const byManifest = new Map();
  for (const pkg of packages) {
    const key = pkg.manifest || "unknown";
    const entry = byManifest.get(key) || {
      manifest: key,
      ecosystem: pkg.ecosystem || "unknown",
      manager: pkg.manager || "unknown",
      groups: new Set(),
      packages: 0,
      riskPackages: []
    };
    entry.groups.add(pkg.group || "unknown");
    entry.packages += 1;
    byManifest.set(key, entry);
  }
  for (const risk of topRisk) {
    if (!risk.manifest || !byManifest.has(risk.manifest)) continue;
    byManifest.get(risk.manifest).riskPackages.push({
      name: risk.name,
      severity: risk.severity,
      priority: risk.priority,
      fixAvailable: risk.fixAvailable
    });
  }
  return [...byManifest.values()].map((entry) => ({
    manifest: entry.manifest,
    ecosystem: entry.ecosystem,
    manager: entry.manager,
    groups: [...entry.groups].sort(),
    packages: entry.packages,
    riskPackages: entry.riskPackages.slice(0, 5),
    lockfiles: lockfilesForEntry(entry, lockfiles),
    beforeChange: [
      `Read ${entry.manifest} and the active package manager policy before editing dependencies.`,
      lockfilesForEntry(entry, lockfiles).length
        ? `Preserve related lockfiles: ${lockfilesForEntry(entry, lockfiles).map((item) => item.file).join(", ")}.`
        : "No related lockfile was detected; do not create one with a different package manager without approval.",
      "Record an intent before dependency or lockfile changes when another AI may be working."
    ],
    afterChange: [
      "Run project tests or the narrowest relevant validation.",
      "Run aienvmap checkpoint --actor agent:id --summary dependency-change --target dependency."
    ]
  }));
}

async function scanDependencyLockfiles(dir) {
  const found = [];
  for (const item of LOCKFILE_CANDIDATES) {
    if (await exists(path.join(dir, item.file))) found.push(item);
  }
  return found;
}

function lockfilesForEntry(entry, lockfiles = []) {
  return lockfiles.filter((lockfile) => lockfile.ecosystem === entry.ecosystem);
}

export function remediationPriority(pkg = {}, context = {}) {
  const severityScore = { critical: 90, high: 70, moderate: 45, low: 20, info: 5, unknown: 30 };
  const severity = String(pkg.severity || "unknown").toLowerCase();
  const reasons = [`severity:${severity}`];
  let score = severityScore[severity] ?? severityScore.unknown;
  if (context.directDependency) {
    score += 15;
    reasons.push("direct-dependency");
  } else {
    reasons.push("not-direct-in-snapshot");
  }
  if (pkg.fixAvailable === true || (Array.isArray(pkg.fixVersions) && pkg.fixVersions.length)) {
    score += 5;
    reasons.push("fix-available");
  } else {
    reasons.push("fix-review-needed");
  }
  const level = score >= 95 ? "urgent" : score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  return { level, score, reasons };
}

function countBy(items = [], key) {
  return Object.fromEntries(Object.entries(items.reduce((acc, item) => {
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b)));
}

async function scanNodeDependencies(dir) {
  const file = path.join(dir, "package.json");
  if (!(await exists(file))) return { manifests: [], packages: [] };
  const json = await readJson(file, {});
  const packages = [];
  for (const group of NODE_GROUPS) {
    for (const [name, version] of Object.entries(json[group] || {})) {
      packages.push({
        ecosystem: "npm",
        manager: "npm",
        manifest: "package.json",
        group,
        name,
        version: String(version)
      });
    }
  }
  return { manifests: ["package.json"], packages };
}

async function scanPythonDependencies(dir) {
  const requirements = await scanRequirementsTxt(dir);
  const pyproject = await scanPyproject(dir);
  return {
    manifests: [...requirements.manifests, ...pyproject.manifests],
    packages: [...requirements.packages, ...pyproject.packages]
  };
}

async function scanRequirementsTxt(dir) {
  const file = path.join(dir, "requirements.txt");
  if (!(await exists(file))) return { manifests: [], packages: [] };
  const raw = await fs.readFile(file, "utf8");
  const packages = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .slice(0, 80)
    .map((line) => {
      const parsed = parseRequirementLine(line);
      return {
        ecosystem: "python",
        manager: "pip",
        manifest: "requirements.txt",
        group: "requirements",
        name: parsed.name,
        version: parsed.version
      };
    });
  return { manifests: ["requirements.txt"], packages };
}

async function scanPyproject(dir) {
  const file = path.join(dir, "pyproject.toml");
  if (!(await exists(file))) return { manifests: [], packages: [] };
  const raw = await fs.readFile(file, "utf8");
  const packages = parsePyprojectDependencies(raw).slice(0, 80).map((line) => {
    const parsed = parseRequirementLine(line);
    return {
      ecosystem: "python",
      manager: "pyproject",
      manifest: "pyproject.toml",
      group: "project.dependencies",
      name: parsed.name,
      version: parsed.version
    };
  });
  return { manifests: ["pyproject.toml"], packages };
}

export function parseRequirementLine(line) {
  const cleaned = String(line).split("#")[0].trim();
  const match = cleaned.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
  return {
    name: match?.[1] || cleaned,
    version: (match?.[2] || "unspecified").trim() || "unspecified"
  };
}

function scannerEcosystem(scanner = "") {
  if (String(scanner).includes("pip")) return "python";
  return "npm";
}

function dependencyKey(ecosystem = "", name = "") {
  return `${String(ecosystem).toLowerCase()}:${String(name).toLowerCase()}`;
}

export function parsePyprojectDependencies(raw) {
  const lines = [];
  const match = String(raw).match(/dependencies\s*=\s*\[([\s\S]*?)\]/m);
  if (!match) return lines;
  for (const item of match[1].split(/\r?\n/)) {
    const cleaned = item.trim().replace(/,$/, "").replace(/^["']|["']$/g, "");
    if (cleaned && !cleaned.startsWith("#")) lines.push(cleaned);
  }
  return lines;
}
