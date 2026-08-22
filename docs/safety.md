# Safety model

The MVP is designed to make accidental writes difficult.

- Use a Shopify development store.
- `rxr-fixtures push` computes and prints a plan only.
- `rxr-fixtures push --apply` is required for writes.
- There are no delete mutations in v0.1.
- Existing products and collections are skipped by handle.
- Metaobjects use upsert semantics and therefore receive an explicit replacement warning.
- Credentials are environment-only and `.env` files are ignored.
- Validation runs before the apply path.

A future destructive-sync feature, if ever added, should require a separate command and explicit acknowledgement rather than extending `push`.
