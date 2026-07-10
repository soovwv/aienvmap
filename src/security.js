import { exists } from "./fsutil.js";
import { commandResult } from "./shell.js";
import path from "node:path";

const SEVERITIES = ["critical", "high", "moderate", "low", "info"];

export async function scanSecurity(dir, options = {}) {
  if (!options.security) {
    return {
      mode: "basic",
      enabled: false,
      note: "Run `aienvmap sync --security` to collect read-only vulnerability summaries."
    };
  }

  const npmAudit = await scanNpmAudit(dir);
  const pipAudit = await scanPipAudit(dir);
  const scanners = { npmAudit, pipAudit };
  return {
    mode: "security",
    enabled: true,
    note: "Read-only vulnerability summary. Use for review and CI policy, not automatic fixes.",
    scanners,
    summary: summarizeScanners(scanners),
    topPackages: topVulnerablePackages(scanners)
  };
}

export async function scanNpmAudit(dir) {
  const hasPackageJson = await exists(path.join(dir, "package.json"));
  if (!hasPackageJson) return unavailable("npm-audit", "package.json not found");

  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = await commandResult(command, ["audit", "--json"], {
    cwd: dir,
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024
  });
  const parsed = parseNpmAudit(result.stdout);
  if (!parsed.available) {
    return unavailable("npm-audit", result.stderr || "npm audit did not return parseable JSON");
  }
  return {
    scanner: "npm-audit",
    available: true,
    ok: result.ok,
    exitCode: result.code,
    summary: parsed.summary,
    vulnerablePackages: parsed.vulnerablePackages
  };
}

export async function scanPipAudit(dir) {
  const hasPythonHints = await exists(path.join(dir, "pyproject.toml")) || await exists(path.join(dir, "requirements.txt"));
  if (!hasPythonHints) return unavailable("pip-audit", "Python project hints not found");

  const result = await commandResult("pip-audit", ["-f", "json"], {
    cwd: dir,
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024
  });
  const parsed = parsePipAudit(result.stdout);
  if (!parsed.available) {
    return unavailable("pip-audit", result.stderr || "pip-audit did not return parseable JSON");
  }
  return {
    scanner: "pip-audit",
    available: true,
    ok: result.ok,
    exitCode: result.code,
    summary: parsed.summary,
    vulnerablePackages: parsed.vulnerablePackages
  };
}

export function parseNpmAudit(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    const metadata = parsed.metadata || {};
    const vulnerabilities = parsed.vulnerabilities || {};
    const severityCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, Number(metadata.vulnerabilities?.[severity] || 0)]));
    const total = Number(metadata.vulnerabilities?.total || Object.values(severityCounts).reduce((sum, value) => sum + value, 0));
    const vulnerablePackages = Object.entries(vulnerabilities).slice(0, 20).map(([name, value]) => {
      const fixVersions = npmFixVersions(value.fixAvailable);
      const advisories = npmAdvisories(value.via);
      return {
        name,
        severity: value.severity || "unknown",
        viaCount: Array.isArray(value.via) ? value.via.length : 0,
        fixAvailable: hasFixAvailable(value.fixAvailable),
        fixVersions,
        advisories
      };
    });
    return {
      available: true,
      summary: { total, ...severityCounts },
      vulnerablePackages
    };
  } catch {
    return { available: false };
  }
}

export function parsePipAudit(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    const dependencies = Array.isArray(parsed.dependencies) ? parsed.dependencies : [];
    const vulnerablePackages = dependencies
      .filter((dependency) => Array.isArray(dependency.vulns) && dependency.vulns.length)
      .slice(0, 20)
      .map((dependency) => ({
        name: dependency.name || "unknown",
        version: dependency.version || "unknown",
        severity: "unknown",
        viaCount: dependency.vulns.length,
        fixAvailable: dependency.vulns.some((vuln) => Array.isArray(vuln.fix_versions) && vuln.fix_versions.length),
        fixVersions: unique(dependency.vulns.flatMap((vuln) => vuln.fix_versions || [])).slice(0, 5),
        advisories: pipAdvisories(dependency.vulns)
      }));
    const total = vulnerablePackages.reduce((sum, pkg) => sum + pkg.viaCount, 0);
    return {
      available: true,
      summary: { total, critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
      vulnerablePackages
    };
  } catch {
    return { available: false };
  }
}

export function summarizeScanners(scanners = {}) {
  const summary = { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  for (const scanner of Object.values(scanners)) {
    if (!scanner?.available) continue;
    for (const key of Object.keys(summary)) summary[key] += Number(scanner.summary?.[key] || 0);
  }
  return summary;
}

export function topVulnerablePackages(scanners = {}, limit = 8) {
  const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4, unknown: 5 };
  return Object.values(scanners)
    .filter((scanner) => scanner?.available)
    .flatMap((scanner) => (scanner.vulnerablePackages || []).map((pkg) => ({ ...pkg, scanner: scanner.scanner })))
    .sort((a, b) => (rank[a.severity] ?? rank.unknown) - (rank[b.severity] ?? rank.unknown) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function unavailable(scanner, reason) {
  return {
    scanner,
    available: false,
    reason
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function hasFixAvailable(value) {
  if (typeof value === "boolean") return value;
  return Boolean(value && typeof value === "object");
}

function npmFixVersions(value) {
  if (!value || typeof value !== "object") return [];
  return unique([value.version]).slice(0, 5);
}

function npmAdvisories(via = []) {
  if (!Array.isArray(via)) return [];
  return via
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.source || item.id || item.cve || item.name || "").trim(),
      title: String(item.title || "").trim(),
      url: String(item.url || "").trim(),
      severity: item.severity || "unknown"
    }))
    .filter((item) => item.id || item.title || item.url)
    .slice(0, 5);
}

function pipAdvisories(vulns = []) {
  return vulns
    .map((vuln) => ({
      id: String(vuln.id || vuln.aliases?.[0] || "").trim(),
      aliases: Array.isArray(vuln.aliases) ? vuln.aliases.slice(0, 5) : [],
      fixVersions: Array.isArray(vuln.fix_versions) ? vuln.fix_versions.slice(0, 5) : []
    }))
    .filter((item) => item.id || item.aliases.length || item.fixVersions.length)
    .slice(0, 5);
}
