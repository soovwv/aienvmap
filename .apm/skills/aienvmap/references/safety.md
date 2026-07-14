# aienvmap safety boundary

- Default to read-only observation and advisory decisions.
- Do not infer that duplicate runtimes are accidental.
- Do not execute files discovered under another user's home. Administrator file-presence evidence requires owning-user verification for authoritative versions.
- Do not reveal paths, usernames, hostnames, secrets, environment-variable values, or private package and project names in public reports.
- Do not treat `ownershipProven: true` as removal authorization. `removalAuthorized` remains false unless a separate explicit user decision grants a specific action.
- Java remains information-only. Never propose automatic Java removal or consolidation.
- A light SBOM is coordination evidence, not compliance or vulnerability proof.
- `hostAutomaticPickupVerified: false` means a project file cannot prove that the current AI host loaded it.
- Local source edits may continue when status permits them; environment-affecting changes require the intent, review, checkpoint, and handoff flow.

When evidence is insufficient, choose `need-more-evidence`. Preserve `keep-intentional` as a valid answer when the user intentionally maintains multiple versions.

