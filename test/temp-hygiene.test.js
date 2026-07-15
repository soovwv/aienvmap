import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("every test using mkdtemp loads the tracked cleanup helper", async () => {
  const directory = path.resolve("test");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".test.js"));
  const missing = [];

  for (const file of files) {
    const source = await fs.readFile(path.join(directory, file), "utf8");
    if (source.includes("mkdtemp(") && !source.includes('import "./temp-cleanup.js";')) missing.push(file);
  }

  assert.deepEqual(missing, []);
});
