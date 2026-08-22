# v0.1.0 — First public MVP

RXR Shopify Fixtures is an open-source CLI for keeping reproducible Shopify development data alongside your code.

### What ships

- deterministic product/collection fixture generation
- multiple product variants
- product metafield values
- metaobject definitions and entries
- validation before writes
- plan-first push workflow (`--apply` required)
- supported-resource pull
- short-lived Shopify client-credentials authentication
- GraphQL pagination and throttle-aware retries

### Safety

This release is intended for **development stores**. There are no delete mutations. Existing products and collections are skipped by handle. Review `rxr-fixtures push` before applying it.

### Try it

```bash
npm install
npm run build
npm link
rxr-fixtures init
rxr-fixtures generate --preset fashion --products 20 --seed 42
rxr-fixtures validate
rxr-fixtures push
```

Feedback, small presets, tests, and documentation contributions are welcome.
