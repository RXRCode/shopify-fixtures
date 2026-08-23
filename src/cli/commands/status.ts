import { loadConfig } from "../config.js";
import { loadAllFixtures } from "../../fixtures/io.js";
import { ShopifyClient } from "../../shopify/client.js";
import { pingShopify } from "./doctor.js";

export interface FixtureCounts {
  products: number;
  collections: number;
  definitions: number;
  metaobjects: number;
}

export interface StatusResult {
  store: string;
  apiVersion: string;
  fixturesDir: string;
  counts: FixtureCounts;
  connected: boolean;
  connectionError?: string;
}

export function fixtureCounts(
  fixtures: Awaited<
    ReturnType<
      typeof loadAllFixtures
    >
  >,
): FixtureCounts {
  return {
    products:
      fixtures.products.products
        .length,
    collections:
      fixtures.collections
        .collections.length,
    definitions:
      fixtures.definitions
        .definitions.length,
    metaobjects:
      fixtures.metaobjects
        .metaobjects.length,
  };
}

export async function statusCommand(): Promise<StatusResult> {
  const config = loadConfig();

  const fixtures =
    await loadAllFixtures(
      config.fixturesDir,
    );

  const client =
    new ShopifyClient(
      config.store,
      config.apiVersion,
      config.auth,
    );

  let connected = false;
  let connectionError:
    | string
    | undefined;

  try {
    await pingShopify(client);
    connected = true;
  } catch (error) {
    connectionError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  return {
    store: config.store,
    apiVersion:
      config.apiVersion,
    fixturesDir:
      config.fixturesDir,
    counts:
      fixtureCounts(fixtures),
    connected,
    connectionError,
  };
}