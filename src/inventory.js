import { commandOutput } from "./shell.js";

const MAX_ITEMS = 40;

export async function scanGlobalInventory(options = {}) {
  if (!options.deep) {
    return {
      mode: "basic",
      enabled: false,
      note: "Run `aienvmap sync --deep` to collect read-only global tool inventory."
    };
  }

  return {
    mode: "deep",
    enabled: true,
    note: "Read-only global tool inventory. Use for AI awareness, not enforcement.",
    tools: compact({
      npmGlobal: await scanNpmGlobal(),
      pipx: await scanPipx(),
      uvTools: await scanUvTools(),
      brew: await scanBrew()
    })
  };
}

export async function scanNpmGlobal() {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const raw = await commandOutput(command, ["list", "-g", "--depth=0", "--json"], { timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
  return parseNpmGlobal(raw);
}

export async function scanPipx() {
  const raw = await commandOutput("pipx", ["list", "--json"], { timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
  return parsePipx(raw);
}

export async function scanUvTools() {
  const raw = await commandOutput("uv", ["tool", "list"], { timeout: 5000 });
  return parseNameVersionLines(raw);
}

export async function scanBrew() {
  if (process.platform === "win32") return [];
  const raw = await commandOutput("brew", ["list", "--versions"], { timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
  return parseNameVersionLines(raw);
}

export function parseNpmGlobal(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Object.entries(parsed.dependencies || {})
      .slice(0, MAX_ITEMS)
      .map(([name, value]) => ({ name, version: value.version || "unknown" }));
  } catch {
    return [];
  }
}

export function parsePipx(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Object.entries(parsed.venvs || {})
      .slice(0, MAX_ITEMS)
      .map(([name, value]) => ({
        name,
        version: value.metadata?.main_package?.package_version || "unknown"
      }));
  } catch {
    return [];
  }
}

export function parseNameVersionLines(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
    .map((line) => {
      const [name, ...rest] = line.split(/\s+/);
      return { name, version: rest.join(" ") || "unknown" };
    });
}

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => Array.isArray(value) && value.length));
}
