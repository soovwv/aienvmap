import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("market snapshot separates public requests from verified users", async () => {
  const market = await fs.readFile(path.resolve("MARKET.md"), "utf8");
  assert.match(market, /Observed 2026-07-15/);
  assert.match(market, /116/);
  assert.match(market, /2026-06-14 through 2026-07-13/);
  assert.match(market, /Published npm versions \| 2/);
  assert.match(market, /signed-provenance 0\.1\.1/);
  assert.match(market, /requests, not unique people/);
  assert.match(market, /zero public stars, forks, and independent verified cases/);
  assert.match(market, /manual bundle/);
  assert.match(market, /Do not build an agent package manager/);
  assert.match(market, /use APM only to distribute the bounded advisory skill/);
  assert.match(market, /Microsoft APM/);
  assert.match(market, /3,234 stars; latest v0\.25\.0/);
  assert.match(market, /30,763 stars; latest v2026\.7\.6/);
  assert.match(market, /MCP server exposes tools, tasks, environment variables, and config/);
  assert.match(market, /agent-package SBOMs/);
  assert.match(market, /Devbox/);
  assert.match(market, /Flox/);
  assert.match(market, /AI runtime CLI setup/);
  assert.match(market, /envinfo/);
  assert.match(market, /multi-path evidence, AI decisions, and change handoff/);
});
