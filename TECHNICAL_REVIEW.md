# Technical review — v0.1.0

Review date: 2026-08-22

## Shopify API assumptions verified

The MVP is designed around Shopify Admin GraphQL API `2026-07` and current Shopify documentation:

- `productCreate` requires `write_products` and creates only the initial product variant; additional variants use `productVariantsBulkCreate`.
- `ProductVariantsBulkCreateStrategy.REMOVE_STANDALONE_VARIANT` is available for replacing the initial standalone variant while creating fixture variants.
- `productByIdentifier` is used for handle-based product identity because `productByHandle` is deprecated.
- metaobject definitions must exist before entries are created.
- `metaobjectUpsert` identifies entries by type + handle and replaces the supplied values object, so the CLI warns before apply.
- the client-credentials grant is intended for apps acting on stores in the developer's own Shopify organization and returns short-lived access tokens.
- Admin GraphQL rate limiting is calculated by query cost; the client retries throttled/5xx responses with capped backoff.
- Shopify GraphQL input arrays are capped at 250 items; v0.1 validation rejects product fixtures with more than 250 variants.

## Safety review

- no delete mutation exists in v0.1
- `push` is plan-only by default
- `--apply` is required for writes
- products and collections already present by handle are skipped
- metaobject definitions already present by type are skipped
- fixture files do not persist Shopify GIDs as logical identity
- secrets are environment-only and `.env*` is ignored except `.env.example`
- pull refuses to silently truncate product variants/metafields beyond the MVP's nested-query limits

## Static verification performed

- all repository JSON files parsed successfully
- TypeScript received an offline syntax/type pass using the system compiler
- two internal typing issues found by that pass were corrected
- final remaining compiler diagnostics were limited to unavailable third-party/Node type declarations because dependencies could not be installed in this sandbox
- repository checked for obvious credential placeholders only; no real credentials are included

## Verification not executable in this environment

`npm install` could not run because the sandbox could not resolve `registry.npmjs.org` (`EAI_AGAIN`). As a result, ESLint, Vitest, and a full dependency-aware TypeScript build were not executed here.

Before tagging the first GitHub release, run locally or in GitHub Actions:

```bash
npm install
npm run check
```

Then perform one live smoke test against a dedicated Shopify development store:

```bash
cp .env.example .env
rxr-fixtures init
rxr-fixtures generate --preset fashion --products 3 --collections 1 --seed 42
rxr-fixtures validate
rxr-fixtures push
rxr-fixtures push --apply
rxr-fixtures pull
```

Do not use a production merchant store for the v0.1 smoke test.
