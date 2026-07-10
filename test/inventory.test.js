import test from "node:test";
import assert from "node:assert/strict";
import { parseNameVersionLines, parseNpmGlobal, parsePipx, scanGlobalInventory } from "../src/inventory.js";

test("scanGlobalInventory is lightweight by default", async () => {
  const inventory = await scanGlobalInventory();

  assert.equal(inventory.mode, "basic");
  assert.equal(inventory.enabled, false);
  assert.match(inventory.note, /--deep/);
});

test("parseNpmGlobal returns package names and versions", () => {
  const tools = parseNpmGlobal(JSON.stringify({
    dependencies: {
      aienvmap: { version: "0.1.6" },
      npm: { version: "11.0.0" }
    }
  }));

  assert.deepEqual(tools, [
    { name: "aienvmap", version: "0.1.6" },
    { name: "npm", version: "11.0.0" }
  ]);
});

test("parsePipx returns venv package versions", () => {
  const tools = parsePipx(JSON.stringify({
    venvs: {
      ruff: { metadata: { main_package: { package_version: "0.13.0" } } }
    }
  }));

  assert.deepEqual(tools, [{ name: "ruff", version: "0.13.0" }]);
});

test("parseNameVersionLines handles simple command output", () => {
  assert.deepEqual(parseNameVersionLines("uv 0.1.0\nnode 24.0.0\n"), [
    { name: "uv", version: "0.1.0" },
    { name: "node", version: "24.0.0" }
  ]);
});
