import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exists } from "./fsutil.js";
import { commandOutput, commandVersion } from "./shell.js";

export async function inspectCommonRuntimes(options = {}) {
  const definitions = runtimeDefinitions(options.env || process.env, options.home || os.homedir());
  const entries = await Promise.all(definitions.map(async (definition) => {
    const candidates = await findRuntimeCandidates(definition, options);
    const installations = (await Promise.all(candidates.map((candidate) => inspectRuntimeCandidate(definition, candidate, options)))).filter(Boolean);
    installations.forEach((item, index) => { item.active = index === 0; });
    return [definition.id, {
      label: definition.label,
      detailLevel: "path-and-version-only",
      installations,
      active: installations.find((item) => item.active) || null,
      distinctVersions: [...new Set(installations.flatMap((item) => item.versions?.length ? item.versions : [item.version]).filter(Boolean))]
    }];
  }));
  return Object.fromEntries(entries);
}

export async function findRuntimeCandidates(definition, options = {}) {
  const found = [];
  const seen = new Set();
  const add = async (file, source, scope, discovery) => {
    if (!file || !(await exists(file))) return;
    let key = path.resolve(file).toLowerCase();
    try { key = (await fs.realpath(file)).toLowerCase(); } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: path.resolve(file), source, scope, discovery });
  };
  for (const dir of pathEntries(options.pathValue ?? process.env.PATH)) {
    for (const name of definition.names) await add(path.join(dir, name), classifySource(dir), classifyScope(dir), "PATH");
  }
  for (const candidate of definition.direct || []) await add(candidate.path, candidate.source, candidate.scope, "known-path");
  for (const root of definition.roots || []) {
    for (const file of await namedFilesBelow(root.path, root.depth, definition.names)) await add(file, root.source, root.scope, "known-root");
  }
  return found;
}

export function analyzeCommonRuntimes(runtimes = {}) {
  const findings = [];
  for (const [runtime, value] of Object.entries(runtimes)) {
    if ((value.installations || []).length <= 1 && (value.distinctVersions || []).length <= 1) continue;
    findings.push({
      code: `multiple-${runtime}-installations`,
      severity: "info",
      message: `${value.installations.length} ${value.label} executable paths expose version(s): ${value.distinctVersions.join(", ") || "unknown"}.`,
      action: "Treat this as inventory evidence only; confirm project requirements and runtime-manager ownership before consolidation."
    });
  }
  return findings;
}

async function inspectRuntimeCandidate(definition, candidate, options) {
  const version = await commandVersion(candidate.path, definition.versionArgs);
  if (!version) return null;
  const versions = definition.listArgs
    ? parseVersionLines(await commandOutput(candidate.path, definition.listArgs, { timeout: 8000, maxBuffer: 2 * 1024 * 1024 }))
    : [];
  const details = await inspectRuntimeDetails(definition.id, candidate.path, options);
  return {
    runtime: definition.id,
    version,
    versions,
    path: displayPath(candidate.path, options),
    source: candidate.source,
    scope: candidate.scope,
    discovery: candidate.discovery,
    ...details
  };
}

async function inspectRuntimeDetails(id, executable, options) {
  const dir = path.dirname(executable);
  if (id === "java") {
    const javac = path.join(dir, process.platform === "win32" ? "javac.exe" : "javac");
    return {
      javaHome: displayPath(path.dirname(dir), options),
      compilerVersion: await commandVersion(javac, ["-version"]),
      javaHomeMatchesEnvironment: process.env.JAVA_HOME
        ? normalize(path.dirname(dir)) === normalize(process.env.JAVA_HOME)
        : null
    };
  }
  if (id === "dotnet") {
    const raw = await commandOutput(executable, ["--list-runtimes"], { timeout: 8000, maxBuffer: 2 * 1024 * 1024 });
    return { runtimes: parseDotnetRuntimes(raw) };
  }
  if (id === "rust") {
    const rustup = process.platform === "win32" ? "rustup.exe" : "rustup";
    return { toolchains: parseRustToolchains(await commandOutput(rustup, ["toolchain", "list"], { timeout: 5000 })) };
  }
  if (id === "go") {
    const raw = await commandOutput(executable, ["env", "GOROOT", "GOPATH", "GOTOOLCHAIN"], { timeout: 5000 });
    const [goroot = "", gopath = "", gotoolchain = ""] = raw.split(/\r?\n/);
    return { goroot: displayPath(goroot, options), gopath: displayPath(gopath, options), gotoolchain };
  }
  if (id === "ruby") {
    return { gemHome: displayPath(await commandOutput("gem", ["env", "home"], { timeout: 5000 }), options) };
  }
  return {};
}

export function parseVersionLines(raw) {
  return [...new Set(String(raw || "").split(/\r?\n/).map((line) => line.trim().match(/^(\d+(?:\.\d+)+(?:[-\w.]*)?)/)?.[1]).filter(Boolean))];
}

