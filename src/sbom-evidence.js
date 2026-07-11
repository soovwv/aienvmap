import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const MAX_EVIDENCE_BYTES = 32 * 1024 * 1024;
const MAX_COMPONENT_IDENTITIES = 256;
const MAX_DRIFT_SAMPLE = 20;

export async function importSbomEvidence(workspace, input) {
  const root = await fs.realpath(path.resolve(workspace));
  const file = await fs.realpath(path.resolve(workspace, String(input || "")));
  assertInsideWorkspace(root, file);
  const stat = await fs.stat(file);
  if (!stat.isFile()) throw new Error("external SBOM evidence must be a file");
  if (stat.size > MAX_EVIDENCE_BYTES) throw new Error(`external SBOM evidence exceeds ${MAX_EVIDENCE_BYTES} bytes`);
  const raw = await fs.readFile(file);
  let value;
  try { value = JSON.parse(raw.toString("utf8").replace(/^\uFEFF/, "")); } catch {
    throw new Error("external SBOM evidence must be valid JSON");
  }
  const parsed = parseExternalSbom(value);
  if (!parsed) throw new Error("unsupported external SBOM JSON; expected CycloneDX or SPDX");
  return {
    status: "imported",
    mode: "summary-reference",
    verification: "imported-now",
    artifact: relativeArtifact(root, file),
    digest: `sha256:${createHash("sha256").update(raw).digest("hex")}`,
    bytes: stat.size,
    ...parsed,
    limitations: [
      "The external file was not generated, validated, or executed by aienvmap.",
      "Counts and generator identity are summaries; read the original evidence before security or compliance claims.",
      "A matching digest proves file identity only, not freshness, completeness, exploitability, or trust."
    ],
    removalAuthorized: false
  };
}

export async function verifySbomEvidence(workspace, evidence) {
  if (!evidence || evidence.status !== "imported" || !evidence.artifact || !evidence.digest) return evidence;
  try {
    const current = await importSbomEvidence(workspace, evidence.artifact);
    if (current.digest === evidence.digest) return { ...evidence, verification: "digest-match" };
    return {
      ...evidence,
      status: "stale",
      verification: "digest-mismatch",
      currentDigest: current.digest,
      rule: "The external SBOM file changed after import; explicitly review and re-import it before relying on the new evidence."
    };
  } catch {
    return {
      ...evidence,
      status: "stale",
      verification: "source-unavailable",
      rule: "The imported external SBOM can no longer be read or validated; restore or explicitly replace it before relying on this evidence."
    };
  }
}

export function parseExternalSbom(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.bomFormat === "CycloneDX") return parseCycloneDx(value);
  if (typeof value.spdxVersion === "string" && value.spdxVersion.startsWith("SPDX-")) return parseSpdx(value);
  return null;
}

function parseCycloneDx(value) {
  const tools = value.metadata?.tools;
  const toolItems = Array.isArray(tools)
    ? tools
    : [...(Array.isArray(tools?.components) ? tools.components : []), ...(Array.isArray(tools?.services) ? tools.services : [])];
  const vulnerabilityDeclared = Object.hasOwn(value, "vulnerabilities") && Array.isArray(value.vulnerabilities);
  const components = Array.isArray(value.components) ? value.components : [];
  return {
    format: "cyclonedx-json",
    specVersion: String(value.specVersion || "unknown"),
    sourceTimestamp: String(value.metadata?.timestamp || ""),
    generatorTools: summarizeTools(toolItems),
    summary: {
      components: components.length,
      services: Array.isArray(value.services) ? value.services.length : 0,
      dependencies: Array.isArray(value.dependencies) ? value.dependencies.length : 0,
      vulnerabilities: vulnerabilityDeclared ? value.vulnerabilities.length : null
    },
    componentInventory: boundedInventory(components.map((item) => ({
      name: item?.name,
      version: item?.version,
      type: item?.type
    }))),
    securityEvidence: vulnerabilityDeclared ? "vulnerability-section-declared" : "inventory-only"
  };
}

