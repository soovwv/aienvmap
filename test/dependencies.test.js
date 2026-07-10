import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildLightSbom, lightSbomRiskSummary, linkVulnerableDependencies, parsePyprojectDependencies, parseRequirementLine, remediationPriority, scanDependencySnapshot } from "../src/dependencies.js";

test("parseRequirementLine separates package name and version spec", () => {
  assert.deepEqual(parseRequirementLine("django==3.2.0"), { name: "django", version: "==3.2.0" });
  assert.deepEqual(parseRequirementLine("requests>=2 # comment"), { name: "requests", version: ">=2" });
});

test("parsePyprojectDependencies reads project dependency arrays", () => {
  assert.deepEqual(parsePyprojectDependencies(`
[project]
dependencies = [
  "fastapi>=0.110",
  "uvicorn",
]
`), ["fastapi>=0.110", "uvicorn"]);
});

test("scanDependencySnapshot reads node and python manifests without installing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-deps-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({
    dependencies: { express: "^4.18.0" },
    devDependencies: { vitest: "^2.0.0" }
  }), "utf8");
  await fs.writeFile(path.join(dir, "package-lock.json"), "{}", "utf8");
  await fs.writeFile(path.join(dir, "requirements.txt"), "django==3.2.0\n# ignored\n-r other.txt\n", "utf8");

  const snapshot = await scanDependencySnapshot(dir);

  assert.equal(snapshot.mode, "snapshot");
  assert.equal(snapshot.summary.packages, 3);
  assert.equal(snapshot.summary.lockfiles, 1);
  assert.deepEqual(snapshot.summary.ecosystems, ["npm", "python"]);
  assert.deepEqual(snapshot.manifests, ["package.json", "requirements.txt"]);
  assert.deepEqual(snapshot.lockfiles.map((item) => item.file), ["package-lock.json"]);
  assert.deepEqual(snapshot.packages.map((pkg) => pkg.name), ["express", "vitest", "django"]);
});

test("linkVulnerableDependencies marks direct dependency matches", () => {
  const security = linkVulnerableDependencies({
    enabled: true,
    topPackages: [
      { name: "express", scanner: "npm-audit", severity: "high" },
      { name: "transitive-only", scanner: "npm-audit", severity: "moderate" },
      { name: "django", scanner: "pip-audit", severity: "unknown" }
    ]
  }, {
    packages: [
      { ecosystem: "npm", name: "express", version: "^4.18.0", manifest: "package.json", group: "dependencies" },
      { ecosystem: "python", name: "django", version: "==3.2.0", manifest: "requirements.txt", group: "requirements" }
    ]
  });

  assert.equal(security.topPackages[0].directDependency, true);
  assert.equal(security.topPackages[0].dependency.manifest, "package.json");
  assert.equal(security.topPackages[0].remediationPriority.level, "high");
  assert.deepEqual(security.topPackages[0].remediationPriority.reasons.slice(0, 2), ["severity:high", "direct-dependency"]);
  assert.equal(security.topPackages[1].directDependency, false);
  assert.equal(security.topPackages[1].dependency, null);
  assert.equal(security.topPackages[2].directDependency, true);
  assert.equal(security.topPackages[2].dependency.manifest, "requirements.txt");
});

