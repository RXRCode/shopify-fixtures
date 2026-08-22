# Architecture

The project separates four concerns:

1. **Fixture domain** — schemas, deterministic generators, validation.
2. **Planning** — logical identities and create/skip decisions.
3. **Shopify adapter** — authentication, GraphQL, pagination, rate-limit behavior.
4. **CLI** — user interaction and mutation gating.

Store-specific GIDs are not persisted as fixture identity. Products use handles; collections use handles; metaobjects use type + handle.

The MVP intentionally prefers safe partial synchronization over pretending to provide a complete store-cloning abstraction.
