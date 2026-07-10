import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCommonRuntimes, parseDotnetRuntimes, parseRustToolchains, parseVersionLines } from "../src/runtime-discovery.js";

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
