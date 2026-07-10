import fs from "node:fs/promises";
import { diagnose } from "../doctor.js";
import { readJson } from "../fsutil.js";
import { openIntents, readJsonl, readTimeline } from "../timeline.js";
import { aiEnvPath, intentsPath, manifestPath, timelinePath, workspaceDir } from "../paths.js";
import { renderAIEnv } from "../render.js";
import { loadPolicy, policyWarnings } from "../policy.js";
import { buildPreflight } from "../preflight.js";

export async function compileWorkspace(args) {
  const dir = workspaceDir(args);
  const manifest = await readJson(manifestPath(dir));
  if (!manifest) throw new Error("missing manifest; run `aienvmap sync` first");
  const timeline = await readTimeline(timelinePath(dir));
  const intents = openIntents(await readJsonl(intentsPath(dir)));
  const policy = await loadPolicy(dir);
  const warnings = [...diagnose(manifest, { timeline, intents }), ...policyWarnings(manifest, policy)];
  const rendered = renderAIEnv({
    ...manifest,
    preflight: buildPreflight(manifest, warnings, intents)
  }, timeline, warnings, intents, policy);
  await fs.writeFile(aiEnvPath(dir), rendered, "utf8");
  if (!args.quiet) {
    console.log(`compiled ${aiEnvPath(dir)}`);
  }
  return {
    aiEnv: aiEnvPath(dir)
  };
}
