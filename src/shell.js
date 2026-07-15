import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function commandVersion(command, args = ["--version"]) {
  return (await commandVersionResult(command, args)).version;
}

export async function commandVersionResult(command, args = ["--version"], options = {}) {
  const result = await commandResult(command, args, { timeout: options.timeout || 2500, maxBuffer: options.maxBuffer, cwd: options.cwd, env: options.env });
  const version = firstVersion(`${result.stdout}\n${result.stderr}`);
  return {
    ...result,
    version,
    verified: Boolean(version),
    failure: version ? undefined : result.failure || "version-not-recognized"
  };
}

export async function commandOutput(command, args = [], options = {}) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: options.timeout || 2500,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      cwd: options.cwd,
      env: options.env,
      windowsVerbatimArguments: options.windowsVerbatimArguments === true,
      windowsHide: true
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function commandResult(command, args = [], options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: options.timeout || 5000,
      maxBuffer: options.maxBuffer || 2 * 1024 * 1024,
      cwd: options.cwd,
      env: options.env,
      windowsVerbatimArguments: options.windowsVerbatimArguments === true,
      windowsHide: true
    });
    return { ok: true, code: 0, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      code: typeof error.code === "number" ? error.code : 1,
      failure: commandFailure(error),
      stdout: String(error.stdout || "").trim(),
      stderr: String(error.stderr || error.message || "").trim()
    };
  }
}

export function commandFailure(error = {}) {
  if (error.code === "ENOENT") return "command-not-found";
  if (["EACCES", "EPERM"].includes(error.code)) return "permission-denied";
  if (error.killed || error.signal || error.code === "ETIMEDOUT") return "timeout-or-terminated";
  if (typeof error.code === "number") return "nonzero-exit";
  return "execution-failed";
}

export async function portableCommandResult(command, args = [], options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== "win32" || !/\.(?:cmd|bat)$/i.test(command)) return commandResult(command, args, options);
  const comspec = options.comspec || process.env.ComSpec || "cmd.exe";
  let batchCommand = command;
  if (!/[\\/]/.test(batchCommand)) {
    const systemRoot = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
    const where = `${systemRoot.replace(/[\\/]+$/, "")}\\System32\\where.exe`;
    const located = await commandResult(where, [batchCommand], options);
    batchCommand = located.ok ? located.stdout.split(/\r?\n/).find(Boolean) || "" : "";
  }
  const commandLine = windowsCmdCommandLine(batchCommand, args);
  if (!commandLine) return {
    ok: false,
    code: 1,
    failure: "unsafe-command-input",
    stdout: "",
    stderr: "refused unsafe Windows command path or argument"
  };
  return commandResult(comspec, ["/d", "/v:off", "/s", "/c", commandLine], { ...options, windowsVerbatimArguments: true });
}

export function windowsCmdCommandLine(command, args = []) {
  const file = String(command || "");
  const values = args.map((item) => String(item));
  if (!file || /[\r\n"%!]/.test(file)) return "";
  if (values.some((item) => /[\r\n"%!&|<>^()]/.test(item))) return "";
  const renderedValues = values.map((item) => /^[A-Za-z0-9._@:/=+,-]+$/.test(item) ? item : `"${item}"`);
  return `""${file}"${renderedValues.length ? ` ${renderedValues.join(" ")}` : ""}"`;
}

export function firstVersion(text) {
  const match = String(text).match(/(?:v)?(\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?)/);
  return match ? match[1] : null;
}
