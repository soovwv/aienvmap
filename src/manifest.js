import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { commandOutput, commandVersion } from "./shell.js";
import { exists } from "./fsutil.js";
import { observedTrust } from "./trust.js";
import { scanGlobalInventory } from "./inventory.js";
import { scanSecurity } from "./security.js";
import { buildLightSbom, linkVulnerableDependencies, scanDependencySnapshot } from "./dependencies.js";

export async function buildManifest(dir, options = {}) {
  const now = new Date().toISOString();
  const dependencySnapshot = await scanDependencySnapshot(dir);
  const security = linkVulnerableDependencies(await scanSecurity(dir, { security: options.security }), dependencySnapshot);
  const lightSbom = buildLightSbom(dependencySnapshot, security);
  const manifest = {
    schemaName: "aienvmap.runtime-sbom",
    schemaVersion: 1,
    generatedAt: now,
    generatedBy: {
      name: "aienvmap",
      command: generatedCommand(options)
    },
    trust: observedTrust(new Date(now)),
    workspace: {
      path: dir,
      name: path.basename(dir)
    },
    os: await scanOS(),
    runtimes: await scanRuntimes(),
    packageManagers: await scanPackageManagers(),
    containers: await scanContainers(),
    projectHints: await scanProjectHints(dir),
    dependencySnapshot,
    lightSbom,
    inventory: await scanGlobalInventory({ deep: options.deep }),
    security,
    agentFiles: await scanAgentFiles(dir),
    agentProtocol: {
      sourceOfTruth: "AIENV.md",
      preflightCommand: "aienvmap context",
      handoffCommand: "aienvmap handoff",
      intentCommand: "aienvmap intent --actor agent:id --action planned-change",
      recordCommand: "aienvmap record --actor agent:id --summary what-changed",
      checkpointCommand: "aienvmap checkpoint --actor agent:id --summary what-changed --target environment",
      afterEnvironmentChange: ["aienvmap checkpoint --actor agent:id --summary what-changed --target environment"],
      trustModel: {
        agentWritable: ["observed", "planned", "changed", "review", "stale"],
        verifiedRequires: "human-or-ci",
        rule: "AI agents may report observations and plans, but must not mark environment facts as verified."
      },
      globalRuntimeChangeRequiresUserApproval: true,
      globalInstallPolicy: "ask-first",
      projectLocalChanges: "allowed-when-task-requires"
    },
    evidence: {
      runtimes: {
        node: "node --version",
        python: "python --version",
        python3: "python3 --version",
        go: "go version",
        java: "java -version",
        rustc: "rustc --version"
      },
      packageManagers: {
        npm: "npm --version",
        pnpm: "pnpm --version",
        yarn: "yarn --version",
        uv: "uv --version",
        pip: "pip --version",
        pipx: "pipx --version",
        mise: "mise --version",
        asdf: "asdf --version",
        pyenv: "pyenv --version",
        nvm: "nvm --version",
        fnm: "fnm --version",
        volta: "volta --version"
      },
      containers: {
        docker: "docker --version",
        compose: "docker compose version or docker-compose --version"
      },
      globalInventory: {
        mode: "basic by default; deep only when requested",
        npmGlobal: "npm list -g --depth=0 --json",
        pipx: "pipx list --json",
        uvTools: "uv tool list",
        brew: "brew list --versions"
      },
      security: {
        mode: "basic by default; vulnerability summaries only when requested",
        npmAudit: "npm audit --json"
      },
      dependencySnapshot: {
        mode: "read-only project file snapshot",
        node: "package.json dependencies",
        python: "requirements.txt and pyproject.toml dependencies"
      },
      projectHints: [
        ".nvmrc",
        ".python-version",
        "mise.toml",
        ".tool-versions",
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "Dockerfile",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock"
      ]
    }
  };
  return manifest;
}

