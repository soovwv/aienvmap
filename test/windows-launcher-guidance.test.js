import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const guidanceFiles = [
  "README.md",
  "AI_TESTING.md",
  "TESTING.md",
  "TESTER_INVITE.md",
  "TROUBLESHOOTING.md",
  ".apm/skills/aienvmap/SKILL.md",
  ".agents/skills/aienvmap/SKILL.md"
];

test("Windows-facing guidance uses cmd shims without weakening PowerShell policy", async () => {
  const sources = await Promise.all(guidanceFiles.map(async (file) => [file, await fs.readFile(path.resolve(file), "utf8")]));
  const combined = sources.map(([, source]) => source).join("\n");

  assert.match(combined, /npx\.cmd aienvmap@0\.2\.0 start/);
  assert.match(combined, /npx\.cmd aienvmap@0\.2\.0 trial/);
  assert.match(combined, /npm\.cmd/);
  assert.match(combined, /aienvmap\.cmd/);
  assert.match(combined, /Do not run `Set-ExecutionPolicy`|never run `Set-ExecutionPolicy`/i);
  assert.match(combined, /Keep (the package name, version, and arguments|all arguments) unchanged/i);

  for (const [file, source] of sources) {
    const executablePolicyChanges = source.split(/\r?\n/).filter((line) => /^\s*(Set-ExecutionPolicy|powershell(?:\.exe)?\s+.*-ExecutionPolicy)/i.test(line));
    assert.deepEqual(executablePolicyChanges, [], `${file} must not provide an executable policy-weakening command`);
  }
});

test("Windows runtime probes already choose command shims internally", async () => {
  const inventory = await fs.readFile(path.resolve("src/inventory.js"), "utf8");
  const manifest = await fs.readFile(path.resolve("src/manifest.js"), "utf8");
  const security = await fs.readFile(path.resolve("src/security.js"), "utf8");

  assert.match(inventory, /process\.platform === "win32" \? "npm\.cmd" : "npm"/);
  assert.match(manifest, /process\.platform === "win32" \? "npm\.cmd" : "npm"/);
  assert.match(security, /process\.platform === "win32" \? "npm\.cmd" : "npm"/);
});
