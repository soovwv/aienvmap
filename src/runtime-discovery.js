import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exists } from "./fsutil.js";
import { commandOutput, commandResult, commandVersion } from "./shell.js";

export async function inspectCommonRuntimes(options = {}) {
  const definitions = runtimeDefinitions(options.env || process.env, options.home || os.homedir());
  const entries = await Promise.all(definitions.map(async (definition) => {
    const candidates = await findRuntimeCandidates(definition, options);
    const installations = (await Promise.all(candidates.map((candidate) => inspectRuntimeCandidate(definition, candidate, options)))).filter(Boolean);
    installations.forEach((item, index) => { item.active = index === 0; });
    const runtimeMetadata = definition.id === "java" ? summarizeJavaMetadata(installations) : null;
    const buildTools = definition.id === "java" ? await inspectJavaBuildTools(installations, options) : null;
    return [definition.id, {
      label: definition.label,
      detailLevel: "path-and-version-only",
      installations,
      active: installations.find((item) => item.active) || null,
      distinctVersions: [...new Set(installations.flatMap((item) => item.versions?.length ? item.versions : [item.version]).filter(Boolean))],
      discoveryEvidence: summarizeDiscoveryEvidence(installations),
      ...(definition.id === "java" ? { runtimeMetadata, buildTools } : {})
    }];
  }));
  return Object.fromEntries(entries);
}

export async function inspectJavaBuildTools(installations = [], options = {}) {
  const projectDir = options.projectDir || process.cwd();
  const win = (options.platform || process.platform) === "win32";
  const definitions = [
    { tool: "maven", wrapper: win ? "mvnw.cmd" : "mvnw", command: win ? "mvn.cmd" : "mvn", args: ["-version"], parser: parseMavenVersion },
    { tool: "gradle", wrapper: win ? "gradlew.bat" : "gradlew", command: win ? "gradle.bat" : "gradle", args: ["--version"], parser: parseGradleVersion }
  ];
  const bindings = await Promise.all(definitions.map(async (definition) => {
    const wrapper = path.join(projectDir, definition.wrapper);
    const usesWrapper = await exists(wrapper);
    const result = await javaBuildToolResult(usesWrapper ? wrapper : definition.command, definition.args, {
      cwd: projectDir, timeout: 6000, maxBuffer: 1024 * 1024
    }, win);
    const parsed = definition.parser(`${result.stdout}\n${result.stderr}`);
    if (!parsed.toolVersion) return null;
    return linkJavaBuildTool({
      tool: definition.tool,
      toolVersion: parsed.toolVersion,
      commandSource: usesWrapper ? "project-wrapper" : "PATH",
      javaVersion: parsed.javaVersion,
      vendor: parsed.vendor,
      javaHome: displayPath(parsed.javaHome, options),
      runtimeRole: definition.tool === "gradle" ? "daemon-jvm" : "maven-runtime",
      ...(definition.tool === "gradle" ? {
        launcherJavaVersion: parsed.launcherJavaVersion,
        launcherVendor: parsed.launcherVendor,
        daemonJavaHome: displayPath(parsed.daemonJavaHome, options)
      } : {}),
      evidence: parsed.javaVersion || parsed.javaHome ? "reported-by-tool" : "tool-only"
    }, installations);
  }));
  return {
    bindings: bindings.filter(Boolean),
    rule: "Build-tool JVM bindings are read-only evidence; they do not authorize wrapper, JAVA_HOME, PATH, or runtime changes."
  };
}

async function javaBuildToolResult(command, args, options, win) {
  if (!win || !/\.(?:cmd|bat)$/i.test(command)) return commandResult(command, args, options);
  const comspec = process.env.ComSpec || "cmd.exe";
  return commandResult(comspec, ["/d", "/c", command, ...args], options);
}

export function parseMavenVersion(raw) {
  const text = String(raw || "");
  const runtime = text.match(/^Java version:\s*([^,\r\n]+)(?:,\s*vendor:\s*([^,\r\n]+))?(?:,\s*runtime:\s*(.+))?$/im);
  return {
    toolVersion: text.match(/^Apache Maven\s+([^\s\r\n]+)/im)?.[1] || "",
    javaVersion: runtime?.[1]?.trim() || "",
    vendor: runtime?.[2]?.trim() || "",
    javaHome: runtime?.[3]?.trim() || ""
  };
}

