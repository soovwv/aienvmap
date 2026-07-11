import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { evaluatePerformanceMeasurement, evaluateWorkspaceMeasurement, performanceBudget } from "../src/performance-budget.js";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(root, "bin", "aienvmap.js");
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-performance-"));
const results = [];

try {
  await fs.writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "performance-fixture", private: true, packageManager: "npm@10.0.0" }), "utf8");
  for (const [name, command] of Object.entries(performanceBudget.commands)) {
    const args = [...command.args, ...(name === "scorecard" ? [] : ["--dir", workspace])];
    const started = process.hrtime.bigint();
    const { stdout } = await execFileAsync(process.execPath, [cli, ...args], { cwd: root, timeout: command.maxDurationMs + 5000, maxBuffer: command.maxStdoutBytes + 65536 });
    const durationMs = Number((process.hrtime.bigint() - started) / 1000000n);
    JSON.parse(stdout);
    results.push(evaluatePerformanceMeasurement(name, { durationMs, stdoutBytes: Buffer.byteLength(stdout) }));
  }
  results.push(evaluateWorkspaceMeasurement(await directoryMeasurement(path.join(workspace, ".aienvmap"))));
  const report = { schemaName: "aienvmap-performance-result", schemaVersion: 1, platform: process.platform, node: process.version, results, pass: results.every((item) => item.pass), rule: performanceBudget.rule };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}

async function directoryMeasurement(dir) {
  let generatedBytes = 0;
  let generatedFiles = 0;
  async function visit(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true }).catch(() => [])) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) {
        generatedFiles += 1;
        generatedBytes += (await fs.stat(target)).size;
      }
    }
  }
  await visit(dir);
  return { generatedBytes, generatedFiles };
}
