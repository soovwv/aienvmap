import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCommonRuntimes, parseDotnetRuntimes, parseLinuxJavaAlternatives, parseMacJavaHomes, parseRustToolchains, parseVersionLines, parseWindowsJavaRegistry } from "../src/runtime-discovery.js";

test("parseVersionLines extracts installed SDK versions", () => {
  assert.deepEqual(parseVersionLines("8.0.410 [C:\\dotnet\\sdk]\n9.0.100-preview.1 [C:\\dotnet\\sdk]\n"), ["8.0.410", "9.0.100-preview.1"]);
});

test("common runtime findings stay informational", () => {
  const findings = analyzeCommonRuntimes({
    java: {
      label: "Java",
      installations: [{ version: "17" }, { version: "21" }],
      distinctVersions: ["17", "21"]
    }
  });
  assert.equal(findings[0].code, "multiple-java-installations");
  assert.equal(findings[0].severity, "info");
  assert.match(findings[0].action, /inventory evidence only/);
});

test("parseDotnetRuntimes preserves runtime family, version, and path", () => {
  assert.deepEqual(parseDotnetRuntimes("Microsoft.NETCore.App 8.0.16 [C:\\dotnet\\shared\\Microsoft.NETCore.App]\n"), [{
    name: "Microsoft.NETCore.App",
    version: "8.0.16",
    path: "C:\\dotnet\\shared\\Microsoft.NETCore.App"
  }]);
});

test("parseRustToolchains marks active and default toolchains", () => {
  assert.deepEqual(parseRustToolchains("stable-x86_64-pc-windows-msvc (active, default)\nnightly-x86_64-pc-windows-msvc\n"), [
    { name: "stable-x86_64-pc-windows-msvc", active: true, default: true },
    { name: "nightly-x86_64-pc-windows-msvc", active: false, default: false }
  ]);
});

test("Windows Java registry parser extracts and deduplicates vendor homes", () => {
  const raw = [
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\JavaSoft\\JDK\\21",
    "    JavaHome    REG_SZ    C:\\Program Files\\Java\\jdk-21",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\Eclipse Adoptium\\JDK\\17",
    "    Path    REG_SZ    C:\\Program Files\\Eclipse Adoptium\\jdk-17",
    "    JavaHome    REG_SZ    C:\\Program Files\\Java\\jdk-21"
  ].join("\n");
  assert.deepEqual(parseWindowsJavaRegistry(raw), [
    "C:\\Program Files\\Java\\jdk-21",
    "C:\\Program Files\\Eclipse Adoptium\\jdk-17"
  ]);
});

test("macOS java_home parser extracts JDK homes from verbose stderr", () => {
  const raw = [
    "Matching Java Virtual Machines (2):",
    "    21.0.2 (arm64) \"Oracle\" - \"Java SE 21\" /Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home",
    "    17.0.10 (arm64) \"Eclipse\" - \"Temurin 17\" /Users/test/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
  ].join("\n");
  assert.deepEqual(parseMacJavaHomes(raw), [
    "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home",
    "/Users/test/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
  ]);
});

test("Linux alternatives parser accepts only absolute java executables", () => {
  assert.deepEqual(parseLinuxJavaAlternatives("/usr/lib/jvm/java-17/bin/java\nrelative/java\n/usr/bin/javac\n/usr/lib/jvm/java-21/bin/java\n"), [
    "/usr/lib/jvm/java-17/bin/java",
    "/usr/lib/jvm/java-21/bin/java"
  ]);
});
