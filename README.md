# RXR Shopify Fixtures

> Reproducible development data for Shopify.

Generate deterministic development catalogs, keep supported Shopify data in Git, detect drift, and safely recreate fixture state without copying store-specific GIDs.

**Status:** v0.2 pre-release / early open source. Use development stores only.

RXR Shopify Fixtures is an independent open-source project by [RXRCode](https://rxrcode.dev). It is not affiliated with or endorsed by Shopify.

## Why this exists

Shopify developers often need a repeatable dataset with known products, variants, metafields, collections, and metaobjects.

RXR Shopify Fixtures treats that development data as code:

```text
Generate → Validate → Diff → Plan → Apply
              ↑               ↓
              └──── Pull ─────┘
```

Fixture identity is logical rather than store-specific.

Products and collections use handles. Metaobject definitions use type. Metaobjects use `type + handle`.

Shopify GIDs are resolved only at runtime.

## Quick start

Run directly from npm:

```bash
npx @rxrcode/shopify-fixtures@next init
```

Generate deterministic fixture data:

```bash
npx @rxrcode/shopify-fixtures@next generate \
  --preset minimal \
  --products 5 \
  --collections 2 \
  --seed 42
```

Validate it:

```bash
npx @rxrcode/shopify-fixtures@next validate
```

This creates:

```text
fixtures/
├── products.json
├── collections.json
├── metaobject-definitions.json
└── metaobjects.json
```

## Connect a Shopify development store

Create a `.env` file:

```env
SHOPIFY_STORE=my-dev-store.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
```

Client credentials are the recommended authentication path for supported development-store workflows.

An explicit Admin API token can also be used:

```env
SHOPIFY_ACCESS_TOKEN=...
```

You can override the API version:

```env
SHOPIFY_API_VERSION=2026-07
```

And the fixture directory:

```env
SHOPIFY_FIXTURES_DIR=./fixtures
```

Never commit Shopify credentials to Git.

## Doctor

Check the local environment and Shopify connectivity:

```bash
npx @rxrcode/shopify-fixtures@next doctor
```

Doctor checks:

```text
Node.js support
fixture directory
fixture validation
Shopify store configuration
authentication configuration
Shopify API reachability
```

Doctor never mutates Shopify.

## Status

Show the configured environment:

```bash
npx @rxrcode/shopify-fixtures@next status
```

Status includes:

```text
store
Admin API version
fixture directory
product count
collection count
metaobject definition count
metaobject count
Shopify connection state
```

## Diff local fixtures against Shopify

Compare the desired local fixture state with Shopify:

```bash
npx @rxrcode/shopify-fixtures@next diff
```

The planner uses three actions:

```text
CREATE
CHANGE
SKIP
```

Example:

```text
Shopify Fixture Diff

Products
  SKIP    classic-mug-1
  CHANGE  classic-tote-2
    title: "Classic Tote" -> "Classic Tote Bag"

Metaobjects
  SKIP    rxr_fixture_note/seed-42

Summary
  0 create
  1 change
  2 unchanged
  0 delete
```

The arrow represents:

```text
current Shopify value -> desired local fixture value
```

`diff` never mutates Shopify.

## JSON diff output

For scripts and tooling:

```bash
npx @rxrcode/shopify-fixtures@next diff --json
```

Example shape:

```json
{
  "store": "example.myshopify.com",
  "apiVersion": "2026-07",
  "summary": {
    "create": 0,
    "change": 0,
    "skip": 10,
    "delete": 0,
    "total": 10
  },
  "items": []
}
```

## CI drift detection

Use:

```bash
npx @rxrcode/shopify-fixtures@next diff --check
```

Exit behavior:

```text
0  fixtures match Shopify
1  CREATE or CHANGE drift exists
```

This makes fixture drift usable as a CI check without applying anything.

## Preview fixture writes

`push` is plan-only by default:

```bash
npx @rxrcode/shopify-fixtures@next push
```

Example:

```text
Plan
SKIP    product                classic-mug-1
CREATE  product                classic-tote-2
SKIP    metaobject-definition  rxr_fixture_note
SKIP    metaobject             rxr_fixture_note/seed-42

No delete operations are implemented.
Plan only. Run again with --apply to write.
```

No mutation occurs during the default push command.

## Apply supported writes

After reviewing the plan:

```bash
npx @rxrcode/shopify-fixtures@next push --apply
```

v0.2 can apply:

```text
new products
new collections
new metaobject definitions
new metaobjects
changed metaobjects
product metafields for newly created products
```

v0.2 detects but does not automatically update existing:

```text
products
collections
metaobject definitions
```

If one of those unsupported `CHANGE` operations exists, apply is refused before any mutations occur.

No delete operations are implemented.

## Pull Shopify data

Pull all supported resources:

```bash
npx @rxrcode/shopify-fixtures@next pull
```

Equivalent to:

```bash
npx @rxrcode/shopify-fixtures@next pull --resource all
```

Selective pull is also supported:

```bash
npx @rxrcode/shopify-fixtures@next pull --resource products
npx @rxrcode/shopify-fixtures@next pull --resource collections
npx @rxrcode/shopify-fixtures@next pull --resource metaobjects
```

Selective pull only rewrites the relevant fixture files.

Pulling `metaobjects` also pulls supported metaobject definitions.

## Supported fixture resources

v0.2 supports:

```text
products
product options
product variants
product metafield values
collections
metaobject definitions
metaobject entries
```

The CLI also provides deterministic generation, JSON fixture validation, local-vs-Shopify diff, plan-before-apply writes, selective pull, CI drift checks, diagnostics, connection status, client-credentials authentication, access-token authentication, GraphQL retry/throttle handling, and cursor pagination.

## Not supported

The project deliberately does not attempt to clone an entire Shopify store.

Not currently supported:

```text
customers
orders
media uploads
inventory quantities
markets
themes
destructive synchronization
full-store cloning
web UI
```

## Fixture structure

```text
fixtures/
├── products.json
├── collections.json
├── metaobject-definitions.json
└── metaobjects.json
```

Example product:

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
          "options": {"Size": "40"}
        }
      ]
    }
  ]
}
```

SKU is fixture data rather than globally unique fixture identity. Shopify variants with no SKU are represented as `"sku": ""`.

## Deterministic generation

```bash
npx @rxrcode/shopify-fixtures@next generate \
  --preset fashion \
  --products 20 \
  --collections 4 \
  --seed 42
