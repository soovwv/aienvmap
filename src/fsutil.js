import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

export async function readJsonStrict(file, fallback = null) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
  try {
    return JSON.parse(stripBom(raw));
  } catch (cause) {
    const error = new Error(`${path.basename(file)} contains invalid JSON; repair or remove the artifact before continuing`);
    error.code = "AIENVMAP_INVALID_JSON";
    error.file = file;
    error.cause = cause;
    throw error;
  }
}

export function stripBom(value) {
  return String(value).replace(/^\uFEFF/, "");
}

export async function writeJson(file, data) {
  await writeTextAtomic(file, `${JSON.stringify(data, null, 2)}\n`);
}

export async function writeTextAtomic(file, content) {
  await assertAienvmapWriteBoundary(file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(temp, content, "utf8");
    await fs.rename(temp, file);
  } catch (error) {
    if (!["EEXIST", "EPERM", "EACCES"].includes(error?.code)) throw error;
    await fs.rm(file, { force: true });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}

export async function appendJsonLine(file, data) {
  await assertAienvmapWriteBoundary(file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await withFileLock(file, async () => {
    await fs.appendFile(file, `${JSON.stringify(data)}\n`, "utf8");
  });
}

export async function jsonlRevision(file) {
  let raw = "";
  try { raw = await fs.readFile(file, "utf8"); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return revisionForText(raw);
}

export async function appendJsonLinesChecked(file, entries, expectedRevision) {
  await assertAienvmapWriteBoundary(file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  return withFileLock(file, async () => {
    let raw = "";
    try { raw = await fs.readFile(file, "utf8"); } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const beforeRevision = revisionForText(raw);
    if (expectedRevision && expectedRevision !== beforeRevision) {
      const error = new Error(`coordination state changed: expected ${expectedRevision}, current ${beforeRevision}; refresh with \`aienvmap status --json\``);
      error.code = "AIENVMAP_REVISION_CONFLICT";
      error.expectedRevision = expectedRevision;
      error.currentRevision = beforeRevision;
      throw error;
    }
    const addition = entries.map((entry) => `${JSON.stringify(entry)}\n`).join("");
    await fs.appendFile(file, addition, "utf8");
    return { beforeRevision, revision: revisionForText(raw + addition) };
  });
}

function revisionForText(value) {
  return `ir1:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export async function withFileLock(file, operation, options = {}) {
  const lock = `${file}.lock`;
  const attempts = options.attempts || 40;
  const retryMs = options.retryMs || 25;
  const staleMs = options.staleMs || 10000;
  let handle;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      handle = await fs.open(lock, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const stat = await fs.stat(lock);
        if (Date.now() - stat.mtimeMs > staleMs) await fs.rm(lock, { force: true });
      } catch {}
      if (attempt === attempts - 1) throw new Error(`timed out waiting for ${path.basename(file)} write lock`);
      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
  }
  try {
    return await operation();
  } finally {
    await handle?.close().catch(() => {});
    await fs.rm(lock, { force: true }).catch(() => {});
  }
}

export async function replaceMarkerBlock(file, begin, end, block) {
  let current = "";
  try {
    current = await fs.readFile(file, "utf8");
  } catch {
    current = "";
  }
  const next = renderMarkerUpdate(current, begin, end, block, file);
  await writeTextAtomic(file, next);
}

export function renderMarkerUpdate(current, begin, end, block, file = "instruction file") {
  const start = current.indexOf(begin);
  const finish = current.indexOf(end);
  const rendered = `${begin}\n${block.trimEnd()}\n${end}`;
  if (start >= 0 && finish > start) {
    return current.slice(0, start) + rendered + current.slice(finish + end.length);
  }
  if (start < 0 && finish < 0) {
    const sep = current.trim() ? "\n\n" : "";
    return `${current.trimEnd()}${sep}${rendered}\n`;
  }
  throw new Error(`${path.basename(file)} has a broken aienvmap marker block`);
}

export async function previewMarkerBlock(file, begin, end, block) {
  let current = "";
  try { current = await fs.readFile(file, "utf8"); } catch {}
  const next = renderMarkerUpdate(current, begin, end, block, file);
  return {
    exists: Boolean(current),
    changed: current !== next,
    action: current.includes(begin) ? "update-marker" : "append-marker",
    beforeBytes: Buffer.byteLength(current),
    afterBytes: Buffer.byteLength(next)
  };
}

export async function removeMarkerBlock(file, begin, end) {
  let current;
  try { current = await fs.readFile(file, "utf8"); } catch { return { changed: false, action: "missing-file" }; }
  const start = current.indexOf(begin);
  const finish = current.indexOf(end);
  if (start < 0 && finish < 0) return { changed: false, action: "marker-missing" };
  if (start < 0 || finish <= start) throw new Error(`${path.basename(file)} has a broken aienvmap marker block`);
  const before = current.slice(0, start).trimEnd();
  const after = current.slice(finish + end.length).trimStart();
  const next = [before, after].filter(Boolean).join("\n\n") + (before || after ? "\n" : "");
  await writeTextAtomic(file, next);
  return { changed: true, action: "remove-marker" };
}

export async function assertWritePathInsideWorkspace(workspace, target) {
  const root = await fs.realpath(path.resolve(workspace));
  const absolute = path.resolve(target);
  let probe = absolute;
  const remainder = [];
  let resolved;
  while (true) {
    try {
      resolved = await fs.realpath(probe);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(probe);
      if (parent === probe) throw error;
      remainder.unshift(path.basename(probe));
      probe = parent;
    }
  }
  const candidate = path.resolve(resolved, ...remainder);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error("write target must stay inside the workspace after resolving symbolic links");
    error.code = "AIENVMAP_WRITE_OUTSIDE_WORKSPACE";
    throw error;
  }
  return absolute;
}

async function assertAienvmapWriteBoundary(file) {
  const absolute = path.resolve(file);
  const parts = absolute.split(path.sep);
  const index = parts.lastIndexOf(".aienvmap");
  if (index < 1) return;
  const state = parts.slice(0, index + 1).join(path.sep) || path.parse(absolute).root;
  const workspace = path.dirname(state);
  await assertWritePathInsideWorkspace(workspace, absolute);
}
