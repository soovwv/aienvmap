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
- Generated files should be reviewed before committing in sensitive repositories. Treat raw manifests, reconciliation reports, SBOM files, dashboards, and trial portable evidence as local-only by default. Coordination logs can contain operator-supplied text. aienvmap does not edit `.gitignore`; use a project-specific ignore policy and share only reviewed portable evidence.

## Sensitive Data

Current manifests may include local paths, hostnames, shell paths, and runtime versions. Treat generated `.aienvmap/` outputs as workspace metadata and decide whether they belong in your repository.

## Release provenance

The manual npm workflow requests GitHub OIDC permission and publishes with provenance only from the current `main` commit when a matching `v<version>` tag exists. It pins an npm CLI that meets the trusted-publishing floor, rejects already-published versions, and verifies registry version plus integrity afterward. Trusted publisher authentication is the only supported release path and receives no long-lived token. Workflow readiness is not proof that npm-side trusted publishing is configured or that an unpublished release already has provenance.