```

The same generator version, preset, arguments, and seed produce the same logical fixture data.

## Presets

Current presets:

```text
minimal
fashion
electronics
```

## Safety

RXR Shopify Fixtures is intentionally conservative. `push` only plans unless `--apply` is supplied. `diff`, `doctor`, and `status` are read-only. There are no delete mutations. Changed existing products, collections, and metaobject definitions are detected but are not automatically updated in v0.2.

See [`docs/safety.md`](docs/safety.md).

## Shopify access scopes

Exact access depends on the resources being used. Typical development-store workflows may require scopes such as:

```text
read_products
write_products
read_metaobjects
write_metaobjects
read_metaobject_definitions
write_metaobject_definitions
```

Grant only the permissions required by your workflow.

## Global install

```bash
npm install -g @rxrcode/shopify-fixtures@next
rxr-fixtures --help
```

## Development

```bash
git clone https://github.com/RXRCode/shopify-fixtures.git
cd shopify-fixtures
npm install
npm run check
```

Run the development CLI:

```bash
npm run dev -- --help
```

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Roadmap

Near-term work after v0.2 includes supported updates for existing products and collections, metafield definition export/import, fixture reference resolution, more community presets, and improved setup guidance.

## Package

npm package: `@rxrcode/shopify-fixtures`

Current pre-release channel: `next`

```bash
npx @rxrcode/shopify-fixtures@next --help
```

## License

MIT © RXRCode.
