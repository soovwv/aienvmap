import test from "node:test";
import assert from "node:assert/strict";
import { parseSimplePolicy, policyWarnings } from "../src/policy.js";

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
