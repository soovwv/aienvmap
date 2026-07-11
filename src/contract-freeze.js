import { createHash } from "node:crypto";

export function documentedRootFieldMap(schema) {
  const surfaces = schema?.releaseReadiness?.contractReview?.surfaces;
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    throw new Error("releaseReadiness.contractReview.surfaces must be a non-empty array");
  }
  return Object.fromEntries(surfaces.map((surface) => {
    const rootFields = schema?.outputs?.[surface]?.rootFields;
    if (!Array.isArray(rootFields) || rootFields.length === 0) {
      throw new Error(`outputs.${surface}.rootFields must be a non-empty array`);
    }
    if (new Set(rootFields).size !== rootFields.length) {
      throw new Error(`outputs.${surface}.rootFields contains duplicates`);
    }
    return [surface, rootFields];
  }));
}

export function rootFieldDigest(rootFieldMap) {
  return createHash("sha256").update(JSON.stringify(rootFieldMap)).digest("hex");
}

export function verifyContractFreeze(schema, baseline) {
  const rootFields = documentedRootFieldMap(schema);
  const digest = rootFieldDigest(rootFields);
  const surfaceFieldCounts = Object.fromEntries(Object.entries(rootFields).map(([surface, fields]) => [surface, fields.length]));
  const failures = [];
  if (baseline?.schemaName !== "aienvmap-ai-json-root-field-freeze" || baseline?.schemaVersion !== 1) failures.push("unsupported-baseline");
  if (baseline?.targetRelease !== schema?.releaseReadiness?.target) failures.push("target-release-mismatch");
  if (baseline?.digest !== digest) failures.push("root-field-digest-mismatch");
  if (JSON.stringify(baseline?.surfaceFieldCounts) !== JSON.stringify(surfaceFieldCounts)) failures.push("surface-field-count-mismatch");
  return {
    schemaName: "aienvmap-contract-freeze-result",
    schemaVersion: 1,
    targetRelease: schema?.releaseReadiness?.target || null,
    status: failures.length === 0 ? "frozen-and-verified" : "review-required",
    pass: failures.length === 0,
    digest,
    surfaces: Object.keys(rootFields),
    surfaceFieldCounts,
    failures,
    rule: "A mismatch requires intentional contract review; do not regenerate the baseline only to make CI pass."
  };
}
