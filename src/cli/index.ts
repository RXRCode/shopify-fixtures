#!/usr/bin/env node

import { createRequire } from "node:module";
import {
  Command,
} from "commander";
import pc from "picocolors";

import {
  fixtureDirWithoutAuth,
  loadConfig,
} from "./config.js";

import {
  initializeFixtureDir,
} from "../fixtures/io.js";

import {
  validateFixtures,
} from "../fixtures/validate.js";

import {
  generateCommand,
} from "./commands/generate.js";

import {
  ShopifyClient,
} from "../shopify/client.js";

import {
  applyPlan,
  buildPlan,
} from "./commands/push.js";

import {
  parsePullResource,
  pullCommand,
} from "./commands/pull.js";

import {
  diffCommand,
  diffShouldFailCheck,
  formatDiffHuman,
  serializeDiff,
} from "./commands/diff.js";

import {
  doctorCommand,
} from "./commands/doctor.js";

import {
  statusCommand,
} from "./commands/status.js";

const loadModule =
  createRequire(import.meta.url);

const packageJson =
  loadModule(
    "../../package.json",
  ) as {
    version: string;
  };

const program =
  new Command()
    .name("rxr-fixtures")
    .description(
      "Reproducible development data for Shopify.",
    )
    .version(
      packageJson.version,
    );

program
  .command("init")
  .description(
    "Create empty v1 fixture files",
  )
  .action(async () => {
    const dir =
      fixtureDirWithoutAuth();

    await initializeFixtureDir(
      dir,
    );

    console.log(
      pc.green(
        `Initialized ${dir}`,
      ),
    );
  });

program
  .command("generate")
  .description(
    "Generate deterministic fixtures",
  )
  .option(
    "--preset <name>",
    "minimal | fashion | electronics",
    "minimal",
  )
  .option(
    "--products <n>",
    "number of products",
    "10",
  )
  .option(
    "--collections <n>",
    "number of collections",
    "3",
  )
  .option(
    "--seed <n>",
    "deterministic seed",
    "1",
  )
  .action(async (options) => {
    if (
      ![
        "minimal",
        "fashion",
        "electronics",
      ].includes(
        options.preset,
      )
    ) {
      throw new Error(
        "Unknown preset",
      );
    }

    const dir =
      fixtureDirWithoutAuth();

    const data =
      await generateCommand(
        dir,
        {
          preset:
            options.preset,
          products: Number(
            options.products,
          ),
          collections: Number(
            options.collections,
          ),
          seed: Number(
            options.seed,
          ),
        },
      );

    console.log(
      pc.green(
        `Generated ${data.products.length} products and ${data.collections.length} collections in ${dir}`,
      ),
    );
  });

program
  .command("validate")
  .description(
    "Validate local fixtures",
  )
  .action(async () => {
    const result =
      await validateFixtures(
        fixtureDirWithoutAuth(),
      );

    if (!result.ok) {
      result.errors.forEach(
        (error) =>
          console.error(
            pc.red(
              `✗ ${error}`,
            ),
          ),
      );

      process.exitCode = 1;
      return;
    }

    console.log(
      pc.green(
        "✓ Fixtures are valid",
      ),
    );
  });

program
  .command("status")
  .description(
    "Show fixture and Shopify connection status",
  )
  .action(async () => {
    const status =
      await statusCommand();

    console.log(
      pc.bold(
        "RXR Shopify Fixtures",
      ),
    );

    console.log(
      `\nStore\n  ${status.store}`,
    );

    console.log(
      `\nAPI\n  ${status.apiVersion}`,
    );

    console.log(
      `\nFixtures\n  ${status.fixturesDir}`,
    );

    console.log(
      `\nProducts\n  ${status.counts.products}`,
    );

    console.log(
      `\nCollections\n  ${status.counts.collections}`,
    );

    console.log(
      `\nMetaobject definitions\n  ${status.counts.definitions}`,
    );

    console.log(
      `\nMetaobjects\n  ${status.counts.metaobjects}`,
    );

    if (status.connected) {
      console.log(
        `\nConnection\n  ${pc.green("✓ Shopify reachable")}`,
      );
    } else {
      console.log(
        `\nConnection\n  ${pc.red("✗ Shopify unreachable")}`,
      );

      if (
        status.connectionError
      ) {
        console.log(
          `  ${status.connectionError}`,
        );
      }
    }
  });