export function parseGradleVersion(raw) {
  const text = String(raw || "");
  const jvm = text.match(/^(?:Launcher JVM|JVM):\s*([^\s(,]+)(?:\s*\(([^)]+)\))?/im);
  const daemon = text.match(/^Daemon JVM:\s*(.+?)(?:\s+\([^)]*\))?\s*$/im);
  return {
    toolVersion: text.match(/^Gradle\s+([^\s\r\n]+)/im)?.[1] || "",
    javaVersion: "",
    vendor: "",
    javaHome: daemon?.[1]?.trim() || "",
    launcherJavaVersion: jvm?.[1]?.trim() || "",
    launcherVendor: jvm?.[2]?.trim() || "",
    daemonJavaHome: daemon?.[1]?.trim() || ""
  };
}

export function linkJavaBuildTool(binding, installations = []) {
  const exact = binding.javaHome && installations.find((item) => normalize(item.javaHome) === normalize(binding.javaHome));
  if (exact) return { ...binding, runtimePath: exact.path, relationship: "exact-home", confidence: "strong" };
  const major = String(binding.javaVersion || "").match(/^\d+/)?.[0];
  const versionMatches = major ? installations.filter((item) => String(item.runtimeVersion || item.version || "").match(/^\d+/)?.[0] === major) : [];
  if (versionMatches.length === 1) return { ...binding, runtimePath: versionMatches[0].path, relationship: "unique-major-version", confidence: "medium" };
  return { ...binding, runtimePath: "", relationship: "unresolved", confidence: "none" };
}

export function summarizeDiscoveryEvidence(installations = []) {
  return {
    sources: [...new Set(installations.map((item) => item.source).filter(Boolean))].sort(),
    pathCount: installations.filter((item) => item.discovery === "PATH").length,
    configuredCount: installations.filter((item) => item.discovery === "known-path").length,
    knownRootCount: installations.filter((item) => item.discovery === "known-root").length,
    osNativeCount: installations.filter((item) => item.discovery === "os-native").length,
    rule: "Discovery source is inventory provenance, not permission to modify or remove the runtime."
  };
}

export function summarizeJavaMetadata(installations = []) {
  return {
    vendors: [...new Set(installations.map((item) => item.vendor).filter(Boolean))].sort(),
    architectures: [...new Set(installations.map((item) => item.architecture).filter(Boolean))].sort(),
    runtimeKinds: [...new Set(installations.map((item) => item.runtimeKind).filter(Boolean))].sort(),
    propertyEvidenceCount: installations.filter((item) => item.propertyEvidence === "collected").length,
    compilerCount: installations.filter((item) => item.hasCompiler === true).length,
    managers: [...new Set(installations.map((item) => item.managerEvidence?.manager).filter((item) => item && item !== "unknown"))].sort(),
    managedInstallCount: installations.filter((item) => item.managerEvidence?.ownershipProven === true).length,
    routingManagedCount: installations.filter((item) => item.managerEvidence?.routingManaged === true).length,
    rule: "Runtime metadata comes from Java system properties and sibling javac evidence; it does not authorize changes."
  };
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
  if (definition.id === "java") {
    for (const candidate of await nativeJavaCandidates(options)) await add(candidate.path, candidate.source, candidate.scope, "os-native");
  }
  for (const root of definition.roots || []) {
    for (const file of await namedFilesBelow(root.path, root.depth, definition.names)) await add(file, root.source, root.scope, "known-root");
  }
  return found;
}

