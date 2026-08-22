# RXR Shopify Fixtures

> Reproducible development data for Shopify.

Generate realistic catalogs, keep custom data in Git, and recreate supported Shopify development-store data without copying store-specific GIDs.

**Status:** v0.1.0 MVP / early open source. Use development stores only.

RXR Shopify Fixtures is an independent open-source project by [RXRCode](https://rxrcode.dev). It is not affiliated with or endorsed by Shopify.

## Why this exists

Shopify can generate test data for development stores, but app developers often need **their own repeatable dataset**: a catalog with known handles and SKUs, specific metafield definitions, and metaobject entries that can be reviewed and committed with application code.

The project follows a simple model:

```text
Generate → Validate → Plan → Apply
                    ↕
                   Pull
```

Fixture identity is logical rather than store-specific: products use handles, metaobjects use `type + handle`, and Shopify GIDs are resolved only at runtime.

## MVP

Supported in v0.1:

- deterministic product generation
- custom collections
- product options and multiple variants
- product metafield values
- metaobject definitions
- metaobject entries
- JSON fixture validation
- safe push planning; mutation requires `--apply`
- pull of products, collections, metaobject definitions, and metaobject entries
- Shopify client-credentials authentication with access-token override
- cost-aware GraphQL retries and cursor pagination

Deliberately not supported yet: customers, orders, media uploads, inventory quantities, markets, themes, destructive synchronization, full-store cloning, or a web UI.

## Install locally

```bash
npm install
npm run build
npm link
rxr-fixtures --help
```

Or while developing:

```bash
npm run dev -- --help
```

## Configure

```bash
cp .env.example .env
```

Recommended Dev Dashboard auth for a development store in your own Shopify organization:

```env
SHOPIFY_STORE=my-dev-store.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
```

The CLI exchanges the client credentials for Shopify's short-lived Admin API access token. Shopify documents this grant for apps acting on stores in your own organization. `SHOPIFY_ACCESS_TOKEN` is also supported as an explicit override for CI or compatible setups. Never commit credentials.

## Quick start

```bash
rxr-fixtures init
rxr-fixtures generate --preset fashion --products 20 --collections 4 --seed 42
rxr-fixtures validate
rxr-fixtures push
rxr-fixtures push --apply
```

`push` is a plan by default. No mutation occurs until `--apply` is provided. The MVP never deletes Shopify resources.

Pull supported data:

```bash
rxr-fixtures pull
```

## Fixture structure

```text
fixtures/
├── products.json
├── collections.json
├── metaobject-definitions.json
└── metaobjects.json
```

Example product fixture:

```json
{
  "version": 1,
  "products": [
    {
      "key": "trail-running-shoe",
      "handle": "trail-running-shoe",
      "title": "Trail Running Shoe",
      "vendor": "RXR Fixtures",
      "productType": "Footwear",
      "status": "ACTIVE",
      "options": [{ "name": "Size", "values": ["40", "41", "42"] }],
      "variants": [
        { "sku": "TRAIL-40", "price": "129.00", "options": { "Size": "40" } }
      ]
    }
  ]
}
```

## Deterministic generation

```bash
rxr-fixtures generate --preset fashion --seed 42
```

The same version of the generator + preset + seed produces the same logical fixture data. This makes the fixtures useful in tests and reviewable in Git.

## Safety model

- intended for Shopify development stores
- `push` only plans unless `--apply` is supplied
- v0.1 contains no delete mutations
- fixtures are validated before mutation
- existing products/collections are skipped by handle in the MVP instead of being overwritten
- metaobjects use Shopify's `metaobjectUpsert`; because Shopify treats `values` as replacement data, the CLI prints an explicit warning before applying metaobjects

See [`docs/safety.md`](docs/safety.md).

## Required scopes

Typical v0.1 usage needs scopes for the resources you enable, including `read_products`, `write_products`, `read_metaobjects`, `write_metaobjects`, `read_metaobject_definitions`, and `write_metaobject_definitions`. Grant only what you need.

## Development

```bash
npm run check
```

The project has unit and API-contract tests. Live-store testing should be performed manually against a dedicated development store; secrets are intentionally not used in pull-request CI.

## Contributing

Small, focused contributions are welcome. Good first contributions include presets, validation rules, fixture examples, API-contract tests, and documentation. Read [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Roadmap

Near-term:

- safer update planning for existing products
- metafield definition export/import
- local-vs-store diff
- reference resolution between fixtures
- more community presets

Longer-term candidates will be driven by real developer usage rather than a goal of cloning an entire store.

## License

MIT © RXRCode.