function parseSpdx(value) {
  const creators = Array.isArray(value.creationInfo?.creators) ? value.creationInfo.creators : [];
  const tools = creators.filter((item) => /^Tool:/i.test(item)).map((item) => {
    const label = String(item).replace(/^Tool:\s*/i, "").trim();
    const match = label.match(/^(.*?)-v?(\d[\w.+-]*)$/);
    return { name: match?.[1]?.trim() || label, version: match?.[2] || "" };
  });
  const packages = Array.isArray(value.packages) ? value.packages : [];
  return {
    format: "spdx-json",
    specVersion: String(value.spdxVersion || "unknown"),
    sourceTimestamp: String(value.creationInfo?.created || ""),
    generatorTools: summarizeTools(tools),
    summary: {
      packages: packages.length,
      files: Array.isArray(value.files) ? value.files.length : 0,
      relationships: Array.isArray(value.relationships) ? value.relationships.length : 0,
      vulnerabilities: null
    },
    componentInventory: boundedInventory(packages.map((item) => ({
      name: item?.name,
      version: item?.versionInfo,
      type: "package"
    }))),
    securityEvidence: "inventory-only"
  };
}

export function compareSbomEvidence(previous = {}, current = {}) {
  const before = previous.componentInventory;
  const after = current.componentInventory;
  if (!before || !after) return {
    status: "baseline-unavailable",
    comparable: false,
    rule: "Import a compatible SBOM baseline before asking AI to reason about component drift."
  };
  const beforeByName = groupVersions(before.identities || []);
  const afterByName = groupVersions(after.identities || []);
  const added = [];
  const removed = [];
  const versionChanged = [];
  for (const [key, item] of afterByName) {
    if (!beforeByName.has(key)) added.push(item);
    else if (beforeByName.get(key).versions.join("\0") !== item.versions.join("\0")) {
      versionChanged.push({ name: item.name, type: item.type, before: beforeByName.get(key).versions, after: item.versions });
    }
  }
  for (const [key, item] of beforeByName) if (!afterByName.has(key)) removed.push(item);
  const incomplete = Boolean(before.truncated || after.truncated);
  return {
    status: added.length || removed.length || versionChanged.length ? "changed" : (incomplete ? "no-change-in-retained-sample" : "unchanged"),
    comparable: true,
    incomplete,
    counts: { added: added.length, removed: removed.length, versionChanged: versionChanged.length },
    sample: {
      added: added.slice(0, MAX_DRIFT_SAMPLE),
      removed: removed.slice(0, MAX_DRIFT_SAMPLE),
      versionChanged: versionChanged.slice(0, MAX_DRIFT_SAMPLE)
    },
    rule: incomplete
      ? "The bounded inventory was truncated; treat this comparison as partial and read both original SBOMs before claims."
      : "This comparison is coordination evidence only; read the original SBOMs before security, compliance, install, or removal decisions."
  };
}

function boundedInventory(items) {
  const identities = items.map(normalizeIdentity).filter(Boolean)
    .sort((a, b) => `${a.type}\0${a.name}\0${a.version}`.localeCompare(`${b.type}\0${b.name}\0${b.version}`))
    .filter((item, index, all) => index === 0 || identityKey(item) !== identityKey(all[index - 1]));
  return { total: identities.length, retained: Math.min(identities.length, MAX_COMPONENT_IDENTITIES), truncated: identities.length > MAX_COMPONENT_IDENTITIES, identities: identities.slice(0, MAX_COMPONENT_IDENTITIES) };
}

function normalizeIdentity(item) {
  const name = String(item?.name || "").trim().slice(0, 200);
  if (!name) return null;
  return { name, version: String(item?.version || "unknown").trim().slice(0, 100) || "unknown", type: String(item?.type || "package").trim().slice(0, 50) || "package" };
}

function identityKey(item) { return `${item.type}\0${item.name}\0${item.version}`; }

function groupVersions(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.type}\0${item.name}`;
    const current = groups.get(key) || { name: item.name, type: item.type, versions: [] };
    if (!current.versions.includes(item.version)) current.versions.push(item.version);
    current.versions.sort();
    groups.set(key, current);
  }
  return groups;
}

function summarizeTools(items) {
  return items.slice(0, 10).map((item) => ({
    name: String(item?.name || "unknown"),
    version: String(item?.version || "")
  }));
}

function assertInsideWorkspace(workspace, file) {
  const root = path.resolve(workspace);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    if (!relative) throw new Error("external SBOM evidence must not be the workspace directory");
    throw new Error("external SBOM evidence must be inside the workspace");
  }
}

function relativeArtifact(workspace, file) {
  return path.relative(path.resolve(workspace), file).split(path.sep).join("/");
}

export { MAX_COMPONENT_IDENTITIES, MAX_DRIFT_SAMPLE, MAX_EVIDENCE_BYTES };
