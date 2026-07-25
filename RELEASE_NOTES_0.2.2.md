# aienvmap 0.2.2

## Human dashboard and reliability

This compatible patch ships the simplified dashboard that was developed after 0.2.1. The human view now separates a concise environment overview from light SBOM details.

```bash
npx aienvmap@0.2.2 start
npx aienvmap@0.2.2 dash --open
```

## Improvements

- Groups detected tools into runtimes, package managers, and containers.
- Separates Environment Overview and SBOM into independent tabs.
- Uses distinct critical, high, and moderate risk styling.
- Isolates overview and SBOM rendering failures so one section cannot blank the full page.
- Tolerates missing optional timestamps and incomplete evidence.
- Adds concise command-specific help and compact default start/status output.
- Improves project-version, runtime-route, and mise/fnm/nvm/Volta evidence.
- Retries bounded transient Windows file-lock failures.
- Splits large environment-discovery logic into focused modules while retaining zero runtime dependencies.

## Release verification

The installed-package gate packs and installs the actual npm tarball, generates a dashboard with that installed CLI, and verifies the simplified Overview/SBOM structure. This prevents a local-only dashboard change from being mistaken for a published change.

The stabilized JSON contract remains additive from 0.2.0. This release does not install, remove, switch, upgrade, or repair runtimes and does not claim independent product validation.
