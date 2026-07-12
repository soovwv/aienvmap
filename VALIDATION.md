# Cross-platform validation

Observed 2026-07-12. This record contains redacted maintainer-run compatibility evidence. It is not independent adoption, a user count, or an outcome-verified market case.

| Environment | Runtime | Checks | Result |
| --- | --- | --- | --- |
| Windows 11 x64 workstation | Node 24.14.1, npm 11.11.0 | full `npm run release:check`; real-host quick reconciliation | pass |
| Ephemeral Alpine Linux x64 container | official `node:20-alpine`, Node 20.20.2 | English text policy, 314 tests, version/help smoke, quick reconciliation | pass; 5 platform-specific skips |
| Intel macOS 26.2 host | official Node 20.20.2 Darwin x64 archive in a temporary directory | published SHA-256 verification, English text policy, 314 tests, version/help smoke, quick reconciliation | pass; 5 platform-specific skips |

## Redacted reconciliation observations

| Environment | Node | npm | Python | Java | Decision | Findings | Removal authorized |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Windows | 1 | 1 | 2 | 0 | review | 2 | false |
| Alpine Linux | 1 | 1 | 0 | 0 | clear | 0 | false |
| macOS | 1 | 1 | 1 | 0 | clear | 0 | false |

Counts are visible-command evidence from quick read-only scans, not proof of complete machine inventory or installation ownership.

## Safety and cleanup

- The Linux container used a read-only repository mount and was removed automatically.
- The macOS run did not install Node system-wide. It used the official archive in a guarded `/tmp` directory after SHA-256 verification.
- Temporary macOS repository, runtime, and log paths were deleted and cleanup was verified.
- Host addresses, account names, home paths, credentials, and raw reconciliation artifacts are intentionally excluded.
- No test authorized package installation, runtime switching, PATH edits, or software removal.
