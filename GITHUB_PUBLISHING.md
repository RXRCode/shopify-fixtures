# GitHub publishing kit

## Repository

**Name:** `shopify-fixtures`

**Display title:** RXR Shopify Fixtures

**Description:** Reproducible development data for Shopify — generate catalogs, version custom data in Git, and recreate dev-store fixtures.

**Website:** `https://rxrcode.dev`

**Suggested topics:**

`shopify`, `shopify-development`, `fixtures`, `test-data`, `metaobjects`, `metafields`, `graphql`, `typescript`, `cli`, `developer-tools`, `open-source`

## Pinned-repository blurb

Reproducible Shopify development data. Generate deterministic catalogs, keep metaobjects and fixture data in Git, and safely recreate supported dev-store state.

## First release

**Tag:** `v0.1.0`

**Title:** `v0.1.0 — First public MVP`

Use the prepared body in `GITHUB_RELEASE_v0.1.0.md`.

## Suggested labels

- `bug`
- `enhancement`
- `documentation`
- `good first issue`
- `help wanted`
- `preset`
- `shopify-api`
- `safety`

## Suggested branch/settings

- default branch: `main`
- require pull request before merge once contributors arrive
- require CI status checks
- enable private vulnerability reporting
- enable Dependabot security updates
- enable secret scanning where available
- squash merge by default

## Launch copy

**Short:**

RXR Shopify Fixtures is now open source: reproducible development data for Shopify. Generate deterministic catalogs, keep fixture data in Git, and safely recreate supported dev-store state.

**Developer-focused:**

I kept needing predictable Shopify dev-store data while building and testing apps, so I turned the workflow into an open-source CLI. RXR Shopify Fixtures generates deterministic catalogs, validates fixture files, plans writes before applying them, and supports metaobjects without persisting store-specific GIDs. v0.1 is intentionally small and non-destructive.
