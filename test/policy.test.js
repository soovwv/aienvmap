import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { intentionalRuntimeVersions, loadPolicy, parseSimplePolicy, policyWarnings, runtimeVersionsMatchIntentionalPolicy } from "../src/policy.js";

test("parseSimplePolicy reads simple version policy", () => {
  assert.deepEqual(parseSimplePolicy(`
    # comment
    node: 24
    python: "3.11"
    package-manager: npm
  `), {
    node: "24",
    python: "3.11",
    packageManager: "npm"
  });
});

test("intentional runtime policy requires an explicit bounded version set", () => {
  const policy = parseSimplePolicy("intentional-node-versions: 20, 22\nintentional-python-versions: 3.11,3.12\nintentional-java-versions: 17,21\n");
  assert.deepEqual(intentionalRuntimeVersions(policy, "node"), ["20", "22"]);
  assert.equal(runtimeVersionsMatchIntentionalPolicy([{ version: "20.19.0" }, { version: "22.14.0" }], policy, "node"), true);
  assert.equal(runtimeVersionsMatchIntentionalPolicy([{ version: "20.19.0" }, { version: "22.14.0" }, { version: "24.1.0" }], policy, "node"), false);
  assert.equal(runtimeVersionsMatchIntentionalPolicy([{ version: "22.14.0" }], policy, "node"), false);
  assert.equal(runtimeVersionsMatchIntentionalPolicy([{ runtimeVersion: "17.0.12" }, { runtimeVersion: "21.0.4" }], policy, "java"), true);
});

test("policy parsing fails closed on malformed, unknown, and duplicate rules", () => {
  assert.throws(() => parseSimplePolicy("runtimeChanges ask-first\n"), (error) => error.code === "AIENVMAP_INVALID_POLICY" && error.line === 1);
  assert.throws(() => parseSimplePolicy("runtimeChange: ask-first\n"), /unsupported key on line 1/);
  assert.throws(() => parseSimplePolicy("node: 20\nnode: 22\n"), /duplicate key on line 2/);
});

test("loadPolicy treats only a missing policy as empty", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-policy-"));
  assert.deepEqual(await loadPolicy(dir), {});
  await fs.mkdir(path.join(dir, ".aienvmap"), { recursive: true });
  await fs.writeFile(path.join(dir, ".aienvmap", "policy.yml"), "not valid\n", "utf8");
  await assert.rejects(loadPolicy(dir), (error) => error.code === "AIENVMAP_INVALID_POLICY");
});

test("policyWarnings reports runtime and lockfile drift", () => {
  const warnings = policyWarnings({
    runtimes: { node: "22.0.0", python: "3.10.0" },
    projectHints: { nvmrc: "22", pythonVersion: "3.10", pnpmLock: true }
  }, {
    node: "24",
    python: "3.11",
    packageManager: "npm"
  });

  assert.deepEqual(warnings.map((warning) => warning.code), [
    "policy-version-mismatch",
    "policy-version-mismatch",
    "policy-version-mismatch",
    "policy-version-mismatch",
    "package-manager-policy-mismatch"
  ]);
});
