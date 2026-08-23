# Safety model

RXR Shopify Fixtures is intentionally conservative and is designed primarily for Shopify development stores.

## Plan before mutation

`rxr-fixtures push` computes and prints a plan only.

```bash
rxr-fixtures push
```

No Shopify mutation occurs unless `--apply` is explicitly supplied:

```bash
rxr-fixtures push --apply
```

## Planner actions

The v0.2 planner reports:

```text
CREATE
CHANGE
SKIP
```

`CREATE` means the fixture resource does not currently exist in Shopify.

`CHANGE` means Shopify contains the logical resource, but its managed values differ from the local fixture.

`SKIP` means the managed fixture state already matches Shopify.

## Existing-resource changes

v0.2 detects changes to existing products, collections, metaobject definitions, and metaobjects.

Changed metaobjects can be applied through Shopify's metaobject upsert behavior.

Automatic updates to existing products, collections, and metaobject definitions are not implemented yet.

If `push --apply` detects one of those unsupported changes, it refuses the apply operation before making any mutations.

## No destructive synchronization

There are no delete mutations.

A Shopify resource that exists remotely but is absent from the fixture set is not automatically deleted.

RXR Shopify Fixtures is not intended to clone or destructively synchronize an entire store.

## Read-only commands

The following commands never mutate Shopify:

```bash
rxr-fixtures diff
rxr-fixtures diff --json
rxr-fixtures diff --check
rxr-fixtures doctor
rxr-fixtures status
```

## Pull

`pull` reads Shopify state and writes local fixture files. It does not mutate Shopify.

Selective pull can limit which fixture files are replaced:

```bash
rxr-fixtures pull --resource products
rxr-fixtures pull --resource collections
rxr-fixtures pull --resource metaobjects
rxr-fixtures pull --resource all
```

Pulling `metaobjects` also pulls their supported metaobject definitions.

## Fixture validation

Fixtures are validated before planning or applying writes.

Logical fixture identity uses portable Shopify concepts such as product handles and metaobject `type + handle`.

Shopify GIDs are never treated as portable fixture identity.

Variant SKUs are fixture data, not globally unique identity. Blank Shopify SKUs are preserved as blank values.

## Credentials

Credentials are environment-only. `.env` files should remain ignored by Git and must never be committed.

Supported authentication methods are `SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET` or an explicit `SHOPIFY_ACCESS_TOKEN` override.
