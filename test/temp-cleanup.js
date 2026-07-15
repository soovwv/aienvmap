import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { after } from "node:test";

const originalMkdtemp = fs.mkdtemp.bind(fs);
const tracked = new Set();

fs.mkdtemp = async (...args) => {
  const directory = await originalMkdtemp(...args);
  if (path.basename(directory).startsWith("aienvmap")) tracked.add(directory);
  return directory;
};

after(async () => {
  await Promise.all([...tracked].map((directory) => fs.rm(directory, { recursive: true, force: true })));
  tracked.clear();
});

process.once("exit", () => {
  for (const directory of tracked) fsSync.rmSync(directory, { recursive: true, force: true });
});