export async function nativeJavaCandidates(options = {}) {
  const platform = options.platform || process.platform;
  if (platform === "win32") {
    const roots = [
      "HKLM\\SOFTWARE\\JavaSoft",
      "HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft",
      "HKLM\\SOFTWARE\\Eclipse Adoptium",
      "HKLM\\SOFTWARE\\Microsoft\\JDK"
    ];
    const outputs = await Promise.all(roots.map((root) => commandOutput("reg.exe", ["query", root, "/s"], { timeout: 3500, maxBuffer: 2 * 1024 * 1024 })));
    return parseWindowsJavaRegistry(outputs.join("\n")).map((home) => ({
      path: javaExecutableForHome(home, platform), source: "windows-registry", scope: "host"
    }));
  }
  if (platform === "darwin") {
    const result = await commandResult("/usr/libexec/java_home", ["-V"], { timeout: 5000, maxBuffer: 1024 * 1024 });
    return parseMacJavaHomes(`${result.stdout}\n${result.stderr}`).map((home) => ({
      path: javaExecutableForHome(home, platform), source: "macos-java-home", scope: "host"
    }));
  }
  const raw = await commandOutput("update-alternatives", ["--list", "java"], { timeout: 3500, maxBuffer: 1024 * 1024 });
  return parseLinuxJavaAlternatives(raw).map((file) => ({ path: file, source: "linux-alternatives", scope: "host" }));
}

export function parseWindowsJavaRegistry(raw) {
  return uniquePaths(String(raw || "").split(/\r?\n/).map((line) => line.match(/^\s*(?:JavaHome|Path|InstallationPath)\s+REG_\w+\s+(.+?)\s*$/i)?.[1]).filter(Boolean));
}

export function parseMacJavaHomes(raw) {
  const homes = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    const match = line.match(/(\/[^\r\n]*\/Contents\/Home)\s*$/);
    if (match) homes.push(match[1].trim());
  }
  return uniquePaths(homes);
}

export function parseLinuxJavaAlternatives(raw) {
  return uniquePaths(String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("/") && /(?:^|\/)java$/.test(line)));
}

function javaExecutableForHome(home, platform) {
  const normalized = String(home || "").replace(/[\\/]+$/, "");
  if (/(?:^|[\\/])java(?:\.exe)?$/i.test(normalized)) return normalized;
  if (/(?:^|[\\/])bin$/i.test(normalized)) return path.join(normalized, platform === "win32" ? "java.exe" : "java");
  return path.join(normalized, "bin", platform === "win32" ? "java.exe" : "java");
}

