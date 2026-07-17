# Troubleshooting

Known operational issues and quick fixes for `aienvmap`.

## Windows PowerShell blocks `npm.ps1` or `npx.ps1`

Symptom:

```text
npx.ps1 cannot be loaded because running scripts is disabled on this system
```

Cause:

- A Node.js installation commonly provides both PowerShell (`.ps1`) and command (`.cmd`) shims.
- PowerShell may select the `.ps1` shim first even when local or organization policy blocks PowerShell scripts.
- This happens before aienvmap starts and is not an aienvmap runtime failure.

Safe workaround:

```powershell
npx.cmd aienvmap@0.2.1 start
npx.cmd aienvmap@0.2.1 trial
npm.cmd --version
```

For an already installed package shim:

```powershell
aienvmap.cmd start
```

Safety rule:

- Keep the package name, version, and arguments unchanged when replacing only the launcher suffix.
- Do not run `Set-ExecutionPolicy`, use `-ExecutionPolicy Bypass`, or weaken machine or organization policy for aienvmap.

## npm publish succeeds but `npm view` still shows the old version

Symptom:

```text
npm publish
+ aienvmap@0.1.2
npm view aienvmap version
0.1.1
```

Cause:

- npm registry metadata can lag briefly after publish.

Check:

```bash
npm view aienvmap versions --json
npm dist-tag ls aienvmap
```

Fix:

- Wait briefly and re-check `npm view aienvmap version`.

## Windows `npm exec --package ... -- aienvmap --help` cannot find the command

Symptom:

```text
'aienvmap' is not recognized as an internal or external command
```

Notes:

- The package bin metadata can still be valid.
- A direct temporary install creates the expected `.bin/aienvmap.cmd` shim.

Check:

```bash
npm view aienvmap bin --json
npm install aienvmap@latest --prefix ./tmp-aienvmap-check
```

Workaround:

```bash
npx aienvmap@latest --version
```

or install first:

```bash
npm install -g aienvmap
aienvmap --version
```

## macOS SSH session cannot find `node` or `npm`

Symptom:

```text
command -v node
# empty in non-interactive SSH command
```

Cause:

- Node may be configured only in the login shell environment.

Fix:

```bash
/bin/zsh -lc 'node --version && npm --version'
```

For automation, make sure the shell PATH includes the Node/npm location.

## Missing manifest

Symptom:

```text
aienvmap: missing manifest; run `aienvmap sync` first
```

Fix:

```bash
npx aienvmap sync
```

Then retry:

```bash
npx aienvmap context
```

## Doctor shows warnings but exits successfully

Symptom:

```text
npx aienvmap doctor --json
# status: warning
# exit code: 0
```

Cause:

- Local checks are advisory by default so shared machines are not blocked unexpectedly.

Fail CI explicitly:

```bash
npx aienvmap doctor --strict policy
npx aienvmap doctor --strict security
npx aienvmap doctor --strict coordination
```

Check the machine-readable rule:

```bash
npx aienvmap doctor --json
```

Read `exitBehavior` and `strict.gate` to see when a failure exit code will be set.
