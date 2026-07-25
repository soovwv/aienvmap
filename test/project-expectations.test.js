import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "./temp-cleanup.js";
import { parseMiseVersions, parseToolVersions, projectExpectationFindings, readProjectExpectations, stripJsonCommentsAndTrailingCommas } from "../src/project-expectations.js";

test("project declaration parsers keep the first bounded tool version", () => {
  assert.deepEqual(parseToolVersions("nodejs 22.12.0\npython 3.12.4 3.11.9\n"), { nodejs: "22.12.0", python: "3.12.4" });
  assert.deepEqual(parseMiseVersions("[tools]\nnode = \"22.12.0\"\npython = '3.12.4'\n[env]\nnode = \"ignored\"\n"), { node: "22.12.0", python: "3.12.4" });
});

test("project expectations normalize declarations and environment definitions", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-expectations-"));
  await fs.writeFile(path.join(dir, ".tool-versions"), "nodejs 22.12.0\npython 3.12.4\n", "utf8");
  await fs.writeFile(path.join(dir, "mise.toml"), "[tools]\nnode = \"20.0.0\"\n", "utf8");
  await fs.writeFile(path.join(dir, "devbox.json"), JSON.stringify({ packages: ["nodejs@22"], shell: { scripts: { test: "npm test" } } }), "utf8");
  await fs.mkdir(path.join(dir, ".devcontainer"));
  await fs.writeFile(path.join(dir, ".devcontainer", "devcontainer.json"), JSON.stringify({ image: "node:22", features: { "ghcr.io/devcontainers/features/git:1": {} } }), "utf8");
  const result = await readProjectExpectations(dir);
  assert.deepEqual(result.declarations.node, {
    tool: "node", value: "22.12.0", source: ".tool-versions", evidenceType: "declared", authority: "project-intent-not-active-state"
  });
  assert.equal(result.declarations.python.source, ".tool-versions");
  assert.deepEqual(result.declarationCandidates.node.map((item) => item.source), [".tool-versions", "mise.toml"]);
  assert.equal(result.declarationReviews[0].status, "conflicting");
  assert.deepEqual(result.declarationReviews[0].incompatiblePairs, [{ leftSource: ".tool-versions", rightSource: "mise.toml" }]);
  assert.deepEqual(result.environmentDefinitions.map((item) => item.kind), ["devbox", "devcontainer"]);
  assert.deepEqual(result.environmentDefinitions.map((item) => item.summary), [
    { packageCount: 1, scriptCount: 1, includeCount: 0 },
    { featureCount: 1, hasImage: true, hasBuild: false }
  ]);
  assert.deepEqual(result.evidenceModel.types, ["observed", "declared", "inferred", "human-verified", "unknown"]);
  assert.equal(result.sourceReads.find((item) => item.source === ".tool-versions").status, "parsed");
  assert.equal(result.sourceReads.find((item) => item.source === "mise.toml").status, "parsed");
  assert.equal(result.sourceReads.find((item) => item.source === "devbox.json").status, "parsed");
});

test("compatible exact and range declarations stay visible without a false conflict", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-compatible-expectations-"));
  await fs.writeFile(path.join(dir, ".nvmrc"), "22.12.0\n", "utf8");
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ engines: { node: ">=22 <23" } }), "utf8");
  const result = await readProjectExpectations(dir);
  assert.equal(result.declarationCandidates.node.length, 2);
  assert.equal(result.declarationReviews[0].status, "multiple-compatible");
  assert.deepEqual(result.declarationReviews[0].incompatiblePairs, []);
});

test("disjoint range declarations are conflicts and unsupported syntax requires review", async () => {
  const conflictDir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-range-conflict-"));
  await fs.writeFile(path.join(conflictDir, "package.json"), JSON.stringify({ engines: { node: ">=22 <23" } }), "utf8");
  await fs.writeFile(path.join(conflictDir, "mise.toml"), "[tools]\nnode = \"<20\"\n", "utf8");
  const conflict = await readProjectExpectations(conflictDir);
  assert.equal(conflict.declarationReviews[0].status, "conflicting");
  assert.equal(projectExpectationFindings(conflict)[0].code, "node-project-declarations-conflict");

  const unresolvedDir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-range-unresolved-"));
  await fs.writeFile(path.join(unresolvedDir, ".nvmrc"), "workspace:*\n", "utf8");
  await fs.writeFile(path.join(unresolvedDir, "package.json"), JSON.stringify({ engines: { node: ">=22" } }), "utf8");
  const unresolved = await readProjectExpectations(unresolvedDir);
  assert.equal(unresolved.declarationReviews[0].status, "review-required");
  assert.equal(unresolved.declarationReviews[0].unresolvedPairs.length, 1);
  assert.equal(projectExpectationFindings(unresolved)[0].code, "node-project-declarations-unresolved");
});

