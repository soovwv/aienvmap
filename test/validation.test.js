import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("cross-platform validation records redacted compatibility evidence without market overclaim", async () => {
  const validation = await fs.readFile(path.resolve("VALIDATION.md"), "utf8");
  for (const environment of ["Windows 11 x64", "GitHub Ubuntu runner", "GitHub macOS runner", "GitHub Windows runners", "Alpine Linux x64", "Intel macOS 26.2"]) assert.match(validation, new RegExp(environment));
  assert.match(validation, /full 0\.2\.0 `npm run release:check`/);
  assert.match(validation, /full suite passed and one platform test was intentionally skipped/);
  assert.match(validation, /historical pre-release[^\n]+314-test suite/);
  assert.match(validation, /published SHA-256 verification/);
  assert.match(validation, /not independent adoption/);
  assert.match(validation, /Removal authorized/);
  assert.match(validation, /false/);
  assert.match(validation, /cleanup was verified/);
  assert.match(validation, /scripts\/scenario-check\.mjs/);
  assert.match(validation, /Intentional complexity policy/);
  assert.match(validation, /ask before consolidation/);
  assert.match(validation, /Persisted intentional versions/);
  assert.match(validation, /unexpected version restores review/);
  assert.match(validation, /Java remains outside consolidation candidates/);
  assert.match(validation, /not three independent users or three market cases/);
  assert.match(validation, /Docker backend stopped responding/);
  assert.match(validation, /not reported as a product pass or failure/);
  assert.doesNotMatch(validation, /211\.226\.|mil_user|password|qhst/i);
});
