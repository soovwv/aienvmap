import test from "node:test";
import assert from "node:assert/strict";
import { parseNpmAudit, parsePipAudit, scanSecurity, summarizeScanners, topVulnerablePackages } from "../src/security.js";

test("scanSecurity is disabled by default", async () => {
  const security = await scanSecurity(process.cwd());

  assert.equal(security.mode, "basic");
  assert.equal(security.enabled, false);
  assert.match(security.note, /--security/);
});

test("parseNpmAudit returns severity counts and package summaries", () => {
  const parsed = parseNpmAudit(JSON.stringify({
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 1,
        moderate: 2,
        high: 1,
        critical: 1,
        total: 5
      }
    },
    vulnerabilities: {
      lodash: {
        severity: "high",
        via: [{
          source: 1100,
          title: "Prototype Pollution",
          url: "https://github.com/advisories/GHSA-test",
          severity: "high"
        }],
        fixAvailable: { name: "lodash", version: "4.17.21", isSemVerMajor: false }
      },
      minimist: { severity: "critical", via: ["CVE-2", "CVE-3"], fixAvailable: false }
    }
  }));

  assert.equal(parsed.available, true);
  assert.equal(parsed.summary.total, 5);
  assert.equal(parsed.summary.critical, 1);
  assert.equal(parsed.summary.high, 1);
  assert.deepEqual(parsed.vulnerablePackages, [
    {
      name: "lodash",
      severity: "high",
      viaCount: 1,
      fixAvailable: true,
      fixVersions: ["4.17.21"],
      advisories: [{
        id: "1100",
        title: "Prototype Pollution",
        url: "https://github.com/advisories/GHSA-test",
        severity: "high"
      }]
    },
    { name: "minimist", severity: "critical", viaCount: 2, fixAvailable: false, fixVersions: [], advisories: [] }
  ]);
});

test("summarizeScanners combines available scanner totals", () => {
  const summary = summarizeScanners({
    npmAudit: {
      available: true,
      summary: { total: 2, critical: 1, high: 1, moderate: 0, low: 0, info: 0 }
    },
    missing: { available: false }
  });

  assert.deepEqual(summary, { total: 2, critical: 1, high: 1, moderate: 0, low: 0, info: 0 });
});

test("parsePipAudit returns Python package vulnerability summaries", () => {
  const parsed = parsePipAudit(JSON.stringify({
    dependencies: [{
      name: "django",
      version: "3.2.0",
      vulns: [{
        id: "PYSEC-1",
        aliases: ["GHSA-pytest"],
        fix_versions: ["3.2.25"]
      }, {
        id: "PYSEC-2",
        fix_versions: []
      }]
    }, {
      name: "safe",
      version: "1.0.0",
      vulns: []
    }]
  }));

  assert.equal(parsed.available, true);
  assert.equal(parsed.summary.total, 2);
  assert.deepEqual(parsed.vulnerablePackages, [{
    name: "django",
    version: "3.2.0",
    severity: "unknown",
    viaCount: 2,
    fixAvailable: true,
    fixVersions: ["3.2.25"],
    advisories: [{
      id: "PYSEC-1",
      aliases: ["GHSA-pytest"],
      fixVersions: ["3.2.25"]
    }, {
      id: "PYSEC-2",
      aliases: [],
      fixVersions: []
    }]
  }]);
});

test("topVulnerablePackages ranks packages by severity", () => {
  const packages = topVulnerablePackages({
    npmAudit: {
      scanner: "npm-audit",
      available: true,
      vulnerablePackages: [
        { name: "low-pkg", severity: "low", viaCount: 1, fixAvailable: true },
        { name: "critical-pkg", severity: "critical", viaCount: 1, fixAvailable: false },
        { name: "high-pkg", severity: "high", viaCount: 1, fixAvailable: true }
      ]
    },
    pipAudit: {
      scanner: "pip-audit",
      available: true,
      vulnerablePackages: [
        { name: "python-pkg", severity: "unknown", viaCount: 1, fixAvailable: false }
      ]
    }
  });

  assert.deepEqual(packages.map((pkg) => pkg.name), ["critical-pkg", "high-pkg", "low-pkg", "python-pkg"]);
  assert.equal(packages[0].scanner, "npm-audit");
  assert.equal(packages[3].scanner, "pip-audit");
});
