import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJson, stripBom } from "../src/fsutil.js";

test("readJson accepts UTF-8 BOM JSON files from Windows editors", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-json-"));
  const file = path.join(dir, "package.json");
  await fs.writeFile(file, "\uFEFF{\"dependencies\":{\"express\":\"^4.18.0\"}}", "utf8");

  const json = await readJson(file, {});

  assert.equal(json.dependencies.express, "^4.18.0");
});

test("stripBom leaves normal JSON unchanged", () => {
  assert.equal(stripBom("{\"ok\":true}"), "{\"ok\":true}");
});
