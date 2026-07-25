import fs from "node:fs/promises";
import path from "node:path";
import { exists } from "./fsutil.js";
import { versionConstraintsOverlap } from "./version-constraint.js";

export async function readProjectExpectations(dir) {
  const [pkgDocument, nvmrcDocument, nodeVersionDocument, pythonVersionDocument, toolVersionsDocument, miseDocument, pyprojectDocument, devboxDocument, rootDevcontainerDocument, nestedDevcontainerDocument] = await Promise.all([
    readJsonDocument(path.join(dir, "package.json")),
    readTextDocument(path.join(dir, ".nvmrc")),
    readTextDocument(path.join(dir, ".node-version")),
    readTextDocument(path.join(dir, ".python-version")),
    readTextDocument(path.join(dir, ".tool-versions")),
    readTextDocument(path.join(dir, "mise.toml")),
    readTextDocument(path.join(dir, "pyproject.toml")),
    readJsonDocument(path.join(dir, "devbox.json")),
    readJsonDocument(path.join(dir, ".devcontainer.json"), { jsonc: true }),
    readJsonDocument(path.join(dir, ".devcontainer", "devcontainer.json"), { jsonc: true })
  ]);
  const pkg = pkgDocument.value;
  const nvmrc = nvmrcDocument.value;
  const nodeVersion = nodeVersionDocument.value;
  const pythonVersion = pythonVersionDocument.value;
  const toolVersionsText = toolVersionsDocument.value;
  const miseText = miseDocument.value;
  const pyproject = pyprojectDocument.value;
  const devbox = devboxDocument.value;
  const rootDevcontainer = rootDevcontainerDocument.value;
  const nestedDevcontainer = nestedDevcontainerDocument.value;
  const toolVersions = parseToolVersions(toolVersionsText);
  const mise = parseMiseVersions(miseText);
  const nodeDeclarations = declarations([
    declaration("node", nvmrc, ".nvmrc"),
    declaration("node", nodeVersion, ".node-version"),
    declaration("node", toolVersions.nodejs || toolVersions.node, ".tool-versions"),
    declaration("node", mise.node || mise.nodejs, "mise.toml"),
    declaration("node", pkg?.engines?.node, "package.json#engines.node")
  ]);
  const pythonDeclarations = declarations([
    declaration("python", pythonVersion, ".python-version"),
    declaration("python", toolVersions.python, ".tool-versions"),
    declaration("python", mise.python, "mise.toml"),
    declaration("python", pyproject.match(/requires-python\s*=\s*["']([^"']+)/)?.[1], "pyproject.toml#requires-python")
  ]);
  const declaredNode = firstDeclaration(nodeDeclarations);
  const declaredPython = firstDeclaration(pythonDeclarations);
  const packageManager = parsePackageManager(pkg?.packageManager);
  const lockManagers = [];
  if (await exists(path.join(dir, "package-lock.json"))) lockManagers.push("npm");
  if (await exists(path.join(dir, "pnpm-lock.yaml"))) lockManagers.push("pnpm");
  if (await exists(path.join(dir, "yarn.lock"))) lockManagers.push("yarn");
  const pythonSignals = [];
  if (pyproject) pythonSignals.push("pyproject.toml");
  if (await exists(path.join(dir, "requirements.txt"))) pythonSignals.push("requirements.txt");
  for (const source of uniqueSources([declaredPython, declaration("python", pyproject.match(/requires-python\s*=\s*["']([^"']+)/)?.[1], "pyproject.toml#requires-python")])) pythonSignals.push(source);
  return {
    evidenceModel: {
      values: [declaredNode, declaredPython].filter(Boolean),
      types: ["observed", "declared", "inferred", "human-verified", "unknown"],
      rule: "Declarations describe project intent; they do not prove the active executable or authorize environment changes."
    },
    sourceReads: [
      sourceRead("package.json", pkgDocument),
      sourceRead(".nvmrc", nvmrcDocument),
      sourceRead(".node-version", nodeVersionDocument),
      sourceRead(".python-version", pythonVersionDocument),
      sourceRead(".tool-versions", toolVersionsDocument),
      sourceRead("mise.toml", miseDocument),
      sourceRead("pyproject.toml", pyprojectDocument),
      sourceRead("devbox.json", devboxDocument),
      sourceRead(".devcontainer.json", rootDevcontainerDocument),
      sourceRead(".devcontainer/devcontainer.json", nestedDevcontainerDocument)
    ],
    declarations: { node: declaredNode, python: declaredPython },
    declarationCandidates: { node: nodeDeclarations, python: pythonDeclarations },
    declarationReviews: [
      declarationReview("node", nodeDeclarations),
      declarationReview("python", pythonDeclarations)
    ].filter(Boolean),
    packageManager,
    engines: compact({ node: pkg?.engines?.node, npm: pkg?.engines?.npm }),
    lockManagers,
    node: { versionFile: declaredNode?.value || "", declaration: declaredNode, signals: uniqueSources([declaredNode]) },
    python: {
      versionFile: declaredPython?.value || "",
      declaration: declaredPython,
      requiresPython: pyproject.match(/requires-python\s*=\s*["']([^"']+)/)?.[1] || "",
      signals: [...new Set(pythonSignals)]
    },
    environmentDefinitions: [
      devbox ? environmentDefinition("devbox", "devbox.json", {
        packageCount: Array.isArray(devbox.packages) ? devbox.packages.length : 0,
        scriptCount: Object.keys(devbox.shell?.scripts || {}).length,
        includeCount: Array.isArray(devbox.include) ? devbox.include.length : 0
      }) : null,
      rootDevcontainer ? devcontainerDefinition(".devcontainer.json", rootDevcontainer) : null,
      nestedDevcontainer ? devcontainerDefinition(".devcontainer/devcontainer.json", nestedDevcontainer) : null
    ].filter(Boolean)
  };
}

export function parseToolVersions(value) {
  const result = {};
  for (const raw of String(value || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [tool, version] = line.split(/\s+/, 2);
    if (tool && version && !result[tool]) result[tool] = version;
  }
  return result;
}

export function parseMiseVersions(value) {
  const result = {};
  let inTools = false;
  for (const raw of String(value || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (/^\[tools\]$/i.test(line)) { inTools = true; continue; }
    if (/^\[/.test(line)) { inTools = false; continue; }
    if (!inTools) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*["']([^"']+)["']/);
    if (match && !result[match[1]]) result[match[1]] = match[2];
  }
  return result;
}

export function parsePackageManager(value) {
  const match = String(value || "").trim().match(/^(@?[^@]+)@(.+)$/);
  return match ? { name: match[1], version: match[2] } : null;
}

export function projectExpectationFindings(project = {}) {
  const findings = [];
  for (const review of project.declarationReviews || []) {
    if (review.status === "multiple-compatible") continue;
    const conflicting = review.status === "conflicting";
    findings.push({
      code: conflicting ? `${review.tool}-project-declarations-conflict` : `${review.tool}-project-declarations-unresolved`,
      severity: "review",
      message: conflicting
        ? `Project files contain incompatible ${review.tool} declarations.`
        : `Project files contain ${review.tool} declarations whose compatibility could not be determined safely.`,
      action: `Review project.declarationCandidates.${review.tool} before changing or selecting ${review.tool}.`,
      evidenceType: "declared-vs-declared"
    });
  }
  for (const source of project.sourceReads || []) {
    if (!["parse-error", "unreadable"].includes(source.status)) continue;
    findings.push({
      code: `project-declaration-${source.status}`,
      severity: "review",
      message: `${source.source} could not be used as project declaration evidence (${source.status}).`,
      action: `Review ${source.source} before relying on environment recommendations.`,
      evidenceType: "unknown"
    });
  }
  return findings;
}

function declaration(tool, value, source) {
  const clean = String(value || "").trim();
  return clean ? { tool, value: clean, source, evidenceType: "declared", authority: "project-intent-not-active-state" } : null;
}

function firstDeclaration(values) {
  return values.find(Boolean) || null;
}

function declarations(values) {
  return values.filter(Boolean);
}

function declarationReview(tool, values) {
  if (values.length < 2) return null;
  const incompatiblePairs = [];
  const unresolvedPairs = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const pair = { leftSource: values[left].source, rightSource: values[right].source };
      const compatible = versionConstraintsOverlap(values[left].value, values[right].value);
      if (compatible === false) incompatiblePairs.push(pair);
      if (compatible === null) unresolvedPairs.push(pair);
    }
  }
  return {
    tool,
    status: incompatiblePairs.length ? "conflicting" : unresolvedPairs.length ? "review-required" : "multiple-compatible",
    declarationCount: values.length,
    incompatiblePairs,
    unresolvedPairs,
    evidenceType: "declared-vs-declared",
    rule: "Multiple project declarations require review; precedence does not erase conflicting or unsupported intent."
  };
}

function uniqueSources(values) {
  return [...new Set(values.filter(Boolean).map((item) => item.source))];
}

function environmentDefinition(kind, source, summary) {
  return { kind, source, summary, evidenceType: "declared", authority: "environment-definition-not-active-state" };
}

function devcontainerDefinition(source, value) {
  return environmentDefinition("devcontainer", source, {
    featureCount: Object.keys(value.features || {}).length,
    hasImage: Boolean(value.image),
    hasBuild: Boolean(value.build || value.dockerFile)
  });
}

async function readTextDocument(file) {
  try { return { value: (await fs.readFile(file, "utf8")).replace(/^\uFEFF/, "").trim(), status: "parsed", format: "text" }; } catch (error) {
    return { value: "", status: error?.code === "ENOENT" ? "missing" : "unreadable", format: "text" };
  }
}

async function readJsonDocument(file, options = {}) {
  let raw;
  try { raw = (await fs.readFile(file, "utf8")).replace(/^\uFEFF/, ""); } catch (error) {
    return { value: null, status: error?.code === "ENOENT" ? "missing" : "unreadable", format: "unknown" };
  }
  try { return { value: JSON.parse(raw), status: "parsed", format: "json" }; } catch {}
  if (options.jsonc) {
    try { return { value: JSON.parse(stripJsonCommentsAndTrailingCommas(raw)), status: "parsed", format: "jsonc" }; } catch {}
  }
  return { value: null, status: "parse-error", format: options.jsonc ? "json-or-jsonc" : "json" };
}

export function stripJsonCommentsAndTrailingCommas(value) {
  let output = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (lineComment) {
      if (char === "\n" || char === "\r") { lineComment = false; output += char; }
      else output += " ";
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; output += "  "; index += 1; }
      else output += char === "\n" || char === "\r" ? char : " ";
      continue;
    }
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; output += char; continue; }
    if (char === "/" && next === "/") { lineComment = true; output += "  "; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; output += "  "; index += 1; continue; }
    output += char;
  }
  if (blockComment) throw new SyntaxError("Unterminated JSONC block comment");
  return removeTrailingCommas(output);
}

function removeTrailingCommas(value) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; output += char; continue; }
    if (char === ",") {
      let cursor = index + 1;
      while (/\s/.test(value[cursor] || "")) cursor += 1;
      if (["}", "]"].includes(value[cursor])) continue;
    }
    output += char;
  }
  return output;
}

function sourceRead(source, document) {
  return {
    source,
    status: document.status,
    format: document.format,
    evidenceType: document.status === "parsed" ? "declared" : document.status === "missing" ? "unknown" : "unknown",
    authority: document.status === "parsed" ? "project-declaration-readable" : document.status === "missing" ? "declaration-not-present" : "declaration-unreadable"
  };
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item));
}
