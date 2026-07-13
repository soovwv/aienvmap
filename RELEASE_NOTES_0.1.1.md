# aienvmap 0.1.1

## External tester release

This release adds a one-command, read-only trial for real development environments:

```bash
npx aienvmap@0.1.1 trial
```

The trial maps observed Node, Python, Java, package-manager, and light SBOM state. Run it in a disposable directory or disposable project copy: published 0.1.1 writes under `.aienvmap/` and may refresh existing manifest and timeline state. It does not remove development tools or modify PATH, and never uploads feedback automatically.

- [Human testing guide](https://github.com/soovwv/aienvmap/blob/v0.1.1/TESTING.md)
- [AI-assisted testing guide](https://github.com/soovwv/aienvmap/blob/v0.1.1/AI_TESTING.md)
- The trial creates a privacy-reviewed feedback draft for optional manual submission.

## Verification

- Windows, Ubuntu, and macOS CI
- Zero runtime dependencies
- Registry integrity and signed npm provenance
- Registry-installed trial verification

Honest reports of missed installations, false positives, confusing output, and safe no-change decisions are especially useful.
