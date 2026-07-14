import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { portableCommandResult } from "../src/shell.js";

const runFile = promisify(execFile);
const repository = path.resolve(".");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-installed-package-"));

try {
  const pack = await runNpm(["pack", "--pack-destination", temporary, "--json"], repository);
  const packed = JSON.parse(pack.stdout)[0];
  assert.ok(packed?.filename, "npm pack did not report a filename");
  const archive = path.join(temporary, packed.filename);
  const consumer = path.join(temporary, "consumer");
  await fs.mkdir(consumer);
  await fs.writeFile(path.join(consumer, "package.json"), `${JSON.stringify({ name: "aienvmap-installed-package-check", private: true }, null, 2)}\n`);
  await runNpm(["install", archive, "--ignore-scripts", "--no-audit", "--no-fund"], consumer);

  const installedRoot = path.join(consumer, "node_modules", "aienvmap");
  const installedPackage = JSON.parse(await fs.readFile(path.join(installedRoot, "package.json"), "utf8"));
  assert.equal(installedPackage.main, undefined, "CLI-only package must not declare a missing library entry point");
  assert.equal(installedPackage.dependencies, undefined, "installed package must stay runtime dependency-free");

  const cli = path.join(installedRoot, "bin", "aienvmap.js");
  const version = (await run(process.execPath, [cli, "--version"], consumer)).stdout.trim();
  assert.equal(version, installedPackage.version);
  const trial = JSON.parse((await run(process.execPath, [cli, "trial", "--json"], consumer, 90_000)).stdout);
  assert.equal(trial.status, "technical-test-complete");
  assert.equal(trial.safety.environmentMutationRequested, false);
  assert.equal(trial.safety.projectWrappersExecuted, false);
  assert.equal(trial.safety.thirdPartyProbeSideEffectsGuaranteedAbsent, false);
  assert.equal(trial.artifacts.length, 4);
  for (const relative of trial.artifacts) await fs.access(path.join(consumer, relative));

  console.log(JSON.stringify({
    schemaName: "aienvmap-installed-package-check",
    schemaVersion: 1,
    pass: true,
    version,
    packedBytes: packed.size,
    unpackedBytes: packed.unpackedSize,
    runtimeDependencies: 0,
    trialStatus: trial.status,
    projectWrappersExecuted: trial.safety.projectWrappersExecuted
  }, null, 2));
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

async function run(command, args, cwd, timeout = 60_000) {
  try {
    return await runFile(command, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  } catch (error) {
    throw new Error(`${command} ${args.join(" ")} failed\n${error.stdout || ""}\n${error.stderr || error.message || ""}`.trim());
  }
}

async function runNpm(args, cwd, timeout = 60_000) {
  const result = await portableCommandResult(npm, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024 });
  if (!result.ok) throw new Error(`${npm} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`.trim());
  return result;
}