test("buildLightSbom creates an AI-ready package and risk summary", () => {
  const snapshot = {
    manifests: ["package.json", "requirements.txt"],
    lockfiles: [
      { file: "package-lock.json", ecosystem: "npm", manager: "npm" },
      { file: "pnpm-lock.yaml", ecosystem: "npm", manager: "pnpm" }
    ],
    packages: [
      { ecosystem: "npm", manager: "npm", group: "dependencies", name: "express", version: "^4.18.0", manifest: "package.json" },
      { ecosystem: "python", manager: "pip", group: "requirements", name: "django", version: "==3.2.0", manifest: "requirements.txt" }
    ]
  };
  const security = {
    enabled: true,
    summary: { total: 2 },
    topPackages: [
      {
        name: "express",
        scanner: "npm-audit",
        severity: "high",
        directDependency: true,
        dependency: { manifest: "package.json", version: "^4.18.0" },
        remediationPriority: { level: "high", score: 90 },
        fixAvailable: true,
        fixVersions: ["4.18.3"]
      },
      {
        name: "transitive-only",
        scanner: "npm-audit",
        severity: "moderate",
        directDependency: false,
        remediationPriority: { level: "medium", score: 50 }
      }
    ]
  };

  const sbom = buildLightSbom(snapshot, security);
  assert.equal(sbom.mode, "light-sbom");
  assert.equal(sbom.source.dependencies, "project manifests");
  assert.equal(sbom.source.vulnerabilities, "optional scanner summary");
  assert.equal(sbom.confidence.directDependencies, "high");
  assert.equal(sbom.confidence.transitiveDependencies, "not-resolved");
  assert.match(sbom.limitations[1], /transitive/);
  assert.equal(sbom.summary.packages, 2);
  assert.deepEqual(sbom.summary.ecosystems, { npm: 1, python: 1 });
  assert.deepEqual(sbom.summary.lockfiles.map((item) => item.file), ["package-lock.json", "pnpm-lock.yaml"]);
  assert.equal(sbom.packageManagerPolicy.status, "review-required");
  assert.equal(sbom.packageManagerPolicy.ecosystems.npm.status, "mixed-lockfiles");
  assert.equal(sbom.summary.vulnerabilities, 2);
  assert.equal(sbom.summary.directVulnerablePackages, 1);
  assert.equal(sbom.summary.transitiveOrUnmatchedVulnerablePackages, 1);
  assert.equal(sbom.riskSummary.level, "high");
  assert.match(sbom.riskSummary.signals.join(" "), /vulnerable direct dependency/);
  assert.deepEqual(sbom.riskSummary.reviewTargets.slice(0, 2), ["package.json", "express"]);
  assert.equal(sbom.aiDependencyReview.status, "review");
  assert.equal(sbom.aiDependencyReview.securityConfidence, "scanner-summary");
  assert.match(sbom.aiDependencyReview.statusReason, /requires dependency review/);
  assert.ok(sbom.aiDependencyReview.readFirst.includes("packageManagerPolicy"));
  assert.ok(sbom.aiDependencyReview.beforeDependencyChange.includes("aienvmap plan --write"));
  assert.match(sbom.aiDependencyReview.afterDependencyChange[1], /checkpoint/);
  assert.equal(sbom.topRisk[0].name, "express");
  assert.equal(sbom.topRisk[0].directDependency, true);
  assert.equal(sbom.dependencyChangeHints[0].manifest, "package.json");
  assert.deepEqual(sbom.dependencyChangeHints[0].lockfiles.map((item) => item.file), ["package-lock.json", "pnpm-lock.yaml"]);
  assert.deepEqual(sbom.dependencyChangeHints[0].groups, ["dependencies"]);
  assert.equal(sbom.dependencyChangeHints[0].riskPackages[0].name, "express");
  assert.match(sbom.dependencyChangeHints[0].beforeChange[1], /package-lock\.json/);
  assert.match(sbom.dependencyChangeHints[0].beforeChange[0], /package\.json/);
  assert.equal(sbom.aiUse.dependencySource, "project manifests only; no install or resolver is run");
  assert.match(sbom.aiUse.trustRule, /fast AI planning map/);
});

test("lightSbomRiskSummary stays lightweight when scanners are off", () => {
  const risk = lightSbomRiskSummary({
    packages: [{ name: "express", ecosystem: "npm" }],
    security: { enabled: false },
    lockfiles: [{ file: "package-lock.json", ecosystem: "npm", manager: "npm" }]
  });

  assert.equal(risk.level, "low");
  assert.equal(risk.scanner, "off");
  assert.match(risk.next, /security scan/);
  assert.equal(risk.commands[0], "aienvmap sync --security");
});

test("buildLightSbom explains scanner-off dependency review confidence", () => {
  const sbom = buildLightSbom({
    manifests: ["package.json"],
    lockfiles: [],
    packages: [{ ecosystem: "npm", manager: "npm", group: "dependencies", name: "express", version: "^4.18.0", manifest: "package.json" }]
  }, { enabled: false, summary: { total: 0 }, topPackages: [] });

  assert.equal(sbom.aiDependencyReview.status, "ready");
  assert.equal(sbom.aiDependencyReview.securityConfidence, "scanner-off");
  assert.match(sbom.aiDependencyReview.statusReason, /security scanner is off/);
  assert.equal(sbom.aiDependencyReview.beforeDependencyChange[0], "aienvmap sync --security");
});

test("remediationPriority scores severity, direct dependency, and fix availability", () => {
  assert.deepEqual(remediationPriority({ severity: "critical", fixAvailable: true }, { directDependency: true }), {
    level: "urgent",
    score: 110,
    reasons: ["severity:critical", "direct-dependency", "fix-available"]
  });
  assert.equal(remediationPriority({ severity: "low" }, { directDependency: false }).level, "low");
});
