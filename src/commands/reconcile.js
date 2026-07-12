import { inspectPackageManagers } from "../package-managers.js";
import { reconcileJsonPath, workspaceDir } from "../paths.js";
import { writeJson } from "../fsutil.js";
import { readJson } from "../fsutil.js";
import { compareReconciliation } from "../reconcile-drift.js";
import path from "node:path";
import { buildPortableCaseSummary, buildPortableReconciliation, comparePortableReconciliations, readPortableEvidence } from "../portable-reconcile.js";
import { inspectExplicitHome, inspectHomes, isolatedHomeEnvironment, readHomeEvidence, readHomesManifest, resolveInspectedHome } from "../home-inspection.js";

export { buildPortableCaseSummary, buildPortableReconciliation, comparePortableReconciliations, portableEvidenceFingerprint } from "../portable-reconcile.js";
export { isolatedHomeEnvironment, resolveInspectedHome } from "../home-inspection.js";

export async function reconcileWorkspace(args = {}) {
  if (args.quick && args.full_packages) throw new Error("use either --quick or --full-packages, not both");
  if (args.check && args.write) throw new Error("use either --check or --write, not both; checking must not replace its baseline");
  if (args.inspect_home && (args.full_packages || args.show_paths)) throw new Error("--inspect-home is privacy-bounded and cannot be combined with --full-packages or --show-paths");
  if (args.owner_verification && !args.portable_compare) throw new Error("--owner-verification requires --portable-compare <admin.json> --against <owner.json>");
  if (args.comparison && !args.case_summary) throw new Error("--comparison requires --case-summary <portable.json>");
  if (args.portable && (args.write || args.check || args.show_paths || args.full_packages || args.baseline)) throw new Error("--portable is quick, read-only, and cannot be combined with --write, --check, --baseline, --show-paths, or --full-packages");
  const dir = workspaceDir(args);
  const inspectedHome = args.inspect_home ? await resolveInspectedHome(args.inspect_home) : null;
  if (args.alias && !args.home_evidence) throw new Error("--alias requires --home-evidence <aggregate.json>");
  if (args.home_evidence) {
    if (args.home_evidence === true || !args.alias || args.alias === true) throw new Error("--home-evidence <aggregate.json> requires --alias <alias>");
    if (args.inspect_home || args.inspect_homes || args.portable || args.portable_from || args.portable_compare || args.case_summary || args.write || args.check || args.quick || args.full_packages || args.show_paths || args.baseline || args.against) throw new Error("--home-evidence cannot be combined with scanning, writing, checking, comparison, baseline, or path options");
    const evidence = await readHomeEvidence(path.resolve(dir, String(args.home_evidence)), args.alias);
    if (args.json) console.log(JSON.stringify(evidence, null, 2));
    else if (!args.quiet) printPortable(evidence);
    return evidence;
  }
  if (args.inspect_homes) {
    if (args.inspect_homes === true) throw new Error("--inspect-homes requires an aienvmap.inspect-homes v1 JSON manifest");
    if (args.inspect_home || args.portable || args.portable_from || args.portable_compare || args.case_summary || args.write || args.check || args.quick || args.full_packages || args.show_paths || args.baseline) throw new Error("--inspect-homes cannot be combined with other reconciliation modes or path options");
    const homes = await readHomesManifest(path.resolve(dir, String(args.inspect_homes)));
    const result = await inspectHomes(dir, homes);
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else if (!args.quiet) printHomes(result);
    return result;
  }
  if (args.case_summary) {
    if (args.case_summary === true) throw new Error("--case-summary requires a portable reconciliation JSON file");
    if (args.portable || args.portable_from || args.portable_compare || args.write || args.check || args.quick || args.full_packages || args.show_paths || args.inspect_home || args.baseline) throw new Error("--case-summary cannot be combined with scanning, writing, checking, baseline, or path options");
    const report = await readPortableEvidence(path.resolve(dir, String(args.case_summary)));
    const comparison = args.comparison ? await readJson(path.resolve(dir, String(args.comparison)), null) : null;
    const summary = buildPortableCaseSummary(report, comparison);
    if (args.json) console.log(JSON.stringify(summary, null, 2));
    else if (!args.quiet) printCaseSummary(summary);
    return summary;
  }
  if (args.portable_compare) {
    if (args.portable || args.portable_from || args.write || args.check || args.quick || args.full_packages || args.show_paths || args.inspect_home || args.baseline) throw new Error("--portable-compare cannot be combined with scanning, writing, checking, baseline, or path options");
    if (args.portable_compare === true || !args.against || args.against === true) throw new Error("--portable-compare <before.json> requires --against <after.json>");
    const [before, after] = await Promise.all([
      readPortableEvidence(path.resolve(dir, String(args.portable_compare))),
      readPortableEvidence(path.resolve(dir, String(args.against)))
    ]);
    const comparison = comparePortableReconciliations(before, after, { ownerVerification: args.owner_verification === true });
    if (args.json) console.log(JSON.stringify(comparison, null, 2));
    else if (!args.quiet) printPortableComparison(comparison);
    return comparison;
  }
  if (args.portable_from) {
    if (args.portable || args.write || args.check || args.quick || args.full_packages || args.show_paths || args.inspect_home || args.baseline) throw new Error("--portable-from cannot be combined with scanning, writing, checking, baseline, or path options");
    if (args.portable_from === true) throw new Error("--portable-from requires a reconciliation JSON file");
    const source = await readJson(path.resolve(dir, String(args.portable_from)), null);
    if (source?.schemaName !== "aienvmap.reconcile" || source?.schemaVersion !== 1) throw new Error("--portable-from requires an aienvmap.reconcile v1 JSON artifact");
    const portable = buildPortableReconciliation(source, { sourceMode: "artifact" });
    if (args.json) console.log(JSON.stringify(portable, null, 2));
    else if (!args.quiet) printPortable(portable);
    return portable;
  }
  const baselinePath = args.baseline ? path.resolve(dir, String(args.baseline)) : reconcileJsonPath(dir);
  const baseline = args.check ? await readJson(baselinePath, null) : null;
  if (args.check && !baseline) throw new Error(`missing reconciliation baseline at ${baselinePath}; run \`aienvmap reconcile --write\` first`);
  const scanMode = args.quick || args.full_packages ? null : baseline?.scanMode;
  if (inspectedHome && scanMode === "full-packages") throw new Error("--inspect-home cannot check a full-packages baseline; create a standard or quick baseline for the inspected home");
  const result = inspectedHome ? await inspectExplicitHome(dir, inspectedHome) : await inspectPackageManagers(dir, {
    showPaths: args.show_paths,
    fullPackages: args.full_packages || scanMode === "full-packages",
    quick: args.portable || args.quick || scanMode === "quick",
    home: inspectedHome || undefined,
    env: inspectedHome ? isolatedHomeEnvironment(inspectedHome) : undefined,
    pathValue: inspectedHome ? "" : undefined,
    inspectedHome: Boolean(inspectedHome),
    executeCandidates: true
  });
  if (args.portable) {
    const portable = buildPortableReconciliation(result, { sourceMode: "live-quick" });
    if (args.json) console.log(JSON.stringify(portable, null, 2));
    else if (!args.quiet) printPortable(portable);
    return portable;
  }
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
  for (const item of result.node.installations) {
    console.log(`node: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
    console.log(`  manager: ${item.managerEvidence?.manager || "unknown"}; relationship: ${item.managerEvidence?.relationship || "unconfirmed"}; ownership: ${item.managerEvidence?.ownershipProven ? "proven" : "not-proven"}; removal: not-authorized`);
  }
  if (!result.npm.installations.length) console.log("npm: not detected");
  for (const item of result.npm.installations) {
    console.log(`npm: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
    if (item.globalRoot) console.log(`  global root: ${item.globalRoot}`);
    if (item.globalPackages.length) console.log(`  global packages: ${item.globalPackages.map((pkg) => `${pkg.name}@${pkg.version}`).join(", ")}`);
  }
  for (const link of result.npm.runtimeLinks || []) console.log(`npm runtime: ${link.managerPath} -> ${link.runtimePath || "unresolved"} (${link.relationship}/${link.confidence}; ownership not proven)`);
  for (const [manager, inventory] of Object.entries(result.npm.alternativeManagers || {})) {
    if (!inventory.installations?.length) continue;
    for (const item of inventory.installations) console.log(`${manager}: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path} (${item.deliveryEvidence}; ownership not proven)`);
  }
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
  for (const [tool, inventory] of Object.entries(result.python.toolEntryPoints || {})) for (const item of inventory.installations || []) console.log(`${tool}: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path} (${item.routingEvidence}; ownership not proven)`);
  for (const item of result.python.conda?.installations || []) console.log(`conda: ${item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}; environments: ${item.environmentEvidence.collection === "collected" ? item.environmentEvidence.count : item.environmentEvidence.collection}; ownership not proven`);
  for (const link of result.python.runtimeLinks || []) console.log(`pip runtime: ${link.managerPath} -> ${link.runtimePath || "unresolved"} (${link.relationship}/${link.confidence}; ownership not proven)`);
  for (const runtime of Object.values(result.otherRuntimes)) {
    for (const item of runtime.installations) {
      console.log(`${item.runtime}: ${item.versions.length ? item.versions.join(",") : item.version} ${item.active ? "[active]" : "[inactive]"} ${item.source}/${item.scope} ${item.path}`);
      if (item.runtime === "java") {
        console.log(`  identity: ${item.vendor || "unknown-vendor"}; ${item.architecture || "unknown-arch"}; ${item.runtimeKind || "unknown-kind"}; home: ${item.javaHome || "unknown"} (${item.javaHomeSource || "unknown"})`);
        console.log(`  manager: ${item.managerEvidence?.manager || "unknown"}; relationship: ${item.managerEvidence?.relationship || "unconfirmed"}; install ownership: ${item.managerEvidence?.ownershipProven ? "proven" : "not-proven"}; routing: ${item.managerEvidence?.routingManaged ? "managed" : "unconfirmed"}; removal: not-authorized`);
      }
    }
    if (runtime.label === "Java") for (const binding of runtime.buildTools?.bindings || []) {
      console.log(`java tool: ${binding.tool}@${binding.toolVersion} (${binding.commandSource}) -> ${binding.runtimePath || "unresolved"} (${binding.relationship}/${binding.confidence})`);
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
  console.log(`consolidation plan: ${result.aiDecision.consolidationPlan.status}; apply: none; approval: required for environment changes`);
  console.log("changes: none; review findings before changing runtimes, PATH, prefixes, or lockfiles");
  if (result.written) console.log(`written: ${result.written}`);
  return result;
}

function printPortable(value) {
  console.log(`portable reconcile: ${value.decision.toUpperCase()} (redacted/read-only)`);
  console.log(`platform: ${value.platform}/${value.architecture}`);
  console.log(`inventory: node=${value.inventory.node.count}, npm=${value.inventory.npm.count}, python=${value.inventory.python.count}, java=${value.inventory.otherRuntimes.java?.count || 0}`);
  console.log(`findings: ${value.findings.map((item) => item.code).join(", ") || "none"}`);
  console.log(`evidence: ${value.evidenceFingerprint}`);
  console.log(`privacy: ${value.privacy.excluded.join(", ")}`);
  console.log(`rule: ${value.rule}`);
}

function printCaseSummary(value) {
  console.log(`environment case: ${value.status}`);
  console.log(`platform: ${value.evidence.platform}/${value.evidence.architecture}; decision: ${value.evidence.decision}`);
  console.log(`findings: ${value.evidence.findingCodes.join(", ") || "none"}`);
  console.log(`comparison: ${value.comparison.present ? value.comparison.decision : "not provided"}`);
  console.log(`market evidence eligible: ${value.marketEvidence.eligible}`);
  console.log(`privacy review: required; excluded: ${value.privacy.excluded.join(", ")}`);
  console.log(`rule: ${value.rule}`);
}

function printHomes(value) {
  console.log(`reconcile homes: ${value.entryCount} explicit homes (read-only/no-exec)`);
  for (const item of value.entries) {
    const inventory = item.evidence.inventory;
    console.log(`- ${item.alias}: ${item.evidence.decision}; node=${inventory.node.count}, npm=${inventory.npm.count}, python=${inventory.python.count}, java=${inventory.otherRuntimes.java?.count || 0}`);
  }
  console.log(`next: ${value.nextSafeAction}`);
  console.log(`rule: ${value.rule}`);
}

function printPortableComparison(value) {
  console.log(`portable compare: ${value.decision.toUpperCase()}`);
  console.log(`before: ${value.before.evidenceFingerprint}`);
  console.log(`after: ${value.after.evidenceFingerprint}`);
  console.log(`changes: ${value.changeCount}; sections: ${value.changedSections.join(", ") || "none"}`);
  if (value.ownerVerification) {
    console.log(`owner verification: ${value.ownerVerification.status} (identity/path matches not proven)`);
    for (const item of value.ownerVerification.coverage) console.log(`- ${item.runtime}: admin=${item.administratorDiscovered}, owner=${item.ownerVerified}, ${item.status}`);
  }
  for (const item of value.changes.slice(0, 20)) console.log(`- ${item.field}: ${item.kind}`);
  console.log(`rule: ${value.rule}`);
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
      pnpm: value.npm?.alternativeManagers?.pnpm?.installations?.length || 0,
      yarn: value.npm?.alternativeManagers?.yarn?.installations?.length || 0,
      corepack: value.npm?.alternativeManagers?.corepack?.installations?.length || 0,
      python: value.python?.installations?.length || 0,
      pip: value.python?.pipCommands?.length || 0,
      uv: value.python?.toolEntryPoints?.uv?.installations?.length || 0,
      pipx: value.python?.toolEntryPoints?.pipx?.installations?.length || 0,
      conda: value.python?.conda?.installations?.length || 0
    },
    informationOnlyRuntimes: Object.fromEntries(Object.entries(value.otherRuntimes || {}).map(([name, item]) => [name, item.installations?.length || 0])),
    osNativeEvidence: Object.fromEntries(Object.entries(value.otherRuntimes || {}).map(([name, item]) => [name, item.discoveryEvidence?.osNativeCount || 0])),
    javaMetadata: {
      vendors: value.otherRuntimes?.java?.runtimeMetadata?.vendors || [],
      architectures: value.otherRuntimes?.java?.runtimeMetadata?.architectures || [],
      runtimeKinds: value.otherRuntimes?.java?.runtimeMetadata?.runtimeKinds || [],
      propertyEvidence: value.otherRuntimes?.java?.runtimeMetadata?.propertyEvidenceCount || 0,
      compilers: value.otherRuntimes?.java?.runtimeMetadata?.compilerCount || 0,
      managers: value.otherRuntimes?.java?.runtimeMetadata?.managers || [],
      managedInstalls: value.otherRuntimes?.java?.runtimeMetadata?.managedInstallCount || 0,
      routingManaged: value.otherRuntimes?.java?.runtimeMetadata?.routingManagedCount || 0,
      removalAuthorized: false,
      buildTools: (value.otherRuntimes?.java?.buildTools?.bindings || []).map((item) => ({
        tool: item.tool,
        toolVersion: item.toolVersion,
        commandSource: item.commandSource,
        runtimeRole: item.runtimeRole,
        javaVersion: item.javaVersion,
        launcherJavaVersion: item.launcherJavaVersion || "",
        relationship: item.relationship,
        confidence: item.confidence
      }))
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
    nodeManagerEvidence: {
      proven: (value.node?.installations || []).filter((item) => item.managerEvidence?.ownershipProven === true).length,
      inferred: (value.node?.installations || []).filter((item) => item.managerEvidence?.confidence === "medium").length,
      unconfirmed: (value.node?.installations || []).filter((item) => item.managerEvidence?.confidence === "none").length,
      managers: [...new Set((value.node?.installations || []).map((item) => item.managerEvidence?.manager).filter((item) => item && item !== "unknown"))].sort(),
      removalAuthorized: false
    },
    nextCommand: value.decision === "review" ? "aienvmap reconcile --json --full-packages" : "aienvmap status --json",
    rule: "Read the report before runtime or package-manager changes; removal still requires explicit human approval."
  };
}
