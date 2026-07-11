import test from "node:test";
import assert from "node:assert/strict";
import * as packageManagers from "../src/package-managers.js";
import * as pythonTools from "../src/python-tool-discovery.js";

test("package-manager compatibility exports preserve Python tool discovery", () => {
  for (const name of ["findPythonToolCandidates", "inspectPythonToolCandidates", "findCondaCandidates", "inspectCondaCandidates", "parseCondaEnvironmentInfo"]) {
    assert.equal(packageManagers[name], pythonTools[name]);
  }
});

test("unsupported Conda JSON fails closed without inferred environments", () => {
  assert.deepEqual(pythonTools.parseCondaEnvironmentInfo("not-json"), {
    collection: "unsupported-or-failed",
    count: 0,
    activePrefix: "",
    prefixes: [],
    truncated: false
  });
});
