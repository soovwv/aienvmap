import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || ".");
const excludedDirectories = new Set([".git", ".aienvmap", "node_modules", "coverage"]);
const textExtensions = new Set([".css", ".html", ".ignore", ".js", ".json", ".lock", ".md", ".mjs", ".svg", ".toml", ".txt", ".yaml", ".yml"]);
const extensionlessTextFiles = new Set(["LICENSE"]);
const failures = [];

for (const file of await textFiles(root)) {
  const bytes = await fs.readFile(file);
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failures.push({ file: relative(file), rule: "valid-utf8", detail: "Text file is not valid UTF-8." });
    continue;
  }
  if (value.charCodeAt(0) === 0xFEFF) failures.push({ file: relative(file), rule: "no-bom", detail: "UTF-8 BOM is not allowed." });
  const lines = value.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/[^\x00-\x7F]/);
    if (!match) continue;
    failures.push({ file: relative(file), line: index + 1, column: match.index + 1, rule: "ascii-english-source", detail: `Non-ASCII code point U+${match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} is not allowed; use English ASCII text or an explicit escape in source fixtures.` });
  }
}

const result = {
  schemaName: "aienvmap-text-policy-result",
  schemaVersion: 1,
  root,
  policy: "Repository text must be valid UTF-8 without BOM and contain English ASCII source text only.",
  pass: failures.length === 0,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;

async function textFiles(directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await textFiles(file));
    else if (entry.isFile() && (textExtensions.has(path.extname(entry.name).toLowerCase()) || extensionlessTextFiles.has(entry.name))) found.push(file);
  }
  return found;
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}
