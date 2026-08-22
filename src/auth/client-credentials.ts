import type { AuthProvider } from "./provider.js";
export class ClientCredentialsProvider implements AuthProvider {
  private cached?: {token: string; expiresAt: number};
  constructor(private store: string, private clientId: string, private clientSecret: string) {}
  async getAccessToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt - 60_000) return this.cached.token;
    const body = new URLSearchParams({grant_type: "client_credentials", client_id: this.clientId, client_secret: this.clientSecret});
    const response = await fetch(`https://${this.store}/admin/oauth/access_token`, {
      method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body
    });
    if (!response.ok) throw new Error(`Shopify auth failed (${response.status}): ${await response.text()}`);
    const data = await response.json() as {access_token: string; expires_in: number};
    this.cached = {token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000};
    return data.access_token;
  }
}
