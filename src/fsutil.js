import fs from "node:fs/promises";
import path from "node:path";

export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(stripBom(await fs.readFile(file, "utf8")));
  } catch {
    return fallback;
  }
}

export function stripBom(value) {
  return String(value).replace(/^\uFEFF/, "");
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function appendJsonLine(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${JSON.stringify(data)}\n`, "utf8");
}

export async function replaceMarkerBlock(file, begin, end, block) {
  let current = "";
  try {
    current = await fs.readFile(file, "utf8");
  } catch {
    current = "";
  }
  const start = current.indexOf(begin);
  const finish = current.indexOf(end);
  const rendered = `${begin}\n${block.trimEnd()}\n${end}`;
  let next;
  if (start >= 0 && finish > start) {
    next = current.slice(0, start) + rendered + current.slice(finish + end.length);
  } else if (start < 0 && finish < 0) {
    const sep = current.trim() ? "\n\n" : "";
    next = `${current.trimEnd()}${sep}${rendered}\n`;
  } else {
    throw new Error(`${path.basename(file)} has a broken aienvmap marker block`);
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next, "utf8");
}
