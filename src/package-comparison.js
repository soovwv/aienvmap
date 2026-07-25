import { createHash } from "node:crypto";

export function summarizePythonPackages(item, full) {
  const packages = item.packages || [];
  if (item.packageCollection === "skipped-quick" || item.versionVerified === false) return {
    ...item,
    packageCount: null,
    packageDigest: "",
    packageSample: [],
    packages: undefined
  };
  const normalized = packages.map((entry) => `${entry.name.toLowerCase()}@${entry.version}`).sort();
  const summary = {
    packageCount: packages.length,
    packageDigest: createHash("sha256").update(normalized.join("\n")).digest("hex"),
    packageSample: packages.slice(0, 12)
  };
  return full ? { ...item, ...summary } : { ...item, ...summary, packages: undefined };
}

export function comparePythonPackages(installations) {
  return comparePackageCollections(installations, "packages", "path");
}

export function compareNpmGlobalPackages(installations) {
  return comparePackageCollections(installations, "globalPackages", "globalRoot");
}

function comparePackageCollections(installations, field, identityField) {
  const comparisons = [];
  for (let leftIndex = 0; leftIndex < installations.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < installations.length; rightIndex += 1) {
      const left = installations[leftIndex];
      const right = installations[rightIndex];
      const leftMap = new Map((left[field] || []).map((item) => [item.name.toLowerCase(), item.version]));
      const rightMap = new Map((right[field] || []).map((item) => [item.name.toLowerCase(), item.version]));
      const shared = [...leftMap.keys()].filter((name) => rightMap.has(name));
      const versionConflicts = shared.filter((name) => leftMap.get(name) !== rightMap.get(name));
      const onlyLeft = [...leftMap.keys()].filter((name) => !rightMap.has(name));
      const onlyRight = [...rightMap.keys()].filter((name) => !leftMap.has(name));
      comparisons.push({
        left: left[identityField] || left.path,
        right: right[identityField] || right.path,
        sharedCount: shared.length,
        versionConflictCount: versionConflicts.length,
        onlyLeftCount: onlyLeft.length,
        onlyRightCount: onlyRight.length,
        versionConflictSample: versionConflicts.slice(0, 10).map((name) => ({ name, left: leftMap.get(name), right: rightMap.get(name) })),
        onlyLeftSample: onlyLeft.slice(0, 10),
        onlyRightSample: onlyRight.slice(0, 10),
        interpretation: "Package comparison only; confirm runtime ownership before consolidation or removal."
      });
    }
  }
  return comparisons;
}
