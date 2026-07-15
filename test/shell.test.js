import "./temp-cleanup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { commandOutput, commandResult, commandVersionResult, portableCommandResult, windowsCmdCommandLine } from "../src/shell.js";

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

test("Windows batch invocation quotes paths and rejects expandable command input", async () => {
  assert.equal(windowsCmdCommandLine("C:\\Program Files (x86)\\tool & sdk\\tool.cmd", ["--output", "C:\\pack destination\\result"]), `""C:\\Program Files (x86)\\tool & sdk\\tool.cmd" --output "C:\\pack destination\\result""`);
  assert.equal(windowsCmdCommandLine("C:\\%TEMP%\\tool.cmd", ["--version"]), "");
  assert.equal(windowsCmdCommandLine("C:\\safe\\tool.cmd", ["%TEMP%"]), "");
  assert.equal(windowsCmdCommandLine("C:\\safe\\tool.cmd", ["&", "whoami"]), "");

  const refused = await portableCommandResult("C:\\%TEMP%\\tool.cmd", ["--version"], { platform: "win32" });
  assert.equal(refused.ok, false);
  assert.equal(refused.failure, "unsafe-command-input");

  if (process.platform === "win32") {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-cmd & quoted-"));
    const file = path.join(dir, "version.cmd");
    await fs.writeFile(file, "@echo 1.2.3\r\n", "utf8");
    const result = await portableCommandResult(file, ["--version"], { platform: "win32" });
    assert.equal(result.ok, true);
    assert.equal(result.stdout, "1.2.3");

    const argumentsFile = path.join(dir, "arguments.cmd");
    await fs.writeFile(argumentsFile, "@echo [%~1] [%~2]\r\n", "utf8");
    const destination = path.join(os.tmpdir(), "aienvmap pack destination");
    const argumentsResult = await portableCommandResult(argumentsFile, ["--output", destination], { platform: "win32" });
    assert.equal(argumentsResult.ok, true);
    assert.equal(argumentsResult.stdout, `[--output] [${destination}]`);

    const pathResolved = await portableCommandResult("version.cmd", ["--version"], {
      platform: "win32",
      env: { ...process.env, PATH: dir }
    });
    assert.equal(pathResolved.ok, true);
    assert.equal(pathResolved.stdout, "1.2.3");
  }
});
