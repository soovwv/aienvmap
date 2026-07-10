# Security Policy

`aienvmap` is designed to be non-invasive by default.

It scans local environment metadata, writes local project files, and does not intentionally upload environment data to a remote service.

## Reporting a Vulnerability

Please report security issues through GitHub Security Advisories if available, or open a private contact channel with the maintainer.

Do not include secrets, private environment dumps, access tokens, or production hostnames in public issues.

## Operational Safety

- Normal warnings are advisory and non-blocking.
- `aienvmap doctor --ci` is the explicit strict mode for automation.
- `aienvmap` should not install, upgrade, downgrade, or remove software by itself.
- Generated files should be reviewed before committing in sensitive repositories.

## Sensitive Data

Current manifests may include local paths, hostnames, shell paths, and runtime versions. Treat generated `.aienvmap/` outputs as workspace metadata and decide whether they belong in your repository.
