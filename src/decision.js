export function aiDecision(warnings = [], intents = []) {
  const warningCodes = warnings.map((warning) => warning.code).filter(Boolean);
  const reviewRequired = warnings.length > 0 || intents.length > 0;
  const mode = reviewRequired ? "review-first" : "project-local-work";
  return {
    schemaVersion: 1,
    mode,
    canProceed: !reviewRequired,
    proceedScope: "project-local-work-only",
    canContinueProjectLocalWork: true,
    canChangeEnvironmentWithoutReview: false,
    safeForProjectLocalWork: warnings.length === 0,
    reviewRequired,
    warningCodes,
    environmentChangeRequiresIntent: true,
    globalEnvironmentChangesRequireUserApproval: true,
    clearDecisionGrantsEnvironmentAuthority: false,
    pendingIntentCount: intents.length,
    mustNotDo: [
      "do not change global runtimes without user approval",
      "do not install or remove global package managers without user approval",
      "do not change Docker daemon/context assumptions without user approval",
      "do not ignore open intents or review-required warnings"
    ],
    recommendedNextActions: reviewRequired
      ? ["review warnings and open intents", "ask the user before environment changes", "record intent before changes"]
      : ["continue with project-local work", "run aienvmap intent before environment changes"],
    requiredCommands: {
      beforeEnvironmentChange: "aienvmap intent --actor agent:id --action planned-change --target <runtime|package-manager|docker>",
      checkpointAfterChange: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
      refreshAfterChange: "aienvmap sync",
      recordAfterChange: "aienvmap record --actor agent:id --summary what-changed",
      handoff: "aienvmap handoff --record --actor agent:id",
      reviewPlan: "aienvmap plan"
    },
    nextCommand: reviewRequired ? "aienvmap plan" : "continue project-local work; use aienvmap intent before environment changes"
  };
}
