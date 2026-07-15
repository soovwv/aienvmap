import fs from "node:fs/promises";
import { appendJsonLinesChecked } from "../src/fsutil.js";

const [file, expectedRevision, id, readyFile, gateFile] = process.argv.slice(2);

if (![file, expectedRevision, id, readyFile, gateFile].every(Boolean)) {
  throw new Error("cas-writer requires file, expected revision, id, ready file, and gate file");
}

await fs.writeFile(readyFile, "ready\n", "utf8");
await waitForFile(gateFile, 10_000);

try {
  const result = await appendJsonLinesChecked(file, [{ id }], expectedRevision);
  process.stdout.write(`${JSON.stringify({ status: "committed", id, ...result })}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    status: "rejected",
    id,
    code: error?.code || "UNKNOWN",
    currentRevision: error?.currentRevision || ""
  })}\n`);
  process.exitCode = error?.code === "AIENVMAP_REVISION_CONFLICT" ? 2 : 1;
}

async function waitForFile(filePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`timed out waiting for gate ${filePath}`);
}