program
  .command("doctor")
  .description(
    "Diagnose local fixtures and Shopify connectivity",
  )
  .action(async () => {
    const result =
      await doctorCommand();

    console.log(
      pc.bold(
        "RXR Shopify Fixtures Doctor",
      ),
    );

    console.log("");

    for (const check of
      result.checks) {
      const icon = check.ok
        ? pc.green("✓")
        : pc.red("✗");

      console.log(
        `${icon} ${check.name}`,
      );

      if (check.detail) {
        console.log(
          `  ${check.detail}`,
        );
      }
    }

    console.log("");

    if (result.ready) {
      console.log(
        pc.green("Ready."),
      );
    } else {
      console.log(
        pc.yellow(
          "Some checks need attention.",
        ),
      );

      process.exitCode = 1;
    }
  });

program
  .command("diff")
  .description(
    "Compare local fixtures with Shopify without mutating",
  )
  .option(
    "--json",
    "output machine-readable JSON",
    false,
  )
  .option(
    "--check",
    "exit non-zero when drift exists",
    false,
  )
  .action(
    async (options) => {
      const config =
        loadConfig();

      const client =
        new ShopifyClient(
          config.store,
          config.apiVersion,
          config.auth,
        );

      const result =
        await diffCommand(
          client,
          config.fixturesDir,
        );

      if (options.json) {
        console.log(
          JSON.stringify(
            serializeDiff(
              config.store,
              config.apiVersion,
              result,
            ),
            null,
            2,
          ),
        );
      } else {
        console.log(
          formatDiffHuman(
            result,
          ),
        );
      }

      if (
        options.check &&
        diffShouldFailCheck(
          result,
        )
      ) {
        process.exitCode = 1;
      }
    },
  );

program
  .command("push")
  .description(
    "Plan fixture writes; add --apply to mutate Shopify",
  )
  .option(
    "--apply",
    "execute supported planned writes",
    false,
  )
  .action(async (options) => {
    const config =
      loadConfig();

    const client =
      new ShopifyClient(
        config.store,
        config.apiVersion,
        config.auth,
      );

    const plan =
      await buildPlan(
        client,
        config.fixturesDir,
      );

    console.log(
      pc.bold("Plan"),
    );

    for (const item of
      plan.items) {
      console.log(
        `${item.action.padEnd(7)} ${item.resource.padEnd(22)} ${item.key}`,
      );

      for (const change of
        item.changes ?? []) {
        console.log(
          `        ${change.field}: ${JSON.stringify(change.remote)} -> ${JSON.stringify(change.local)}`,
        );
      }
    }

    console.log(
      "\nNo delete operations are implemented.",
    );

    if (!options.apply) {
      console.log(
        pc.yellow(
          "Plan only. Run again with --apply to write.",
        ),
      );

      return;
    }

    if (
      plan.items.some(
        (item) =>
          item.resource ===
            "metaobject" &&
          (item.action ===
            "CREATE" ||
            item.action ===
              "CHANGE"),
      )
    ) {
      console.log(
        pc.yellow(
          "Warning: metaobjectUpsert replaces the supplied values object for each entry.",
        ),
      );
    }

    await applyPlan(
      client,
      plan,
    );

    console.log(
      pc.green(
        "✓ Apply complete",
      ),
    );
  });

program
  .command("pull")
  .description(
    "Pull supported Shopify data into local fixture files",
  )
  .option(
    "--resource <resource>",
    "products | collections | metaobjects | all",
    "all",
  )
  .action(async (options) => {
    const resource =
      parsePullResource(
        options.resource,
      );

    const config =
      loadConfig();

    const client =
      new ShopifyClient(
        config.store,
        config.apiVersion,
        config.auth,
      );

    const result =
      await pullCommand(
        client,
        config.fixturesDir,
        resource,
      );

    console.log(
      pc.green(
        [
          `Pulled ${resource}.`,
          `Products: ${result.products}.`,
          `Collections: ${result.collections}.`,
          `Definitions: ${result.definitions}.`,
          `Metaobjects: ${result.metaobjects}.`,
        ].join(" "),
      ),
    );
  });

program
  .parseAsync()
  .catch((error) => {
    console.error(
      pc.red(
        error instanceof Error
          ? error.message
          : String(error),
      ),
    );

    process.exitCode = 1;
  });