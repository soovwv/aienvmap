import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyScope, classifySource, displayPath, namedFilesBelow, pathEntries, pathIsWithin } from "../src/path-evidence.js";

test("path evidence redacts user paths and classifies known managers", () => {
  const home = path.join(path.parse(process.cwd()).root, "private-home");
  assert.equal(displayPath(path.join(home, "tools", "uv"), { home }), path.join("$HOME", "tools", "uv"));
  assert.equal(classifyScope(path.join(home, "bin"), home), "user");
  assert.equal(classifySource(path.join(home, ".pyenv", "versions")), "pyenv");
  assert.equal(classifySource(path.join(home, "unknown")), "path");
});

test("home redaction requires a real path boundary", () => {
  const root = path.parse(process.cwd()).root;
  const home = path.join(root, "Users", "User");
  const sibling = path.join(root, "Users", "User2", "secret", "python.exe");
  assert.equal(pathIsWithin(home, sibling), false);
  assert.equal(classifyScope(sibling, home), "host");
  assert.equal(displayPath(sibling, { home }), path.normalize(sibling));
});

test("bounded named-file discovery and PATH parsing stay platform-aware", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-path-evidence-"));
  const nested = path.join(dir, "one", "two");
  await fs.mkdir(nested, { recursive: true });
  await fs.writeFile(path.join(nested, "uv"), "", "utf8");
  assert.deepEqual(await namedFilesBelow(dir, 1, ["uv"]), []);
  assert.deepEqual(await namedFilesBelow(dir, 2, ["uv"]), [path.join(nested, "uv")]);
  assert.deepEqual(pathEntries([dir, nested].join(path.delimiter)), [dir, nested]);
});