test("Dev Container JSONC is parsed without changing comment-like string content", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-jsonc-"));
  await fs.mkdir(path.join(dir, ".devcontainer"));
  await fs.writeFile(path.join(dir, ".devcontainer", "devcontainer.json"), `{
    // a comment
    "image": "registry.example/a//b:22",
    "features": { "ghcr.io/devcontainers/features/git:1": {}, },
  }`, "utf8");
  const result = await readProjectExpectations(dir);
  assert.equal(result.environmentDefinitions[0].kind, "devcontainer");
  assert.deepEqual(result.environmentDefinitions[0].summary, { featureCount: 1, hasImage: true, hasBuild: false });
  const source = result.sourceReads.find((item) => item.source === ".devcontainer/devcontainer.json");
  assert.equal(source.status, "parsed");
  assert.equal(source.format, "jsonc");
  assert.equal(JSON.parse(stripJsonCommentsAndTrailingCommas('{"value":"x, } // y",}')).value, "x, } // y");
  assert.throws(() => stripJsonCommentsAndTrailingCommas('{"value": 1} /*'), /Unterminated/);
});

test("root and nested Dev Container definitions remain separate declared evidence", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-devcontainers-"));
  await fs.writeFile(path.join(dir, ".devcontainer.json"), `{
    // Root configuration
    "image": "node:22",
    "features": { "ghcr.io/devcontainers/features/node:1": {}, },
  }`, "utf8");
  await fs.mkdir(path.join(dir, ".devcontainer"));
  await fs.writeFile(path.join(dir, ".devcontainer", "devcontainer.json"), JSON.stringify({ build: { dockerfile: "Dockerfile" } }), "utf8");

  const result = await readProjectExpectations(dir);
  const definitions = result.environmentDefinitions.filter((item) => item.kind === "devcontainer");
  assert.deepEqual(definitions.map((item) => item.source), [".devcontainer.json", ".devcontainer/devcontainer.json"]);
  assert.deepEqual(definitions.map((item) => item.summary), [
    { featureCount: 1, hasImage: true, hasBuild: false },
    { featureCount: 0, hasImage: false, hasBuild: true }
  ]);
  assert.equal(result.sourceReads.find((item) => item.source === ".devcontainer.json").format, "jsonc");
  assert.ok(definitions.every((item) => item.authority === "environment-definition-not-active-state"));
});

test("malformed declaration JSON remains explicit instead of looking missing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-malformed-declaration-"));
  await fs.writeFile(path.join(dir, "package.json"), "{ malformed", "utf8");
  await fs.writeFile(path.join(dir, "devbox.json"), "{ malformed", "utf8");
  const result = await readProjectExpectations(dir);
  assert.equal(result.sourceReads.find((item) => item.source === "package.json").status, "parse-error");
  assert.equal(result.sourceReads.find((item) => item.source === "devbox.json").status, "parse-error");
  assert.equal(result.sourceReads.find((item) => item.source === ".devcontainer.json").status, "missing");
  assert.equal(result.sourceReads.find((item) => item.source === ".devcontainer/devcontainer.json").status, "missing");
  assert.equal(result.sourceReads[0].authority, "declaration-unreadable");
  assert.deepEqual(projectExpectationFindings(result).map((item) => item.code), ["project-declaration-parse-error", "project-declaration-parse-error"]);
});

test("node-version and pyproject ranges become provenance-labelled declarations", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aienvmap-ranges-"));
  await fs.writeFile(path.join(dir, ".node-version"), "22.12.0\n", "utf8");
  await fs.writeFile(path.join(dir, "pyproject.toml"), "[project]\nrequires-python = \">=3.12,<3.14\"\n", "utf8");
  const result = await readProjectExpectations(dir);
  assert.equal(result.declarations.node.source, ".node-version");
  assert.equal(result.declarations.python.source, "pyproject.toml#requires-python");
  assert.equal(result.declarations.python.value, ">=3.12,<3.14");
});
