import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const checker = path.resolve("scripts/text-policy-check.mjs");

test("text policy accepts English ASCII repository text", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-text-policy-ok-"));
  await fs.writeFile(path.join(root, "README.md"), "English ASCII only.\n", "utf8");
  const { stdout } = await run(process.execPath, [checker, root]);
  assert.equal(JSON.parse(stdout).pass, true);
});

test("text policy rejects non-ASCII and invalid UTF-8 text", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-text-policy-bad-"));
  await fs.writeFile(path.join(root, "unicode.md"), Buffer.from([0x48, 0x69, 0x20, 0xE2, 0x80, 0x94]));
  await fs.writeFile(path.join(root, "invalid.md"), Buffer.from([0xC3, 0x28]));
  await assert.rejects(run(process.execPath, [checker, root]), (error) => {
    const result = JSON.parse(error.stdout);
    assert.equal(result.pass, false);
    assert.ok(result.failures.some((item) => item.rule === "ascii-english-source"));
    assert.ok(result.failures.some((item) => item.rule === "valid-utf8"));
    return true;
  });
});
