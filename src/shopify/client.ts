import type { AuthProvider } from "../auth/provider.js";

export interface GraphQLEnvelope<T> {
  data?: T;
  errors?: Array<{message: string}>;
  extensions?: {cost?: {requestedQueryCost?: number; actualQueryCost?: number; throttleStatus?: {maximumAvailable?: number; currentlyAvailable?: number; restoreRate?: number}}};
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ShopifyClient {
  constructor(private store: string, private apiVersion: string, private auth: AuthProvider) {}

  async request<T>(query: string, variables: Record<string, unknown> = {}, attempt = 0): Promise<T> {
    const token = await this.auth.getAccessToken();
    const response = await fetch(`https://${this.store}/admin/api/${this.apiVersion}/graphql.json`, {
      method: "POST",
      headers: {"Content-Type": "application/json", "X-Shopify-Access-Token": token},
      body: JSON.stringify({query, variables})
    });
    const text = await response.text();
    let body: GraphQLEnvelope<T>;
    try { body = JSON.parse(text) as GraphQLEnvelope<T>; }
    catch { throw new Error(`Invalid Shopify response (${response.status}): ${text.slice(0, 500)}`); }

    const throttled = response.status === 429 || body.errors?.some(e => e.message.toLowerCase().includes("throttled"));
    const retryable = throttled || response.status >= 500;
    if (retryable && attempt < 5) {
      const throttle = body.extensions?.cost?.throttleStatus;
      const deficit = throttle?.currentlyAvailable !== undefined && body.extensions?.cost?.requestedQueryCost !== undefined
        ? Math.max(0, body.extensions.cost.requestedQueryCost - throttle.currentlyAvailable) : 0;
      const budgetWait = deficit && throttle?.restoreRate ? Math.ceil(deficit / throttle.restoreRate * 1000) : 0;
      const backoff = Math.min(8000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200);
      await sleep(Math.max(budgetWait, backoff));
      return this.request<T>(query, variables, attempt + 1);
    }
    if (!response.ok) throw new Error(`Shopify HTTP ${response.status}: ${text.slice(0, 1000)}`);
    if (body.errors?.length) throw new Error(`Shopify GraphQL: ${body.errors.map(e => e.message).join("; ")}`);
    if (!body.data) throw new Error("Shopify GraphQL returned no data");
    return body.data;
  }
}
