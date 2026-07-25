const knownReasons = new Map([
  ["manifest-stale", "The saved environment map no longer matches the current workspace."],
  ["project-reconciliation-stale", "The project declaration comparison is older than the files it describes."],
  ["open-intents", "Another recorded environment change is still open and should be coordinated first."],
  ["multiple-node-installations", "More than one Node.js installation was detected; PATH order alone does not identify the intended one."],
  ["multiple-npm-installations", "More than one npm entry point was detected; each should be matched to its owning Node.js runtime."],
  ["multiple-python-installations", "More than one Python command was detected; aliases may refer to the same environment."],
  ["multiple-pip-entry-points", "More than one pip entry point was detected; each should be matched to its owning Python runtime."],
  ["pip-python-runtime-link-uncertain", "A pip entry point could not be linked confidently to one Python runtime."],
  ["project-declaration-conflict", "Project files declare incompatible environment requirements."],
  ["no-review-signal", "No warning or open environment-change intent requires review."]
]);

export function explainReasonCode(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return "";
  if (knownReasons.has(normalized)) return knownReasons.get(normalized);
  if (normalized.startsWith("project-declaration-")) {
    return "A project environment declaration needs review before it is treated as authoritative.";
  }
  if (normalized.endsWith("-project-declarations-conflict")) {
    return "Project files contain conflicting declarations for the same tool or runtime.";
  }
  if (normalized.endsWith("-project-declarations-unresolved")) {
    return "Project files declare an environment requirement that could not be resolved safely.";
  }
  return `Review required by ${normalized.replaceAll("-", " ")} evidence.`;
}

export function explainReasonCodes(codes = [], maximum = 3) {
  if (!Array.isArray(codes)) return [];
  return [...new Set(codes.map(explainReasonCode).filter(Boolean))].slice(0, maximum);
}
