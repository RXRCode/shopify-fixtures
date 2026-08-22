# Security Policy

## Supported versions

Only the latest released minor version is supported during the MVP phase.

## Reporting a vulnerability

Please do not open a public issue for a suspected credential leak, authentication flaw, or destructive-data vulnerability. Use GitHub's private vulnerability reporting feature when enabled for the repository.

Do not send real Shopify Admin API tokens, client secrets, customer exports, or production-store data in reports.

## Scope

This CLI is designed for development stores. v0.1 intentionally has no delete operations and requires `--apply` for mutations.
