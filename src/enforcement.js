const STRICT_SCOPES = ["security", "policy", "coordination", "all"];

export function strictResult(warnings = [], args = {}) {
  const scope = normalizeStrictScope(args.strict || (args.ci ? "all" : ""));
  const matchedWarnings = scope ? warnings.filter((warning) => warningMatchesScope(warning, scope)) : [];
  const gate = enforcementGate(scope);
  return {
    enabled: Boolean(scope),
    scope: scope || "off",
    fail: matchedWarnings.length > 0,
    matchedWarningCodes: matchedWarnings.map((warning) => warning.code),
    availableScopes: STRICT_SCOPES,
    gate
  };
}

export function enforcementAdvice(warnings = []) {
  const scopeResults = STRICT_SCOPES.map((scope) => {
    const result = strictResult(warnings, { strict: scope });
    return {
      scope,
      status: result.fail ? "fail" : "pass",
      matchedWarningCodes: result.matchedWarningCodes
    };
  });
  const suggestedStrictScopes = scopeResults
    .filter((item) => item.scope !== "all" && item.status === "fail")
    .map((item) => item.scope);
  return {
    mode: "advisory-by-default",
    localBehavior: "non-blocking",
    ciBehavior: "strict-only-when-requested",
    gate: enforcementGate(""),
    suggestedStrictScopes,
    scopes: scopeResults,
    strictPlan: strictScopePlan(suggestedStrictScopes, scopeResults),
    strictDecision: strictDecision(suggestedStrictScopes, scopeResults),
    policy: enforcementPolicy(suggestedStrictScopes, scopeResults),
    recommendedCommand: suggestedStrictScopes.length
      ? `aienvmap doctor --strict ${suggestedStrictScopes[0]}`
      : "aienvmap doctor --strict all",
    note: "Use strict mode in CI or explicit checks; do not block local operation unless the user requests it."
  };
}

export function enforcementPolicy(suggestedStrictScopes = [], scopeResults = []) {
  const recommendedScope = suggestedStrictScopes[0] || "all";
  const failingScopes = suggestedStrictScopes.slice();
  const releaseScope = "all";
  return {
    defaultMode: "advisory",
    local: {
      mode: "warn-only",
      command: "aienvmap doctor --json",
      fails: false
    },
    ci: {
      mode: failingScopes.length ? "strict-recommended-scope" : "optional-health-check",
      scope: recommendedScope,
      command: `aienvmap doctor --strict ${recommendedScope} --json`,
      failsOn: failingScopes.length ? "matching recommended-scope warnings" : "only if explicit all-scope health check fails"
    },
    release: {
      mode: "strict-all",
      scope: releaseScope,
      command: "aienvmap doctor --strict all --json",
      failsOn: "any security, policy, or coordination warning"
    },
    rule: "Keep local operation advisory. Use CI/release strict checks only when automation or a human explicitly asks for a gate.",
    scopeStatuses: scopeResults.map((item) => ({
      scope: item.scope,
      status: item.status,
      matchedWarningCodes: item.matchedWarningCodes || []
    }))
  };
}

export function strictDecision(suggestedStrictScopes = [], scopeResults = []) {
  const recommendedScope = suggestedStrictScopes[0] || "all";
  const failingScopes = suggestedStrictScopes.slice();
  const passingScopes = scopeResults
    .filter((item) => item.scope !== "all" && item.status === "pass")
    .map((item) => item.scope);
  return {
    local: "warn-only",
    localCommand: "aienvmap doctor --json",
    shouldFailLocal: false,
    ci: failingScopes.length ? "fail-on-recommended-scope" : "optional-health-check",
    recommendedScope,
    recommendedCommand: `aienvmap doctor --strict ${recommendedScope}`,
    ciCommand: `aienvmap doctor --strict ${recommendedScope} --json`,
    failingScopes,
    passingScopes,
    rule: failingScopes.length
      ? "Keep local operation advisory; use the first failing scope only when CI or the user wants a gate."
      : "Keep local operation advisory; use --strict all only for explicit CI health checks.",
    whenToUseStrict: "CI, release checks, or explicit human-requested verification."
  };
}

export function strictScopePlan(suggestedStrictScopes = [], scopeResults = []) {
  const firstScope = suggestedStrictScopes[0] || "all";
  return {
    mode: "advisory-local-strict-ci",
    localDefault: "aienvmap doctor --json",
    recommendedStrictScope: firstScope,
    recommendedStrictCommand: `aienvmap doctor --strict ${firstScope}`,
    ciCommand: `aienvmap doctor --strict ${firstScope} --json`,
    allScopesCommand: "aienvmap doctor --strict all --json",
    scopeStatuses: scopeResults.map((item) => ({
      scope: item.scope,
      status: item.status,
      matchedWarningCodes: item.matchedWarningCodes || []
    })),
    rule: suggestedStrictScopes.length
      ? "Use the narrowest failing strict scope first; keep local operation advisory unless CI or the user explicitly requests failure."
      : "No scope currently fails; use --strict all only for explicit CI health checks."
  };
}

export function enforcementGate(scope = "") {
  const strictScope = normalizeStrictScope(scope);
  return {
    defaultMode: "advisory",
    strictMode: strictScope || "off",
    localDefault: "warn-only",
    failCondition: strictScope ? `matching warnings in ${strictScope}` : "never in default mode",
    exitCode: strictScope ? "1 when matching warnings exist" : "0 unless the command itself errors",
    rule: "Do not block local or shared machine operation unless --strict or --ci is explicitly requested."
  };
}

function normalizeStrictScope(value) {
  if (value === true) return "all";
  const scope = String(value || "").trim().toLowerCase();
  if (!scope || scope === "false" || scope === "off") return "";
  if (STRICT_SCOPES.includes(scope)) return scope;
  return "all";
}

function warningMatchesScope(warning, scope) {
  if (scope === "all") return true;
  return warningScope(warning.code) === scope;
}

function warningScope(code = "") {
  if (code === "security-vulnerabilities") return "security";
  if (["conflicting-open-intents", "stale-open-intent", "handoff-stale", "multi-agent-records"].includes(code)) return "coordination";
  return "policy";
}
