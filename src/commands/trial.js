import path from "node:path";
import { reconcileWorkspace } from "./reconcile.js";
import { sbomWorkspace } from "./sbom.js";
import { scanWorkspace } from "./scan.js";
import { buildPortableCaseSummary, renderPortableCaseMarkdown } from "../portable-reconcile.js";
import { writeJson, writeTextAtomic } from "../fsutil.js";
import { trialDir, workspaceDir } from "../paths.js";

const issueUrl = "https://github.com/soovwv/aienvmap/issues/new?template=environment_case.md";

export async function trialWorkspace(args = {}) {
  const dir = workspaceDir(args);
  const outputDir = trialDir(dir);
  await scanWorkspace({ ...args, dir, quiet: true, deep: false, security: false });
  const portable = await reconcileWorkspace({ ...args, dir, portable: true, quick: true, quiet: true, json: false, write: false, show_paths: false, full_packages: false });
  const lightSbom = await sbomWorkspace({ ...args, dir, quiet: true, json: false, write: false, security: false });
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
    status: "human-review-required",
    decision: portable.decision,
    inventoryCounts: summary.evidence.inventoryCounts,
    lightSbom: { packageCount: lightSbom.summary?.packages || 0, securityScanEnabled: false },
    artifacts: [".aienvmap/trial/portable.json", ".aienvmap/trial/case-summary.json", ".aienvmap/trial/case-draft.md", ".aienvmap/trial/NEXT.md"],
    next: "Review .aienvmap/trial/NEXT.md and case-draft.md. Complete the placeholders, then submit manually only if you consent.",
    feedbackUrl: issueUrl,
    privacy: { automaticUpload: false, telemetry: false, pathsInCaseDraft: false, reviewRequired: true },
    safety: { environmentChanged: false, softwareRemoved: false, pathModified: false },
    marketEvidence: false,
    rule: "A trial is not evidence until an independent human reviews, completes, and manually submits the draft."
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

The read-only trial is complete. There is no automatic upload. aienvmap did not remove software, install development tools, or modify PATH. The \`npx\` launcher may cache the aienvmap package itself.

1. Review \`case-summary.json\` and \`case-draft.md\`.
2. In \`case-draft.md\`, complete every placeholder with honest feedback. Negative feedback, false positives, and missed installations are valuable.
3. Remove any private details you added. Do not paste \`portable.json\` publicly because it retains versions and a linkable comparison fingerprint.
4. Open ${issueUrl} and paste the reviewed contents of \`case-draft.md\`.
5. Submit only if you consent to a public GitHub issue and the citation checkbox.

If the result is wrong or the command failed, open a normal bug report instead. Never include secrets, environment-variable values, usernames, hostnames, paths, or private project/package names.
`;
}
