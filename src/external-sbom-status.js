import { readJsonStrict } from "./fsutil.js";
import { externalSbomEvidencePath } from "./paths.js";
import { verifySbomEvidence } from "./sbom-evidence.js";

export async function loadExternalSbomStartupSignal(workspace) {
  const persisted = await readJsonStrict(externalSbomEvidencePath(workspace), null);
  if (!persisted) return noExternalSbomSignal();
  const evidence = await verifySbomEvidence(workspace, persisted);
  const stale = evidence?.status === "stale";
  const driftStatus = evidence?.baselineDrift?.status || "baseline-unavailable";
  const drifted = !stale && driftStatus === "changed";
  const identityConfidence = evidence?.componentInventory?.identityConfidence || "unknown";
  const decision = stale
    ? "refresh-import-required"
    : drifted
      ? "component-drift-review"
      : ["mixed", "fallback-only"].includes(identityConfidence)
        ? "identity-confidence-review"
        : "evidence-current";
  return {
    status: evidence?.status || "unknown",
    decision,
    requiresReview: stale || drifted,
    verification: evidence?.verification || "unknown",
    artifact: evidence?.artifact || "",
    digest: evidence?.digest || "",
    baselineDrift: {
      status: driftStatus,
      incomplete: Boolean(evidence?.baselineDrift?.incomplete),
      counts: evidence?.baselineDrift?.counts || { added: 0, removed: 0, versionChanged: 0 }
    },
    identityConfidence,
    truncated: Boolean(evidence?.componentInventory?.truncated),
    nextCommand: stale
      ? `aienvmap sbom --import ${evidence?.artifact || "<workspace-sbom.json>"} --write`
      : drifted || ["mixed", "fallback-only"].includes(identityConfidence)
        ? "aienvmap sbom --json"
        : "aienvmap status --json",
    removalAuthorized: false,
    rule: "This compact startup signal never replaces the imported SBOM; open the original evidence before security, compliance, install, or removal decisions."
  };
}

export function externalSbomWarnings(signal = {}) {
  if (signal.decision === "refresh-import-required") return [{
    code: "external-sbom-stale",
    target: "dependency",
    message: "Imported external SBOM evidence is stale or unavailable; explicitly review and re-import it."
  }];
  if (signal.decision === "component-drift-review") return [{
    code: "external-sbom-component-drift",
    target: "dependency",
    message: "Imported external SBOM baseline reports component drift; review both original SBOMs before dependency or release changes."
  }];
  return [];
}

function noExternalSbomSignal() {
  return {
    status: "not-imported",
    decision: "no-external-evidence",
    requiresReview: false,
    verification: "not-imported",
    artifact: "",
    digest: "",
    baselineDrift: { status: "baseline-unavailable", incomplete: false, counts: { added: 0, removed: 0, versionChanged: 0 } },
    identityConfidence: "no-components",
    truncated: false,
    nextCommand: "aienvmap sbom --import <workspace-sbom.json> --write",
    removalAuthorized: false,
    rule: "External SBOM evidence is optional; aienvmap never installs or runs a scanner automatically."
  };
}
