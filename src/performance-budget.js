export const performanceBudget = Object.freeze({
  schemaName: "aienvmap-performance-budget",
  schemaVersion: 1,
  purpose: "Cross-platform regression ceilings for the default AI entry and environment inventory paths.",
  mode: "regression-guard-not-benchmark",
  commands: Object.freeze({
    scorecard: Object.freeze({ args: ["scorecard", "--json"], maxDurationMs: 5000, maxStdoutBytes: 65536 }),
    start: Object.freeze({ args: ["start", "--json"], maxDurationMs: 30000, maxStdoutBytes: 524288 }),
    reconcileQuick: Object.freeze({ args: ["reconcile", "--quick", "--json"], maxDurationMs: 30000, maxStdoutBytes: 1048576 })
  }),
  workspace: Object.freeze({ maxGeneratedBytes: 3145728, maxGeneratedFiles: 32 }),
  rule: "Budgets catch gross regressions across shared CI runners; they are not latency promises and must not be tightened from one machine's result."
});

export function evaluatePerformanceMeasurement(name, measurement, budget = performanceBudget) {
  const command = budget.commands[name];
  if (!command) throw new Error(`unknown performance budget ${name}`);
  const failures = [];
  if (measurement.durationMs > command.maxDurationMs) failures.push(`duration ${measurement.durationMs}ms > ${command.maxDurationMs}ms`);
  if (measurement.stdoutBytes > command.maxStdoutBytes) failures.push(`stdout ${measurement.stdoutBytes}B > ${command.maxStdoutBytes}B`);
  return { name, pass: failures.length === 0, budget: command, measurement, failures };
}

export function evaluateWorkspaceMeasurement(measurement, budget = performanceBudget) {
  const failures = [];
  if (measurement.generatedBytes > budget.workspace.maxGeneratedBytes) failures.push(`generated ${measurement.generatedBytes}B > ${budget.workspace.maxGeneratedBytes}B`);
  if (measurement.generatedFiles > budget.workspace.maxGeneratedFiles) failures.push(`files ${measurement.generatedFiles} > ${budget.workspace.maxGeneratedFiles}`);
  return { name: "workspace", pass: failures.length === 0, budget: budget.workspace, measurement, failures };
}
