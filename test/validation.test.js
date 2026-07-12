import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("cross-platform validation records redacted compatibility evidence without market overclaim", async () => {
  const validation = await fs.readFile(path.resolve("VALIDATION.md"), "utf8");
  for (const environment of ["Windows 11 x64", "Alpine Linux x64", "Intel macOS 26.2"]) assert.match(validation, new RegExp(environment));
  assert.match(validation, /314 tests/);
  assert.match(validation, /published SHA-256 verification/);
  assert.match(validation, /not independent adoption/);
  assert.match(validation, /Removal authorized/);
  assert.match(validation, /false/);
  assert.match(validation, /cleanup was verified/);
  assert.doesNotMatch(validation, /211\.226\.|mil_user|password|qhst/i);
});
