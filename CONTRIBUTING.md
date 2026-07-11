# Contributing

Thanks for helping improve `aienvmap`.

## Development

```bash
node --test
node bin/aienvmap.js scan --dir sample-app
node bin/aienvmap.js context --dir sample-app
```

## Design Principles

- AI agents are the primary consumers.
- Human dashboards are derived views.
- Environment-changing actions should be visible in an append-only ledger.
- Scanner failures should degrade gracefully unless the manifest would become misleading.

## Real Environment Cases

Use the [portable environment case guide](examples/portable-environment-case-guide.md) and GitHub **Portable environment case** issue template. Submit only manually reviewed portable evidence; never submit raw reconciliation artifacts or secrets. Only independent, outcome-verified cases count toward market validation.
