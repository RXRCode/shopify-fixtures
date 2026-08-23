# Changelog

All notable changes to RXR Shopify Fixtures will be documented here.

## [0.2.0] - 2026-08-24

### Added

- local-vs-Shopify `diff` command
- human-readable `CREATE`, `CHANGE`, and `SKIP` planning
- `diff --json` for machine-readable output
- `diff --check` for CI drift detection
- `doctor` command for environment and Shopify diagnostics
- improved `status` output with fixture counts and connection state
- selective pull with `--resource products`, `collections`, `metaobjects`, or `all`
- targeted Shopify state readers for products, collections, metaobject definitions, and metaobjects
- fixture resource writers that allow selective pull without overwriting unrelated files
- observability and diff unit tests

### Changed

- unchanged metaobjects now plan as `SKIP` instead of always being upserted
- changed metaobjects plan as `CHANGE`
- existing product, collection, and metaobject-definition drift is detected before apply
- unsupported existing-resource changes cause apply to abort before making mutations
- blank Shopify variant SKUs are preserved as blank fixture values
- SKU is no longer treated as globally unique fixture identity
- CLI version is derived from `package.json`
- push output includes field-level changes when drift exists

### Safety

- no delete operations were added
- `push` remains plan-only unless `--apply` is explicitly supplied
- `diff`, `doctor`, and `status` never mutate Shopify
- unsupported product, collection, and metaobject-definition updates are refused before mutation
- Shopify GIDs remain runtime-only identifiers

## [0.1.0] - 2026-08-22

### Added

- deterministic product and collection fixture generation
- metaobject definition and entry fixtures
- fixture validation
- safe push planning with explicit `--apply`
- Shopify client-credentials and access-token authentication providers
- GraphQL pagination and retry/throttle handling
- supported-resource pull
- tests and GitHub Actions CI
