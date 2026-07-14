import test from "node:test";
import assert from "node:assert/strict";
import { commandOutput, commandResult, commandVersionResult } from "../src/shell.js";

test("commandOutput forwards an explicit UTF-8 subprocess environment", async () => {
  const output = await commandOutput(process.execPath, ["-e", "process.stdout.write(process.env.AIENVMAP_TEST_UNICODE || '')"], {
    env: { ...process.env, AIENVMAP_TEST_UNICODE: "\uD658\uACBD\u2014\uC99D\uAC70" }
  });
  assert.equal(output, "\uD658\uACBD\u2014\uC99D\uAC70");
});

test("commandVersionResult separates execution failure from unrecognized output", async () => {
  const missing = await commandVersionResult("aienvmap-version-command-that-does-not-exist");
  assert.equal(missing.verified, false);
  assert.equal(missing.failure, "command-not-found");

  const unrecognized = await commandVersionResult(process.execPath, ["-e", "process.stdout.write('no version here')"]);
  assert.equal(unrecognized.verified, false);
  assert.equal(unrecognized.failure, "version-not-recognized");
});

test("commandResult forwards an explicit subprocess environment", async () => {
  const result = await commandResult(process.execPath, ["-e", "process.stdout.write(process.env.AIENVMAP_SHELL_TEST || '')"], {
    env: { ...process.env, AIENVMAP_SHELL_TEST: "isolated" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.stdout, "isolated");
});

test("commandResult distinguishes missing commands, nonzero exits, and timeouts", async () => {
  const missing = await commandResult("aienvmap-command-that-does-not-exist", []);
  assert.equal(missing.ok, false);
  assert.equal(missing.failure, "command-not-found");

  const nonzero = await commandResult(process.execPath, ["-e", "process.exit(7)"]);
  assert.equal(nonzero.ok, false);
  assert.equal(nonzero.code, 7);
  assert.equal(nonzero.failure, "nonzero-exit");

  const timeout = await commandResult(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { timeout: 20 });
  assert.equal(timeout.ok, false);
  assert.equal(timeout.failure, "timeout-or-terminated");
});
