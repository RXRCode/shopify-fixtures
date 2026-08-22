# Contributing

Thanks for helping improve RXR Shopify Fixtures.

## Principles

1. Keep the core developer-first and CLI-first.
2. Prefer deterministic, Git-friendly behavior.
3. Avoid destructive behavior by default.
4. Keep Shopify API handling isolated from fixture-domain logic.
5. Add tests for bug fixes and behavior changes.

## Local setup

```bash
npm install
cp .env.example .env
npm run check
```

You do not need Shopify credentials for unit and contract tests.

## Pull requests

Keep PRs focused. Explain the user problem, implementation approach, safety implications, tests, and any Shopify API version assumptions. Do not include credentials or production-store exports.

## Commit style

Conventional Commits are encouraged (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`), but correctness and clarity matter more than rigid formatting.

## New presets

Presets must be deterministic, use fictional/non-infringing demo data, include a unit test, and avoid remote assets in v0.1.
