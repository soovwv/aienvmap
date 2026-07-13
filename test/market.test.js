import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("market snapshot separates public requests from verified users", async () => {
  const market = await fs.readFile(path.resolve("MARKET.md"), "utf8");
  assert.match(market, /Observed 2026-07-14/);
  assert.match(market, /116/);
  assert.match(market, /Published npm versions \| 2/);
  assert.match(market, /signed-provenance 0\.1\.1/);
  assert.match(market, /requests, not unique people/);
  assert.match(market, /zero public stars, forks, and independent verified cases/);
  assert.match(market, /manual bundle/);
  assert.match(market, /Do not add package-manager, environment activation, agent-package distribution, or vulnerability-database behavior/);
  assert.match(market, /Microsoft APM/);
  assert.match(market, /Devbox/);
  assert.match(market, /Flox/);
  assert.match(market, /AI runtime CLI setup/);
});
