import path from "node:path";

export const agentSkillMarker = "<!-- aienvmap-agent-skill:v1 -->";

export const agentSkillLocations = [
  {
    kind: "cross-tool-agent-skill",
    file: path.join(".agents", "skills", "aienvmap", "SKILL.md"),
    availableTo: ["codex", "gemini", "cursor", "copilot"]
  },
  {
    kind: "claude-agent-skill",
    file: path.join(".claude", "skills", "aienvmap", "SKILL.md"),
    availableTo: ["claude"]
  }
];

export function hasAienvmapAgentSkill(value = "") {
  const text = String(value);
  const frontmatterEnd = text.startsWith("---") ? text.indexOf("\n---", 3) : -1;
  const frontmatter = frontmatterEnd > 0 ? text.slice(0, frontmatterEnd + 4) : "";
  const marker = text.indexOf(agentSkillMarker);
  return /^name:\s*aienvmap\s*$/m.test(frontmatter)
    && marker >= 0
    && text.indexOf(agentSkillMarker, marker + agentSkillMarker.length) < 0;
}

