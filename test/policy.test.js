import test from "node:test";
import assert from "node:assert/strict";
import { intentionalRuntimeVersions, parseSimplePolicy, policyWarnings, runtimeVersionsMatchIntentionalPolicy } from "../src/policy.js";

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
