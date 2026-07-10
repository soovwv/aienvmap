export const TRUST_STATES = {
  OBSERVED: "observed",
  PLANNED: "planned",
  CHANGED: "changed",
  REVIEW: "review",
  VERIFIED: "verified",
  STALE: "stale"
};

export function observedTrust(now = new Date()) {
  return {
    state: TRUST_STATES.OBSERVED,
    at: now.toISOString(),
    by: "aienvmap scan",
    verified: false,
    note: "Machine-observed only. AI agents cannot mark environment facts as verified."
  };
}

export function plannedTrust(now = new Date()) {
  return {
    state: TRUST_STATES.PLANNED,
    at: now.toISOString(),
    verified: false
  };
}

export function changedTrust(now = new Date(), requiresReview = false) {
  return {
    state: requiresReview ? TRUST_STATES.REVIEW : TRUST_STATES.CHANGED,
    at: now.toISOString(),
    verified: false
  };
}

export function isStaleTimestamp(value, now = new Date(), maxAgeHours = 24) {
  if (!value) return false;
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return false;
  return now.getTime() - then > maxAgeHours * 60 * 60 * 1000;
}