export function parseDotnetRuntimes(raw) {
  return String(raw || "").split(/\r?\n/).map((line) => {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\[(.+)]$/);
    return match ? { name: match[1], version: match[2], path: match[3] } : null;
  }).filter(Boolean);
}

export function parseRustToolchains(raw) {
  return String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => ({
    name: line.replace(/\s+\([^)]*\)\s*$/, ""),
    active: /\bactive\b/.test(line),
    default: /\bdefault\b/.test(line)
  }));
}

function runtimeDefinitions(env, home) {
  const win = process.platform === "win32";
  const exe = (name) => win ? `${name}.exe` : name;
  const definitions = [
    {
      id: "java", label: "Java", names: [exe("java")], versionArgs: ["-version"],
      direct: env.JAVA_HOME ? [{ path: path.join(env.JAVA_HOME, "bin", exe("java")), source: "JAVA_HOME", scope: "configured" }] : [],
      roots: win ? javaWindowsRoots(env) : javaUnixRoots()
    },
    {
      id: "dotnet", label: ".NET SDK", names: [exe("dotnet")], versionArgs: ["--version"], listArgs: ["--list-sdks"],
      direct: win
        ? [{ path: path.join(env.ProgramFiles || "C:\\Program Files", "dotnet", "dotnet.exe"), source: "system", scope: "host" }, { path: path.join(home, ".dotnet", "dotnet.exe"), source: "dotnet-install", scope: "user" }]
        : [{ path: "/usr/share/dotnet/dotnet", source: "system", scope: "host" }, { path: "/usr/local/share/dotnet/dotnet", source: "system", scope: "host" }, { path: path.join(home, ".dotnet", "dotnet"), source: "dotnet-install", scope: "user" }]
    },
    {
      id: "ruby", label: "Ruby", names: [exe("ruby")], versionArgs: ["--version"],
      roots: win ? [] : [{ path: path.join(home, ".rbenv", "versions"), depth: 4, source: "rbenv", scope: "user" }, { path: path.join(home, ".rvm", "rubies"), depth: 4, source: "rvm", scope: "user" }]
    },
    {
      id: "go", label: "Go", names: [exe("go")], versionArgs: ["version"],
      direct: win ? [] : [{ path: "/usr/local/go/bin/go", source: "system", scope: "host" }]
    },
    {
      id: "rust", label: "Rust", names: [exe("rustc")], versionArgs: ["--version"],
      direct: [{ path: path.join(home, ".cargo", "bin", exe("rustc")), source: "rustup", scope: "user" }],
      roots: [{ path: path.join(home, ".rustup", "toolchains"), depth: 4, source: "rustup", scope: "user" }]
    }
  ];
  return definitions;
}

function javaWindowsRoots(env) {
  const programFiles = env.ProgramFiles || "C:\\Program Files";
  return [
    { path: path.join(programFiles, "Java"), depth: 4, source: "java-installer", scope: "host" },
    { path: path.join(programFiles, "Eclipse Adoptium"), depth: 4, source: "adoptium", scope: "host" },
    { path: path.join(programFiles, "Microsoft", "jdk"), depth: 4, source: "microsoft-jdk", scope: "host" }
  ];
}

function javaUnixRoots() {
  const home = os.homedir();
  const shared = [
    { path: path.join(home, ".sdkman", "candidates", "java"), depth: 5, source: "sdkman", scope: "user" },
    { path: path.join(home, ".local", "share", "mise", "installs", "java"), depth: 5, source: "mise", scope: "user" }
  ];
  return process.platform === "darwin"
    ? [{ path: "/Library/Java/JavaVirtualMachines", depth: 6, source: "java-framework", scope: "host" }, ...shared]
    : [{ path: "/usr/lib/jvm", depth: 5, source: "system", scope: "host" }, ...shared];
}

async function namedFilesBelow(root, depth, names) {
  if (!root || depth < 0 || !(await exists(root))) return [];
  let entries = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await namedFilesBelow(full, depth - 1, names));
    else if (names.includes(entry.name.toLowerCase())) out.push(full);
  }
  return out;
}

function pathEntries(value) {
  return String(value || "").split(path.delimiter).map((item) => item.trim()).filter(Boolean);
}

function classifySource(value) {
  const lower = String(value).toLowerCase();
  for (const manager of ["sdkman", "jenv", "rbenv", "rvm", "rustup", "mise", "asdf"]) if (lower.includes(manager)) return manager;
  if (lower.includes("program files") || lower.startsWith("/usr/") || lower.startsWith("/opt/")) return "system";
  return "path";
}

function classifyScope(value) {
  return String(value).toLowerCase().startsWith(os.homedir().toLowerCase()) ? "user" : "host";
}

function displayPath(value, options) {
  if (!value) return "";
  const normalized = path.normalize(value);
  if (options.showPaths) return normalized;
  const home = path.normalize(os.homedir());
  return normalized.toLowerCase().startsWith(home.toLowerCase()) ? `$HOME${normalized.slice(home.length)}` : normalized;
}

function normalize(value) {
  return path.normalize(String(value || "")).toLowerCase();
}
