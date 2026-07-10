export function diffManifests(previous, current) {
  if (!previous) return [];
  const changes = [];
  compareFlat("runtime", previous.runtimes || {}, current.runtimes || {}, changes);
  compareFlat("package-manager", previous.packageManagers || {}, current.packageManagers || {}, changes);
  compareFlat("container", previous.containers || {}, current.containers || {}, changes);
  compareFlat("project-hint", previous.projectHints || {}, current.projectHints || {}, changes);
  compareFlat("agent-file", previous.agentFiles || {}, current.agentFiles || {}, changes);
  return changes;
}

function compareFlat(scope, before, after, changes) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    if (before[key] === undefined && after[key] !== undefined) {
      changes.push({ scope, key, type: "added", after: after[key] });
    } else if (before[key] !== undefined && after[key] === undefined) {
      changes.push({ scope, key, type: "removed", before: before[key] });
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({ scope, key, type: "changed", before: before[key], after: after[key] });
    }
  }
}
