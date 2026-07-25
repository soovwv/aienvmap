import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "./temp-cleanup.js";
import { inspectPackageManagers } from "../src/package-managers.js";

test("project declaration conflicts reach reconcile findings and AI review", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-project-findings-"));
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ engines: { node: ">=22 <23" } }), "utf8");
  await fs.writeFile(path.join(dir, "mise.toml"), "[tools]\nnode = \"<20\"\n", "utf8");
  const result = await inspectPackageManagers(dir, { quick: true });
  assert.ok(result.findings.some((item) => item.code === "node-project-declarations-conflict"));
  assert.equal(result.decision, "review");
  assert.equal(result.aiDecision.decision, "review");
  assert.ok(result.aiDecisionEnvelope.reasonCodes.includes("node-project-declarations-conflict"));
});
