import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("market snapshot separates public requests from verified users", async () => {
  const market = await fs.readFile(path.resolve("MARKET.md"), "utf8");
  assert.match(market, /Observed 2026-07-12/);
  assert.match(market, /108/);
  assert.match(market, /requests, not unique people/);
  assert.match(market, /zero public stars, forks, and independent verified cases/);
  assert.match(market, /manual bundle/);
  assert.match(market, /Do not add package-manager or vulnerability-database behavior/);
});
