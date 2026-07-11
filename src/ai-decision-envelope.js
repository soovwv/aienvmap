export function buildAiDecisionEnvelope(options = {}) {
  const review = options.reviewRequired === true || ["review", "review-required", "review-first"].includes(options.decision);
  const reasonCodes = boundedUnique(options.reasonCodes);
  const evidenceRefs = boundedUnique(options.evidenceRefs);
  return {
    schemaName: "aienvmap.ai-decision",
    schemaVersion: 1,
    decision: review ? "review" : "clear",
    reasonCodes: reasonCodes.length ? reasonCodes : ["no-review-signal"],
    evidenceRefs: evidenceRefs.length ? evidenceRefs : [".aienvmap/status.json"],
    nextSafeCommand: String(options.nextSafeCommand || "aienvmap status --json"),
    requiresHumanApproval: review,
    projectLocalWork: options.projectLocalWork || "allowed",
    environmentChanges: review ? "review-first" : "intent-first",
    removalAuthorized: false,
    rule: "Use this compact envelope first; inspect referenced evidence before environment changes, and never infer install or removal authority from a clear decision."
  };
}

function boundedUnique(values, limit = 20) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);
}
