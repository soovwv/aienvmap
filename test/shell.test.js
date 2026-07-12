import test from "node:test";
import assert from "node:assert/strict";
import { commandOutput } from "../src/shell.js";

test("commandOutput forwards an explicit UTF-8 subprocess environment", async () => {
  const output = await commandOutput(process.execPath, ["-e", "process.stdout.write(process.env.AIENVMAP_TEST_UNICODE || '')"], {
    env: { ...process.env, AIENVMAP_TEST_UNICODE: "\uD658\uACBD\u2014\uC99D\uAC70" }
  });
  assert.equal(output, "\uD658\uACBD\u2014\uC99D\uAC70");
});
