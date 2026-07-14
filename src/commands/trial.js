import path from "node:path";
import { reconcileWorkspace } from "./reconcile.js";
import { buildSbomArtifact } from "./sbom.js";
import { buildManifest } from "../manifest.js";
import { buildPortableCaseSummary, renderPortableCaseMarkdown } from "../portable-reconcile.js";
import { writeJson, writeTextAtomic } from "../fsutil.js";
import { trialDir, workspaceDir } from "../paths.js";

const issueUrl = "https://github.com/soovwv/aienvmap/issues/new?template=environment_case.md";

export async function trialWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const outputDir = trialDir(dir);
  const manifest = await buildManifest(dir, { deep: false, security: false });
  const portable = await reconcileWorkspace({ ...args, dir, portable: true, quick: true, quiet: true, json: false, write: false, show_paths: false, full_packages: false, inspect_project_wrappers: false });
  const lightSbom = buildSbomArtifact(manifest);
  const summary = buildPortableCaseSummary(portable);
  const draft = renderPortableCaseMarkdown(summary);
  const portableFile = path.join(outputDir, "portable.json");
  const summaryFile = path.join(outputDir, "case-summary.json");
  const draftFile = path.join(outputDir, "case-draft.md");
  const instructionsFile = path.join(outputDir, "NEXT.md");
  await writeJson(portableFile, portable);
  await writeJson(summaryFile, summary);
  await writeTextAtomic(draftFile, draft);
  await writeTextAtomic(instructionsFile, renderNextSteps());
  const result = {
    schemaName: "aienvmap.trial-result",
    schemaVersion: 1,
    status: "technical-test-complete",
    decision: portable.decision,
    inventoryCounts: summary.evidence.inventoryCounts,
    lightSbom: { packageCount: lightSbom.summary?.packages || 0, securityScanEnabled: false },
    artifacts: [".aienvmap/trial/portable.json", ".aienvmap/trial/case-summary.json", ".aienvmap/trial/case-draft.md", ".aienvmap/trial/NEXT.md"],
    next: "Technical testing is complete. Ask an AI to summarize case-summary.json. Public case evidence is optional and requires brief human confirmation and separate submission consent.",
    feedbackUrl: issueUrl,
    privacy: { automaticUpload: false, telemetry: false, pathsInCaseDraft: false, technicalResultReviewRequired: false, publicSubmissionReviewRequired: true },
    safety: { environmentChanged: false, softwareRemoved: false, pathModified: false, projectWrappersExecuted: false, runtimeVersionProbesExecuted: true },
    marketEvidence: false,
    rule: "Technical testing needs no human opinion; public market evidence requires independent human confirmation, privacy review, and explicit submission consent."
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (!args.quiet) {
    console.log(`aienvmap trial: ${result.status}`);
    console.log(`decision: ${result.decision}`);
    console.log(`review: ${result.artifacts[3]} -> ${result.artifacts[2]}`);
    console.log(`submit: ${result.feedbackUrl}`);
    console.log("privacy: no telemetry or automatic upload");
  }
  return result;
}

function renderNextSteps() {
  return `# aienvmap trial next steps

The non-mutating trial is complete. There is no automatic upload. aienvmap did not remove software, install development tools, modify PATH, or execute project Maven/Gradle wrappers. It did run bounded version probes for discovered runtime executables. The \`npx\` launcher may cache the aienvmap package itself.

## Technical test: no opinion required

The command result and \`case-summary.json\` are enough to check whether discovery ran and what it detected. Ask an AI to summarize them. You do not need to write a review, rate the product, or publish anything.

## Optional public environment case

If you want the result to become public product evidence, let the AI fill all factual fields in \`case-draft.md\`. The AI should ask once for this compact confirmation:

\`real=yes|partly|no; useful=1|2|3|4|5|skip; outcome=no-change|follow-up|change-made|other; independent=yes|no\`

An optional correction may follow the same reply. The AI must not infer an answer from silence. It must then remove private details, show the complete draft, and ask separately for explicit public submission approval. Do not paste \`portable.json\` publicly because it retains versions and a linkable comparison fingerprint.

Open ${issueUrl} only after that approval. Negative results, a usefulness value of \`skip\`, and a no-change outcome are valid. A report without the required human confirmation may be useful technical feedback but is not independent market evidence.

If the result is wrong or the command failed, open a normal bug report instead. Never include secrets, environment-variable values, usernames, hostnames, paths, or private project/package names.
`;
}
