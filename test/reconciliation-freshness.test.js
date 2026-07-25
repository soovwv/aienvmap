import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "./temp-cleanup.js";
import { reconciliationFresh } from "../src/reconciliation-freshness.js";

test("reconciliation freshness follows age and project declaration mtimes with timestamp tolerance", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-reconciliation-freshness-"));
  const now = Date.now();
  await fs.writeFile(path.join(dir, "package.json"), "{}", "utf8");
  await fs.utimes(path.join(dir, "package.json"), new Date(now), new Date(now + 500));
  assert.equal(await reconciliationFresh({ generatedAt: new Date(now).toISOString() }, dir, now), true);
  await fs.utimes(path.join(dir, "package.json"), new Date(now), new Date(now + 2000));
  assert.equal(await reconciliationFresh({ generatedAt: new Date(now).toISOString() }, dir, now), false);
  assert.equal(await reconciliationFresh({ generatedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }, dir, now), false);
  assert.equal(await reconciliationFresh(null, dir, now), false);
});

test("root Dev Container changes invalidate reconciliation evidence", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-root-devcontainer-freshness-"));
  const generated = Date.now() - 5000;
  const file = path.join(dir, ".devcontainer.json");
  await fs.writeFile(file, "{}", "utf8");
  await fs.utimes(file, new Date(generated + 2000), new Date(generated + 2000));

  assert.equal(await reconciliationFresh({ generatedAt: new Date(generated).toISOString() }, dir, generated + 3000), false);
});
