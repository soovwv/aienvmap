# aienvmap interoperability boundary

APM and aienvmap operate on separate planes:

- APM installs and locks agent context such as this skill.
- aienvmap observes current runtime, package-manager, dependency, and coordination evidence.

Runtime and environment tools remain separate:

- mise, Flox, Devbox, asdf, and native installers may implement an explicitly approved environment change;
- aienvmap should describe why a change may be useful without invoking those tools automatically.

Security tools remain authoritative for their domain:

- use `aienvmap sbom --json` for a lightweight dependency coordination view;
- use Syft or another full generator when a complete SBOM is required;
- use Trivy, Grype, Dependency-Track, or another scanner when vulnerability evidence is required;
- import reviewed CycloneDX or SPDX evidence into aienvmap when the AI workflow needs a compact decision and handoff.

After any separately approved change, refresh evidence and record checkpoint plus handoff. Never convert scanner findings directly into removal authority.

