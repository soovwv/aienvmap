import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { productScorecard } from "../src/scorecard.js";

const root = path.resolve(".");

test("0.2.0 release metadata stays aligned across package, APM, contracts, and docs", async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const apm = await fs.readFile(path.join(root, "apm.yml"), "utf8");
  const scorecard = await fs.readFile(path.join(root, "SCORECARD.md"), "utf8");
  const market = await fs.readFile(path.join(root, "MARKET.md"), "utf8");
  const readme = await fs.readFile(path.join(root, "README.md"), "utf8");
  const roadmap = await fs.readFile(path.join(root, "ROADMAP.md"), "utf8");
  const freeze = JSON.parse(await fs.readFile(path.join(root, "contracts/ai-json-root-fields.v1.json"), "utf8"));
  const result = productScorecard();
  const surfaceCount = Object.keys(freeze.surfaceFieldCounts).length;

  assert.equal(pkg.version, "0.2.0");
  assert.match(apm, new RegExp(`^version: ${pkg.version.replaceAll(".", "\\.")}$`, "m"));
  assert.match(scorecard, new RegExp(`\\| Technical readiness \\| ${result.technicalReadiness.score}/100 \\|`));
  assert.match(scorecard, new RegExp(`\\| Market readiness \\| ${result.marketReadiness.score}/100 \\|`));
  assert.match(scorecard, new RegExp(`\\| Market validation \\| ${result.marketValidation.score}/100 \\|`));
  assert.match(scorecard, new RegExp(`\\| Weighted release readiness \\| ${result.overall.score}/100 \\|`));
  assert.equal(result.releaseAssessment.qualified, true);
  assert.equal(result.releaseAssessment.publishReady, false);
  assert.match(scorecard, /npm publishing remains on hold/);
  assert.match(readme, new RegExp(`${surfaceCount} documented AI JSON root-field surfaces`));
  assert.equal(surfaceCount, 15);
  assert.doesNotMatch(scorecard, /Strong prototype|contract is not stable until 0\.2\.0/);
  assert.doesNotMatch(market, /pre-0\.2\.0 contract status|Stabilize the additive contract/);
  assert.doesNotMatch(roadmap, /freeze candidate guarded[^\n]+until `0\.2\.0`/);
  assert.ok(pkg.files.includes("VALIDATION.md"));
  assert.ok(readme.indexOf("## 10-Second Use") < readme.indexOf("## External Trial"));
});

test("CHANGELOG reserves semantic-version release headings for real package versions", async () => {
  const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
  const releases = [...changelog.matchAll(/^## (\d+\.\d+\.\d+)(?:\s|$)/gm)].map((match) => match[1]);
  assert.deepEqual(releases, ["0.2.0", "0.1.1", "0.1.0"]);
  assert.match(changelog, /^## Pre-release development history$/m);
  assert.match(changelog, /^### Internal batch 69$/m);
  assert.doesNotMatch(changelog, /^## 0\.1\.(?:[2-9]|[1-6]\d)$/m);
});

test("local links in packaged Markdown resolve to packaged files", async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const files = await walk(root);
  const markdown = files.filter((file) => file.endsWith(".md") && included(relative(file), pkg.files));
  const failures = [];

  for (const file of markdown) {
    const text = await fs.readFile(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].trim();
      if (/^(?:https?:|mailto:|#)/i.test(raw)) continue;
      const withoutAnchor = raw.split("#", 1)[0].split("?", 1)[0];
      if (!withoutAnchor) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(withoutAnchor));
      const rel = relative(target);
      try {
        await fs.access(target);
      } catch {
        failures.push(`${relative(file)} -> missing ${rel}`);
        continue;
      }
      if (!included(rel, pkg.files)) failures.push(`${relative(file)} -> unpacked target ${rel}`);
    }
  }

  assert.deepEqual(failures, []);
});

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function included(file, allowlist) {
  return allowlist.some((entry) => file === entry || file.startsWith(`${entry}/`));
}
