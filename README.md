# RXR Shopify Fixtures

> Reproducible development data for Shopify.

Generate realistic catalogs, keep custom data in Git, and recreate supported Shopify development-store data without copying store-specific GIDs.

**Status:** v0.1.x pre-release / early open source. Use development stores only.

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

## Quick start

Run RXR Shopify Fixtures directly from npm:

```bash
npx @rxrcode/shopify-fixtures@next init
```

Generate deterministic development data:

```bash
npx @rxrcode/shopify-fixtures@next generate \
  --preset minimal \
  --products 5 \
  --collections 2 \
  --seed 42
```

Validate the generated fixtures:

```bash
npx @rxrcode/shopify-fixtures@next validate
```

This creates a local `fixtures/` directory containing Git-friendly Shopify development data.

## Connect a Shopify development store

Create a `.env` file in the directory where you run Shopify Fixtures:

```env
SHOPIFY_STORE=my-dev-store.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
```

The recommended authentication method for development stores in your own Shopify organization uses Shopify Dev Dashboard client credentials.

The CLI exchanges those credentials for a short-lived Shopify Admin API access token.

`SHOPIFY_ACCESS_TOKEN` is also supported as an explicit override for compatible setups and CI.

**Never commit Shopify credentials to Git.**

Check the configured store:

```bash
npx @rxrcode/shopify-fixtures@next status
```

## Preview and apply fixtures

Preview what Shopify Fixtures intends to write:

```bash
npx @rxrcode/shopify-fixtures@next push
```

Example plan:

```text
Plan
CREATE product                classic-mug-1
CREATE product                classic-tote-2
CREATE collection             minimal-collection-1
CREATE metaobject-definition  rxr_fixture_note
UPSERT metaobject             rxr_fixture_note/seed-42

No delete operations are implemented in v0.1.
Plan only. Run again with --apply to write.
```

If the plan looks correct:

```bash
npx @rxrcode/shopify-fixtures@next push --apply
```

`push` is plan-only by default. No mutation occurs until `--apply` is explicitly provided.

The v0.1 series does not implement delete operations.

## Pull supported Shopify data

```bash
npx @rxrcode/shopify-fixtures@next pull
```

Supported resources can be written back to the local fixture files so changes are reviewable with Git.

## MVP

Supported in v0.1:

* deterministic product generation
* custom collections
* product options and multiple variants
* product metafield values
* metaobject definitions
* metaobject entries
* JSON fixture validation
* safe push planning
* explicit `--apply` mutations
* pull of products
* pull of collections
* pull of metaobject definitions
* pull of metaobject entries
* Shopify client-credentials authentication
* access-token override
* cost-aware GraphQL retries
* cursor pagination

Deliberately not supported yet:

* customers
* orders
* media uploads
* inventory quantities
* markets
* themes
* destructive synchronization
* full-store cloning
* web UI

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
      "options": [
        {
          "name": "Size",
          "values": ["40", "41", "42"]
        }
      ],
      "variants": [
        {
          "sku": "TRAIL-40",
          "price": "129.00",
          "options": {
            "Size": "40"
          }
        }
      ]
    }
  ]
}
```

## Deterministic generation

```bash
npx @rxrcode/shopify-fixtures@next generate \
  --preset fashion \
  --products 20 \
  --collections 4 \
  --seed 42
```

The same generator version, preset, arguments, and seed produce the same logical fixture data.

That makes fixture datasets useful for:

* automated testing
* app development
* demo stores
* reproducible bug reports
* team development environments
* Git review

## Presets

Current generator presets:

```text
minimal
fashion
electronics
```

Example:

```bash
npx @rxrcode/shopify-fixtures@next generate \
  --preset electronics \
  --products 10 \
  --collections 3 \
  --seed 99
```

## Safety model

RXR Shopify Fixtures is intentionally conservative.

* intended for Shopify development stores
* `push` only plans unless `--apply` is supplied
* v0.1 contains no delete mutations
* fixtures are validated before mutation
* existing products are detected by handle
* existing collections are detected by handle
* existing metaobject definitions are skipped
* metaobjects use Shopify's `metaobjectUpsert`
* Shopify GIDs are never treated as portable fixture identity

Because Shopify treats metaobject upsert values as replacement data, the CLI prints an explicit warning before applying metaobjects.

See [`docs/safety.md`](docs/safety.md).

## Shopify access scopes

The exact scopes depend on which fixture resources you use.

Typical v0.1 development-store usage includes product and metaobject write access, such as:

```text
write_products
write_metaobjects
write_metaobject_definitions
```

Grant only the permissions required for your development workflow.

## Install globally

Using `npx` is recommended for the pre-release, but you can also install the CLI globally:

```bash
npm install -g @rxrcode/shopify-fixtures@next
```

Then run:

```bash
rxr-fixtures --help
```

## Development

To contribute to the project itself:

```bash
git clone https://github.com/RXRCode/shopify-fixtures.git
cd shopify-fixtures
npm install
npm run check
```

During development:

```bash
npm run dev -- --help
```

The project includes:

* ESLint
* TypeScript type checking
* Vitest unit tests
* API contract tests
* build verification
* GitHub Actions CI

Live-store tests should be performed manually against a dedicated Shopify development store. Secrets are intentionally not used in pull-request CI.

## Contributing

Small, focused contributions are welcome.

Good first contributions include:

* new fixture presets
* validation rules
* example fixture datasets
* API contract tests
* documentation
* error-message improvements

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Roadmap

Near-term:

* safer update planning for existing products
* metafield definition export/import
* local-vs-store diff
* reference resolution between fixtures
* more community presets
* improved connection/setup guidance

Longer-term direction will be driven by real developer usage rather than a goal of cloning an entire Shopify store.

## Package

npm:

```text
@rxrcode/shopify-fixtures
```

Current pre-release channel:

```text
next
```

Run the latest pre-release:

```bash
npx @rxrcode/shopify-fixtures@next --help
```

## License

MIT © RXRCode.
