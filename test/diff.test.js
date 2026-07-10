import test from "node:test";
import assert from "node:assert/strict";
import { diffManifests } from "../src/diff.js";

test("diffManifests reports added and changed runtime values", () => {
  const previous = {
    runtimes: { node: "20.0.0" },
    packageManagers: {},
    containers: {},
    projectHints: {},
    agentFiles: { agents: false },
    agentProtocol: {}
  };
  const current = {
    runtimes: { node: "22.0.0", python: "3.11.0" },
    packageManagers: {},
    containers: {},
    projectHints: {},
    agentFiles: { agents: true },
    agentProtocol: {}
  };
  assert.deepEqual(diffManifests(previous, current), [
    { scope: "runtime", key: "node", type: "changed", before: "20.0.0", after: "22.0.0" },
    { scope: "runtime", key: "python", type: "added", after: "3.11.0" },
    { scope: "agent-file", key: "agents", type: "changed", before: false, after: true }
  ]);
});