function uniquePaths(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalize(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

export function analyzeJavaBuildTools(java = {}) {
  const installations = java.installations || [];
  if (installations.length <= 1) return [];
  const activePath = installations.find((item) => item.active)?.path || "";
  return (java.buildTools?.bindings || []).flatMap((binding) => {
    if (binding.confidence === "strong" && normalize(binding.runtimePath) !== normalize(activePath)) return [{
      code: `java-${binding.tool}-runtime-divergence`,
      severity: "review",
      message: `${binding.tool} reports a JVM different from the active java command.`,
      action: "Review project wrapper settings, JAVA_HOME, and runtime requirements; do not change them automatically."
    }];
    if (binding.confidence !== "strong") return [{
      code: `java-${binding.tool}-runtime-ambiguous`,
      severity: "review",
      message: `${binding.tool} JVM evidence does not identify one installed Java home exactly.`,
      action: "Inspect the reported tool JVM and project requirements before changing Java routing."
    }];
    return [];
  });
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
    ...details,
    ...(definition.id === "java" ? { managerEvidence: javaManagerEvidence(candidate, details, options) } : {})
  };
}

export function javaManagerEvidence(candidate = {}, details = {}, options = {}) {
  const sourceManager = ["sdkman", "mise", "jenv"].includes(candidate.source) ? candidate.source : "unknown";
  const roots = javaManagerRoots(options.env || process.env, options.home || os.homedir(), options.platform || process.platform)
    .map((item) => ({ ...item, displayPath: displayPath(item.path, options) }));
  const canonicalRoot = roots.find((item) => item.source !== "jenv" && pathIsWithin(details.javaHome, item.displayPath));
  const manager = canonicalRoot?.source || sourceManager;
  const base = {
    manager,
    relationship: "unconfirmed",
    confidence: "none",
    ownershipProven: false,
    routingManaged: false,
    proofScope: "none",
    removalAuthorized: false
  };
  if (manager === "unknown") return base;
  if (manager === "jenv") return {
    ...base,
    relationship: "registered-runtime-routing",
    confidence: "medium",
    routingManaged: true,
    proofScope: "jenv-routing-only"
  };
  const insideManagedRoot = canonicalRoot?.source === manager;
  return {
    ...base,
    relationship: insideManagedRoot ? "canonical-home-in-install-root" : "registered-or-shimmed-runtime",
    confidence: insideManagedRoot ? "strong" : "medium",
    ownershipProven: insideManagedRoot,
    routingManaged: true,
    proofScope: insideManagedRoot ? `${manager}-install-root` : `${manager}-routing-only`
  };
}

function pathIsWithin(value, root) {
  if (!value || !root) return false;
  const relative = path.relative(path.normalize(root), path.normalize(value));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function inspectRuntimeDetails(id, executable, options) {
  const dir = path.dirname(executable);
  if (id === "java") {
    const javac = path.join(dir, process.platform === "win32" ? "javac.exe" : "javac");
    const [compilerVersion, propertyResult] = await Promise.all([
      commandVersion(javac, ["-version"]),
      commandResult(executable, ["-XshowSettings:properties", "-version"], { timeout: 5000, maxBuffer: 2 * 1024 * 1024 })
    ]);
    const properties = parseJavaProperties(`${propertyResult.stdout}\n${propertyResult.stderr}`);
    const computedJavaHome = path.dirname(dir);
    const reportedJavaHome = properties.javaHome || "";
    const javaHome = reportedJavaHome || computedJavaHome;
    return {
      javaHome: displayPath(javaHome, options),
      computedJavaHome: displayPath(computedJavaHome, options),
      javaHomeSource: reportedJavaHome ? "java-system-property" : "executable-parent",
      compilerVersion,
      hasCompiler: Boolean(compilerVersion),
      runtimeKind: compilerVersion ? "jdk" : "jre-or-runtime-image",
      vendor: properties.vendor,
      vendorVersion: properties.vendorVersion,
      architecture: properties.architecture,
      runtimeName: properties.runtimeName,
      runtimeVersion: properties.runtimeVersion,
      vmName: properties.vmName,
      vmVendor: properties.vmVendor,
      propertyEvidence: Object.values(properties).some(Boolean) ? "collected" : "unavailable",
      javaHomeMatchesEnvironment: process.env.JAVA_HOME
        ? normalize(javaHome) === normalize(process.env.JAVA_HOME)
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

export function parseJavaProperties(raw) {
  const values = {};
  for (const line of String(raw || "").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return {
    javaHome: values["java.home"] || "",
    vendor: values["java.vendor"] || "",
    vendorVersion: values["java.vendor.version"] || "",
    runtimeName: values["java.runtime.name"] || "",
    runtimeVersion: values["java.runtime.version"] || values["java.version"] || "",
    vmName: values["java.vm.name"] || "",
    vmVendor: values["java.vm.vendor"] || "",
    architecture: values["os.arch"] || "",
    osName: values["os.name"] || ""
  };
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
      roots: [...(win ? javaWindowsRoots(env) : javaUnixRoots()), ...javaManagerRoots(env, home, process.platform)]
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
  return process.platform === "darwin"
    ? [{ path: "/Library/Java/JavaVirtualMachines", depth: 6, source: "java-framework", scope: "host" }]
    : [{ path: "/usr/lib/jvm", depth: 5, source: "system", scope: "host" }];
}

function javaManagerRoots(env, home, platform) {
  const win = platform === "win32";
  const miseInstalls = env.MISE_INSTALLS_DIR || (win
    ? path.join(env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "mise", "installs")
    : path.join(home, ".local", "share", "mise", "installs"));
  const sdkmanCandidates = env.SDKMAN_CANDIDATES_DIR || path.join(home, ".sdkman", "candidates");
  const jenvRoot = env.JENV_ROOT || path.join(home, ".jenv");
  return [
    { path: path.join(sdkmanCandidates, "java"), depth: 5, source: "sdkman", scope: "user" },
    { path: path.join(miseInstalls, "java"), depth: 5, source: "mise", scope: "user" },
    { path: path.join(jenvRoot, "versions"), depth: 6, source: "jenv", scope: "user" }
  ];
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
