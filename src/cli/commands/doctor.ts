import fs from "node:fs/promises";
import {
  fixtureDirWithoutAuth,
  loadConfig,
} from "../config.js";
import { validateFixtures } from "../../fixtures/validate.js";
import { ShopifyClient } from "../../shopify/client.js";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  ready: boolean;
}

export function nodeSupported(
  version = process.versions.node,
): boolean {
  const major = Number(
    version.split(".")[0],
  );

  return (
    Number.isFinite(major) &&
    major >= 20
  );
}

export function authConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    env.SHOPIFY_ACCESS_TOKEN
  ) {
    return true;
  }

  return Boolean(
    env.SHOPIFY_CLIENT_ID &&
      env.SHOPIFY_CLIENT_SECRET,
  );
}

export async function pingShopify(
  client: ShopifyClient,
): Promise<void> {
  await client.request<{
    shop: {
      name: string;
    };
  }>(
    `
      query RXRFixturesDoctor {
        shop {
          name
        }
      }
    `,
  );
}

export async function doctorCommand(): Promise<DoctorResult> {
  const checks: DoctorCheck[] =
    [];

  checks.push({
    name: "Node.js supported",
    ok: nodeSupported(),
    detail: process.versions.node,
  });

  const fixtureDir =
    fixtureDirWithoutAuth();

  let fixtureDirectoryExists =
    false;

  try {
    await fs.access(fixtureDir);

    fixtureDirectoryExists = true;

    checks.push({
      name: "Fixture directory found",
      ok: true,
      detail: fixtureDir,
    });
  } catch {
    checks.push({
      name: "Fixture directory found",
      ok: false,
      detail: fixtureDir,
    });
  }

  if (fixtureDirectoryExists) {
    try {
      const validation =
        await validateFixtures(
          fixtureDir,
        );

      checks.push({
        name: "Fixture files valid",
        ok: validation.ok,
        detail: validation.ok
          ? undefined
          : validation.errors.join(
              "; ",
            ),
      });
    } catch (error) {
      checks.push({
        name: "Fixture files valid",
        ok: false,
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  } else {
    checks.push({
      name: "Fixture files valid",
      ok: false,
      detail:
        "Fixture directory is missing",
    });
  }

  const storeConfigured =
    Boolean(
      process.env.SHOPIFY_STORE?.trim(),
    );

  checks.push({
    name: "Shopify store configured",
    ok: storeConfigured,
    detail: storeConfigured
      ? process.env.SHOPIFY_STORE
      : "Set SHOPIFY_STORE",
  });

  const hasAuth =
    authConfigured();

  checks.push({
    name: "Authentication configured",
    ok: hasAuth,
    detail: hasAuth
      ? undefined
      : "Set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, or SHOPIFY_ACCESS_TOKEN",
  });

  if (
    storeConfigured &&
    hasAuth
  ) {
    try {
      const config =
        loadConfig();

      const client =
        new ShopifyClient(
          config.store,
          config.apiVersion,
          config.auth,
        );

      await pingShopify(client);

      checks.push({
        name: "Shopify API reachable",
        ok: true,
      });
    } catch (error) {
      checks.push({
        name: "Shopify API reachable",
        ok: false,
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  } else {
    checks.push({
      name: "Shopify API reachable",
      ok: false,
      detail:
        "Skipped because Shopify configuration is incomplete",
    });
  }

  return {
    checks,
    ready: checks.every(
      (check) => check.ok,
    ),
  };
}