function generatedCommand(options = {}) {
  return ["aienvmap", "sync", options.deep ? "--deep" : "", options.security ? "--security" : ""].filter(Boolean).join(" ");
}

async function scanOS() {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    shell: process.env.SHELL || process.env.ComSpec || ""
  };
}

async function scanRuntimes() {
  return compact({
    node: await commandVersion("node"),
    python: await commandVersion("python"),
    python3: await commandVersion("python3"),
    go: await commandVersion("go", ["version"]),
    java: await commandVersion("java", ["-version"]),
    rustc: await commandVersion("rustc", ["--version"])
  });
}

async function scanPackageManagers() {
  return compact({
    npm: await commandVersion(process.platform === "win32" ? "npm.cmd" : "npm"),
    pnpm: await commandVersion(process.platform === "win32" ? "pnpm.cmd" : "pnpm"),
    yarn: await commandVersion(process.platform === "win32" ? "yarn.cmd" : "yarn"),
    uv: await commandVersion("uv"),
    pip: await commandVersion("pip"),
    pipx: await commandVersion("pipx"),
    mise: await commandVersion("mise"),
    asdf: await commandVersion("asdf"),
    pyenv: await commandVersion("pyenv"),
    nvm: await commandVersion("nvm"),
    fnm: await commandVersion("fnm"),
    volta: await commandVersion("volta")
  });
}

async function scanContainers() {
  return compact({
    docker: await commandVersion("docker", ["--version"]),
    compose: await dockerComposeVersion()
  });
}

async function dockerComposeVersion() {
  const v2 = await commandOutput("docker", ["compose", "version"]);
  if (v2) return v2.replace(/^Docker Compose version\s+/i, "");
  return await commandVersion(process.platform === "win32" ? "docker-compose.exe" : "docker-compose");
}

async function scanProjectHints(dir) {
  const hints = {};
  for (const [key, file] of [
    ["nvmrc", ".nvmrc"],
    ["pythonVersion", ".python-version"],
    ["mise", "mise.toml"],
    ["toolVersions", ".tool-versions"],
    ["packageJson", "package.json"],
    ["pyproject", "pyproject.toml"],
    ["requirements", "requirements.txt"],
    ["dockerfile", "Dockerfile"],
    ["packageLock", "package-lock.json"],
    ["pnpmLock", "pnpm-lock.yaml"],
    ["yarnLock", "yarn.lock"]
  ]) {
    const full = path.join(dir, file);
    if (!(await exists(full))) continue;
    if (["nvmrc", "pythonVersion"].includes(key)) {
      hints[key] = (await fs.readFile(full, "utf8")).trim();
    } else {
      hints[key] = true;
    }
  }
  return hints;
}

async function scanAgentFiles(dir) {
  const files = {
    agents: "AGENTS.md",
    claude: "CLAUDE.md",
    gemini: "GEMINI.md",
    cursor: path.join(".cursor", "rules", "environment.md"),
    copilot: path.join(".github", "copilot-instructions.md")
  };
  const out = {};
  for (const [name, rel] of Object.entries(files)) {
    const full = path.join(dir, rel);
    const fileExists = await exists(full);
    const content = fileExists ? await fs.readFile(full, "utf8") : "";
    out[name] = {
      path: rel,
      exists: fileExists,
      hasAienvmapPointer: content.includes("<!-- aienvmap:begin -->") && content.includes("<!-- aienvmap:end -->"),
      installCommand: snippetCommand(name),
      role: agentRole(name)
    };
  }
  return out;
}

function snippetCommand(name) {
  if (name === "agents") return "aienvmap snippet codex --write";
  if (["claude", "gemini", "cursor", "copilot"].includes(name)) return `aienvmap snippet ${name} --write`;
  return "";
}

function agentRole(name) {
  if (name === "agents") return "codex";
  if (["claude", "gemini", "cursor", "copilot"].includes(name)) return name;
  return "external";
}

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value));
}
