import { versionMatchesConstraint } from "./version-constraint.js";

export function analyzeNodeInstallations(installations, project = {}) {
  const findings = [];
  const versions = distinctVerifiedVersions(installations);
  if (installations.length > 1) findings.push({
    code: "multiple-node-installations",
    severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} Node executables were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    action: "Select the project-preferred Node runtime and its paired npm; do not remove manager-owned versions automatically."
  });
  const active = installations.find((item) => item.active);
  const expected = project.node?.versionFile;
  const declaration = project.node?.declaration || { source: ".nvmrc", evidenceType: "declared" };
  if (expected && active && active.versionVerified !== false && !versionMatchesConstraint(expected, active.version)) findings.push({
    code: "active-node-project-mismatch", severity: "review", evidenceType: "declared-vs-observed",
    declared: { value: expected, source: declaration.source, evidenceType: "declared" },
    observed: { value: active.version, source: active.path, evidenceType: "observed" },
    message: `Project ${declaration.source} declares ${expected}, but active Node is ${active.version}.`,
    action: `Activate Node ${expected} with the project's runtime manager or explicitly review ${declaration.source}.`
  });
  return findings;
}

export function analyzePythonInstallations(installations, project = {}) {
  const findings = [];
  const versions = distinctVerifiedVersions(installations);
  const aliasCount = installations.reduce((sum, item) => sum + (item.aliases?.length || 0), 0);
  if (installations.length > 1) findings.push({
    code: "multiple-python-installations", severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} distinct Python environments were detected${aliasCount ? ` after grouping ${aliasCount} command aliases` : ""}${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    confidence: installations.some((item) => item.classification === "needs-review") ? "low" : "medium",
    reviewReason: aliasCount ? "Python command aliases were grouped before counting distinct environments." : "More than one distinct Python environment remains after alias grouping.",
    action: "Select a project-preferred Python runtime; preserve virtual environments and manager-owned runtimes until reviewed."
  });
  const active = installations.find((item) => item.active);
  const expected = project.python?.versionFile;
  const declaration = project.python?.declaration || { source: ".python-version", evidenceType: "declared" };
  if (expected && active && active.versionVerified !== false && !versionMatchesConstraint(expected, active.version)) findings.push({
    code: "active-python-project-mismatch", severity: "review", evidenceType: "declared-vs-observed",
    declared: { value: expected, source: declaration.source, evidenceType: "declared" },
    observed: { value: active.version, source: active.path, evidenceType: "observed" },
    message: `Project ${declaration.source} declares ${expected}, but active Python is ${active.version}.`,
    action: `Activate Python ${expected} with the project's runtime manager or explicitly review the project declaration.`
  });
  if (!installations.length && project.python?.signals?.length) findings.push({
    code: "python-not-detected", severity: "review",
    message: `Python project signals exist (${project.python.signals.join(", ")}), but no readable Python executable was detected.`,
    action: "Review the project runtime declaration; aienvmap will not install Python automatically."
  });
  return findings;
}

export function analyzeNpmInstallations(installations, project = {}) {
  const findings = [];
  const versions = distinctVerifiedVersions(installations);
  const roots = [...new Set(installations.map((item) => item.globalRoot).filter(Boolean))];
  if (installations.length > 1) findings.push({
    code: "multiple-npm-installations", severity: versions.length > 1 ? "review" : "info",
    message: `${installations.length} npm executables were detected${versions.length > 1 ? ` with versions ${versions.join(", ")}` : ""}.`,
    action: "Choose a project-preferred Node/npm toolchain; do not remove inactive installations automatically."
  });
  if (roots.length > 1) findings.push({ code: "multiple-npm-global-roots", severity: "review", message: `${roots.length} npm global package roots were detected.`, action: "Review global tools per prefix before changing PATH or removing an installation." });
  if ((project.lockManagers || []).length > 1) findings.push({ code: "mixed-project-lockfiles", severity: "review", message: `Project lockfiles for ${project.lockManagers.join(", ")} coexist.`, action: "Confirm the canonical package manager before regenerating or deleting any lockfile." });
  const expected = project.packageManager?.name === "npm" ? project.packageManager.version : "";
  const active = installations.find((item) => item.active);
  if (expected && active && active.versionVerified !== false && !versionMatchesConstraint(expected, active.version)) findings.push({ code: "active-npm-project-mismatch", severity: "review", message: `Project declares npm@${expected}, but active npm is ${active.version}.`, action: `Activate a Node toolchain that provides npm ${expected}, or explicitly update package.json after review.` });
  if (project.packageManager?.name && project.packageManager.name !== "npm" && active) findings.push({ code: "active-manager-differs-from-project", severity: "info", message: `Project declares ${project.packageManager.name}, while npm ${active.version} is also available.`, action: `Use ${project.packageManager.name} for project dependency changes unless project policy says otherwise.` });
  if (!installations.length) findings.push({ code: "npm-not-detected", severity: project.lockManagers?.includes("npm") ? "review" : "info", message: "No readable npm executable was detected for the current user.", action: "Review the project's Node toolchain declaration; aienvmap will not install npm automatically." });
  return findings;
}

function distinctVerifiedVersions(installations) {
  return [...new Set(installations.filter((item) => item.versionVerified !== false).map((item) => item.version))];
}
