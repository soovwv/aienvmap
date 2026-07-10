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
