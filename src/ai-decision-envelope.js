export function buildAiDecisionEnvelope(options = {}) {
  const review = options.reviewRequired === true || ["review", "review-required", "review-first"].includes(options.decision);
  const reasonCodes = boundedUnique(options.reasonCodes);
  const evidenceRefs = boundedUnique(options.evidenceRefs);
  const approvalBefore = boundedUnique(options.requiresHumanApprovalBefore || ["removal", "global-install", "runtime-switch", "lockfile-rewrite"]);
  const userQuestion = review ? buildUserQuestion(reasonCodes) : null;
  return {
    schemaName: "aienvmap.ai-decision",
    schemaVersion: 1,
    decision: review ? "review" : "clear",
    reasonCodes: reasonCodes.length ? reasonCodes : ["no-review-signal"],
    evidenceRefs: evidenceRefs.length ? evidenceRefs : [".aienvmap/status.json"],
    nextSafeCommand: String(options.nextSafeCommand || "aienvmap status --json"),
    requiresHumanApproval: review,
    requiresHumanApprovalBefore: approvalBefore,
    action: review ? "review-evidence-before-environment-change" : "continue-project-local-work",
    userQuestion,
    questionRequired: Boolean(userQuestion),
    observationAuthority: "observed-not-approved",
    evidenceConfidence: evidenceRefs.length ? "evidence-referenced" : "limited",
    projectLocalWork: options.projectLocalWork || "allowed",
    environmentChanges: review ? "review-first" : "intent-first",
    removalAuthorized: false,
    neverDo: ["infer user intent from installed versions", "remove or install global tools without approval", "treat observed state as an approved baseline"],
    rule: "Use this compact envelope first; inspect referenced evidence before environment changes, and never infer install or removal authority from a clear decision."
  };
}

function buildUserQuestion(reasonCodes = []) {
  const joined = reasonCodes.join(" ").toLowerCase();
  if (joined.includes("open-intents") || joined.includes("coordination") || joined.includes("multi-agent")) {
    return "Another environment-affecting intent is open. Should I coordinate with that intent, wait, or prepare a non-applying proposal for your review?";
  }
  if (["runtime", "node", "python", "java", "package-manager", "multiple-install"].some((term) => joined.includes(term))) {
    return "Multiple or conflicting runtime routes were observed. Are they intentional, and which project or version should be preferred? I will not remove or switch anything without approval.";
  }
  if (joined.includes("sbom") || joined.includes("security") || joined.includes("vulnerab")) {
    return "The available dependency evidence needs review. Should I run the suggested read-only evidence command before proposing any dependency change?";
  }
  return "Environment evidence requires review. May I inspect the referenced local evidence and prepare a non-applying proposal?";
}

function boundedUnique(values, limit = 20) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);
}
