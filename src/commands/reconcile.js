import { inspectPackageManagers } from "../package-managers.js";
import { reconcileJsonPath, workspaceDir } from "../paths.js";
import { writeJson } from "../fsutil.js";
import { readJson } from "../fsutil.js";
import { compareReconciliation } from "../reconcile-drift.js";
import path from "node:path";

export async function reconcileWorkspace(args = {}) {
  if (args.quick && args.full_packages) throw new Error("use either --quick or --full-packages, not both");
  if (args.check && args.write) throw new Error("use either --check or --write, not both; checking must not replace its baseline");
  const dir = workspaceDir(args);
  const baselinePath = args.baseline ? path.resolve(dir, String(args.baseline)) : reconcileJsonPath(dir);
  const baseline = args.check ? await readJson(baselinePath, null) : null;
  if (args.check && !baseline) throw new Error(`missing reconciliation baseline at ${baselinePath}; run \`aienvmap reconcile --write\` first`);
  const scanMode = args.quick || args.full_packages ? null : baseline?.scanMode;
  const result = await inspectPackageManagers(dir, {
    showPaths: args.show_paths,
    fullPackages: args.full_packages || scanMode === "full-packages",
    quick: args.quick || scanMode === "quick"
  });
  if (args.check) {
    const check = compareReconciliation(baseline, result, { baselineArtifact: args.baseline || ".aienvmap/reconcile.json" });
    if (args.json) console.log(JSON.stringify(check, null, 2));
    else if (!args.quiet) printCheck(check);
    if (check.exitCode) process.exitCode = check.exitCode;
    return check;
  }
  if (args.write) {
    result.written = reconcileJsonPath(dir);
    await writeJson(result.written, result);
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (args.quiet) return result;
  console.log(`reconcile: ${result.decision.toUpperCase()} (read-only)`);
  console.log(`scope: ${result.scope}`);
  const expected = result.project.packageManager;
  console.log(`project: ${expected ? `${expected.name}@${expected.version}` : "packageManager not declared"}; lockfiles: ${result.project.lockManagers.join(", ") || "none"}`);
  if (!result.node.installations.length) console.log("node: not detected");
  for (const item of result.node.installations) console.log(`node: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
  if (!result.npm.installations.length) console.log("npm: not detected");
  for (const item of result.npm.installations) {
    console.log(`npm: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
    if (item.globalRoot) console.log(`  global root: ${item.globalRoot}`);
    if (item.globalPackages.length) console.log(`  global packages: ${item.globalPackages.map((pkg) => `${pkg.name}@${pkg.version}`).join(", ")}`);
  }
  for (const link of result.npm.runtimeLinks || []) console.log(`npm runtime: ${link.managerPath} -> ${link.runtimePath || "unresolved"} (${link.relationship}/${link.confidence}; ownership not proven)`);
  if (!result.python.installations.length) console.log("python: not detected");
  for (const item of result.python.installations) {
    console.log(`python: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
    const packageSummary = item.packageCollection === "skipped-quick" ? "not collected (quick)" : `${item.packageCount}; digest: ${item.packageDigest.slice(0, 12)}`;
    console.log(`  environment: ${item.virtualEnvironment ? "virtual" : "base"}; packages: ${packageSummary}; pip: ${item.pipAvailable ? "available" : "unavailable-or-empty"}`);
    console.log(`  manager: ${item.managerEvidence?.manager || "unknown"}; relationship: ${item.managerEvidence?.relationship || "unconfirmed"}; ownership: ${item.managerEvidence?.ownershipProven ? "proven" : "not-proven"}; removal: not-authorized`);
    if (item.installerEvidence?.collection === "collected") console.log(`  installers: ${Object.entries(item.installerEvidence.installerCounts || {}).map(([name, count]) => `${name}=${count}`).join(", ") || "unknown"}; requested: ${item.installerEvidence.requestedCount}; editable: ${item.installerEvidence.editableCount}`);
    if (item.packageLocations.length) console.log(`  package locations: ${item.packageLocations.join(", ")}`);
  }
  for (const item of result.python.pipCommands) console.log(`pip: ${item.version} -> Python ${item.pythonVersion} ${item.active ? "[active]" : "[inactive]"} ${item.path}`);
  for (const link of result.python.runtimeLinks || []) console.log(`pip runtime: ${link.managerPath} -> ${link.runtimePath || "unresolved"} (${link.relationship}/${link.confidence}; ownership not proven)`);
  for (const runtime of Object.values(result.otherRuntimes)) {
    for (const item of runtime.installations) {
      console.log(`${item.runtime}: ${item.versions.length ? item.versions.join(",") : item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
      if (item.runtime === "java") console.log(`  identity: ${item.vendor || "unknown-vendor"}; ${item.architecture || "unknown-arch"}; ${item.runtimeKind || "unknown-kind"}; home: ${item.javaHome || "unknown"} (${item.javaHomeSource || "unknown"})`);
    }
  }
  if (!result.findings.length) console.log("findings: no package-manager conflicts detected");
  for (const finding of result.findings) {
    console.log(`[${finding.severity}] ${finding.code}: ${finding.message}`);
    console.log(`  next: ${finding.action}`);
  }
  if (result.aiDecision.actionCandidates.length) {
    console.log("AI action candidates (review only):");
    for (const item of result.aiDecision.actionCandidates) console.log(`- ${item.kind} ${item.recommendation}: ${item.target} (${item.confidence})`);
  }
  console.log("changes: none; review findings before changing runtimes, PATH, prefixes, or lockfiles");
  if (result.written) console.log(`written: ${result.written}`);
  return result;
}

function printCheck(check) {
  console.log(`reconcile check: ${check.decision.toUpperCase()} (read-only)`);
  console.log(`baseline: ${check.baseline.artifact} ${check.baseline.fingerprint}`);
  console.log(`current: ${check.current.fingerprint}`);
  if (!check.drift.detected) console.log("drift: none");
  for (const item of check.drift.changes.slice(0, 20)) console.log(`[drift] ${item.field}: ${item.kind}`);
  console.log(`next: ${check.aiDecision.nextCommand}`);
}

export function summarizeReconciliation(value = {}) {
  return {
    decision: value.decision || "unknown",
    generatedAt: value.generatedAt || "",
    artifact: ".aienvmap/reconcile.json",
    detailedToolchains: {
      node: value.node?.installations?.length || 0,
      npm: value.npm?.installations?.length || 0,
      python: value.python?.installations?.length || 0,
      pip: value.python?.pipCommands?.length || 0
    },
    informationOnlyRuntimes: Object.fromEntries(Object.entries(value.otherRuntimes || {}).map(([name, item]) => [name, item.installations?.length || 0])),
    osNativeEvidence: Object.fromEntries(Object.entries(value.otherRuntimes || {}).map(([name, item]) => [name, item.discoveryEvidence?.osNativeCount || 0])),
    javaMetadata: {
      vendors: value.otherRuntimes?.java?.runtimeMetadata?.vendors || [],
      architectures: value.otherRuntimes?.java?.runtimeMetadata?.architectures || [],
      runtimeKinds: value.otherRuntimes?.java?.runtimeMetadata?.runtimeKinds || [],
      propertyEvidence: value.otherRuntimes?.java?.runtimeMetadata?.propertyEvidenceCount || 0,
      compilers: value.otherRuntimes?.java?.runtimeMetadata?.compilerCount || 0
    },
    runtimeLinks: {
      npmStrong: (value.npm?.runtimeLinks || []).filter((item) => item.confidence === "strong").length,
      pipStrong: (value.python?.runtimeLinks || []).filter((item) => item.confidence === "strong").length,
      review: [...(value.npm?.runtimeLinks || []), ...(value.python?.runtimeLinks || [])].filter((item) => item.confidence !== "strong").length
    },
    installerEvidence: {
      collected: (value.python?.installations || []).filter((item) => item.installerEvidence?.collection === "collected").length,
      notRequested: (value.python?.installations || []).filter((item) => item.installerEvidence?.collection === "not-requested").length,
      failed: (value.python?.installations || []).filter((item) => item.installerEvidence?.collection === "unsupported-or-failed").length
    },
    managerEvidence: {
      proven: (value.python?.installations || []).filter((item) => item.managerEvidence?.ownershipProven === true).length,
      inferred: (value.python?.installations || []).filter((item) => item.managerEvidence?.confidence === "medium").length,
      unconfirmed: (value.python?.installations || []).filter((item) => item.managerEvidence?.confidence === "none").length,
      removalAuthorized: false
    },
    nextCommand: value.decision === "review" ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
    rule: "Read the report before runtime or package-manager changes; removal still requires explicit human approval."
  };
}
