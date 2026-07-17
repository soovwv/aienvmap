# aienvmap 0.2.1

## Dashboard rendering reliability

This patch fixes a generated-dashboard execution-order bug that could leave the page background visible while the main dashboard remained empty.

```bash
npx aienvmap@0.2.1 start
npx aienvmap@0.2.1 dash --open
```

## Fixes

- Replaced temporal-dead-zone-sensitive card helpers with hoisted function declarations.
- Delayed card-group construction until all dashboard data and presentation fragments are initialized.
- Added an execution-level regression test that runs the generated client script and verifies populated dashboard content instead of checking source strings alone.

## Documentation

- Uses `https://aienvmap.svwvs.com/` as the primary product introduction URL.
- Simplifies the README first screen around the problem, one-command start, safety boundary, intended users, and non-goals.
- Adds a promotion guide and keeps individual public environment submissions out of promotion until at least five have been collected.

The stabilized JSON contract remains additive from `0.2.0`. This patch does not authorize installation, removal, PATH edits, runtime switching, or automatic environment repair.
