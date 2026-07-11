import test from "node:test";
import assert from "node:assert/strict";
import * as packageManagers from "../src/package-managers.js";
import { analyzeCondaRouting, analyzeNodePackageManagers, analyzePythonToolEntryPoints } from "../src/tool-routing.js";

test("package-manager compatibility exports preserve tool-routing helpers", () => {
  assert.equal(packageManagers.analyzeNodePackageManagers, analyzeNodePackageManagers);
  assert.equal(packageManagers.analyzePythonToolEntryPoints, analyzePythonToolEntryPoints);
  assert.equal(packageManagers.analyzeCondaRouting, analyzeCondaRouting);
});

test("tool-routing rules remain pure and evidence-bounded", () => {
  const node = analyzeNodePackageManagers({ pnpm: { installations: [], distinctVersions: [] } }, { packageManager: { name: "pnpm", version: "10" } });
  const python = analyzePythonToolEntryPoints([{ version: "24" }, { version: "25" }], {});
  const conda = analyzeCondaRouting({}, [{ active: true, path: "/usr/bin/python", prefix: "/usr" }], { CONDA_PREFIX: "/opt/conda" });
  assert.equal(node[0].code, "pnpm-not-detected");
  assert.equal(python[0].code, "multiple-pip-entry-points");
  assert.equal(conda[0].code, "conda-active-python-routing-mismatch");
  assert.ok([...node, ...python, ...conda].every((item) => !/remove automatically|switch versions automatically/.test(item.action) || /do not/.test(item.action)));
});
