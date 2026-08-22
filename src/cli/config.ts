import "dotenv/config";
import path from "node:path";
import type { AuthProvider } from "../auth/provider.js";
import { StaticAccessTokenProvider } from "../auth/access-token.js";
import { ClientCredentialsProvider } from "../auth/client-credentials.js";

export interface AppConfig {store: string; apiVersion: string; fixturesDir: string; auth: AuthProvider;}
export function loadConfig(): AppConfig {
  let store = (process.env.SHOPIFY_STORE ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!store) throw new Error("SHOPIFY_STORE is required");
  if (!store.includes(".")) store = `${store}.myshopify.com`;
  let auth: AuthProvider;
  if (process.env.SHOPIFY_ACCESS_TOKEN) auth = new StaticAccessTokenProvider(process.env.SHOPIFY_ACCESS_TOKEN);
  else if (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET) auth = new ClientCredentialsProvider(store, process.env.SHOPIFY_CLIENT_ID, process.env.SHOPIFY_CLIENT_SECRET);
  else throw new Error("Configure SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, or SHOPIFY_ACCESS_TOKEN");
  return {store, apiVersion: process.env.SHOPIFY_API_VERSION ?? "2026-07", fixturesDir: path.resolve(process.env.SHOPIFY_FIXTURES_DIR ?? "./fixtures"), auth};
}
export function fixtureDirWithoutAuth(): string { return path.resolve(process.env.SHOPIFY_FIXTURES_DIR ?? "./fixtures"); }
