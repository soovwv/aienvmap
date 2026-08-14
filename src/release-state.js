export const releaseState = Object.freeze({
  version: "0.2.2",
  status: "published",
  releasedAt: "2026-07-26T00:21:25+09:00",
  sourceTag: "v0.2.2",
  sourceCommit: "8e00a349b82f04bd64dd84843cdfd9e3c6c582d3",
  npmDistTag: "latest",
  trustedPublishing: "verified",
  provenance: "verified",
  registryIntegrity: "verified"
});

export function publishedReleaseEvidence(state = releaseState) {
  return [
    { id: "npm-trusted-publisher", status: state.trustedPublishing, rule: "Publish through the configured npm trusted publisher without long-lived publish credentials." },
    { id: "immutable-release-source", status: state.sourceTag ? "verified" : "pending", rule: `${state.sourceTag || `v${state.version}`} identifies the exact CI-passing release source.` },
    { id: "npm-provenance", status: state.provenance, rule: "Registry attestations include npm publish and SLSA provenance statements." }
  ];
}
