# Shopify setup

## Recommended development-store flow

The client-credentials grant is intended for server-side apps acting on stores in your own Shopify organization.

1. Create a Dev Dashboard app.
2. Add only the Admin API scopes needed by the fixtures you intend to use.
3. Install the app on your development store.
4. Copy the Client ID and Client secret from the Dev Dashboard.
5. Put credentials in environment variables or an ignored `.env` file.

```env
SHOPIFY_STORE=my-dev-store.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
SHOPIFY_API_VERSION=2026-07
```

The CLI exchanges those credentials at `/admin/oauth/access_token`, caches the returned token in memory, and refreshes it before expiry. It never writes the token to fixture files.

For apps installed on stores outside your organization, use Shopify's merchant-app authentication approach rather than treating this CLI's client-credentials adapter as a replacement for OAuth.
