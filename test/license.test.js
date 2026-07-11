import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

test("license is the canonical Apache-2.0 text", async () => {
  const license = (await fs.readFile(path.resolve("LICENSE"), "utf8")).replace(/\r\n/g, "\n").trim();
  assert.equal(license.length, 11323);
  assert.equal(crypto.createHash("sha256").update(license).digest("hex"), "283ea6cc2997a1a70da0049e09adf9317bb60ca1b51279b65196b83a69e1996b");
  assert.match(license, /patent licenses[\s\S]*shall terminate/);
  assert.match(license, /END OF TERMS AND CONDITIONS/);
});
