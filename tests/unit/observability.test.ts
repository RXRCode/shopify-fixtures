import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  authConfigured,
  nodeSupported,
} from "../../src/cli/commands/doctor.js";

import {
  diffShouldFailCheck,
  formatDiffHuman,
  serializeDiff,
} from "../../src/cli/commands/diff.js";

import {
  parsePullResource,
  pullTargets,
} from "../../src/cli/commands/pull.js";

import {
  fixtureCounts,
} from "../../src/cli/commands/status.js";

import {
  initializeFixtureDir,
  loadAllFixtures,
  writeProductsFixtures,
} from "../../src/fixtures/io.js";

describe(
  "v0.2 observability helpers",
  () => {
    it(
      "checks supported Node versions",
      () => {
        expect(
          nodeSupported("20.0.0"),
        ).toBe(true);

        expect(
          nodeSupported("22.4.1"),
        ).toBe(true);

        expect(
          nodeSupported("19.9.0"),
        ).toBe(false);
      },
    );

    it(
      "detects supported auth configuration",
      () => {
        expect(
          authConfigured({
            SHOPIFY_ACCESS_TOKEN:
              "test-token",
          }),
        ).toBe(true);

        expect(
          authConfigured({
            SHOPIFY_CLIENT_ID:
              "client",
            SHOPIFY_CLIENT_SECRET:
              "secret",
          }),
        ).toBe(true);

        expect(
          authConfigured({}),
        ).toBe(false);
      },
    );

    it(
      "validates pull resources",
      () => {
        expect(
          parsePullResource(
            "products",
          ),
        ).toBe("products");

        expect(
          parsePullResource(
            "all",
          ),
        ).toBe("all");

        expect(() =>
          parsePullResource(
            "orders",
          ),
        ).toThrow();
      },
    );

    it(
      "selects only requested pull targets",
      () => {
        expect(
          pullTargets(
            "products",
          ),
        ).toEqual({
          products: true,
          collections: false,
          metaobjects: false,
        });

        expect(
          pullTargets(
            "metaobjects",
          ),
        ).toEqual({
          products: false,
          collections: false,
          metaobjects: true,
        });
      },
    );

    it(
      "formats human-readable diff output",
      () => {
        const result = {
          summary: {
            create: 1,
            change: 1,
            skip: 1,
            total: 3,
          },
          items: [
            {
              action:
                "CREATE" as const,
              resource:
                "product" as const,
              key: "new-product",
            },
            {
              action:
                "CHANGE" as const,
              resource:
                "collection" as const,
              key: "summer",
              changes: [
                {
                  field: "title",
                  local:
                    "Summer 2026",
                  remote:
                    "Summer",
                },
              ],
            },
            {
              action:
                "SKIP" as const,
              resource:
                "metaobject" as const,
              key: "note/one",
            },
          ],
        };

        const output =
          formatDiffHuman(
            result,
          );

        expect(
          output,
        ).toContain(
          "Shopify Fixture Diff",
        );

        expect(
          output,
        ).toContain(
          "CREATE",
        );

        expect(
          output,
        ).toContain(
          "CHANGE",
        );

        expect(
          output,
        ).toContain(
          "0 delete",
        );
      },
    );

    it(
      "serializes JSON diff output",
      () => {
        const result = {
          summary: {
            create: 0,
            change: 0,
            skip: 1,
            total: 1,
          },
          items: [
            {
              action:
                "SKIP" as const,
              resource:
                "product" as const,
              key: "one",
            },
          ],
        };

        expect(
          serializeDiff(
            "example.myshopify.com",
            "2026-07",
            result,
          ),
        ).toMatchObject({
          store:
            "example.myshopify.com",
          apiVersion:
            "2026-07",
          summary: {
            create: 0,
            change: 0,
            skip: 1,
            delete: 0,
            total: 1,
          },
        });
      },
    );

    it(
      "fails drift check for create or change",
      () => {
        expect(
          diffShouldFailCheck({
            summary: {
              create: 1,
              change: 0,
              skip: 0,
              total: 1,
            },
            items: [
              {
                action:
                  "CREATE",
                resource:
                  "product",
                key: "one",
              },
            ],
          }),
        ).toBe(true);

        expect(
          diffShouldFailCheck({
            summary: {
              create: 0,
              change: 0,
              skip: 1,
              total: 1,
            },
            items: [
              {
                action:
                  "SKIP",
                resource:
                  "product",
                key: "one",
              },
            ],
          }),
        ).toBe(false);
      },
    );

    it(
      "writes products without overwriting unrelated fixtures",
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              "rxr-fixtures-",
            ),
          );

        try {
          await initializeFixtureDir(
            dir,
          );

          await writeProductsFixtures(
            dir,
            [
              {
                key: "mug",
                handle: "mug",
                title: "Mug",
              },
            ],
          );

          const fixtures =
            await loadAllFixtures(
              dir,
            );

          expect(
            fixtures.products
              .products.length,
          ).toBe(1);

          expect(
            fixtures.collections
              .collections,
          ).toEqual([]);

          expect(
            fixtures.definitions
              .definitions,
          ).toEqual([]);

          expect(
            fixtures.metaobjects
              .metaobjects,
          ).toEqual([]);
        } finally {
          await fs.rm(dir, {
            recursive: true,
            force: true,
          });
        }
      },
    );

    it(
      "counts fixture resources",
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              "rxr-status-",
            ),
          );

        try {
          await initializeFixtureDir(
            dir,
          );

          await writeProductsFixtures(
            dir,
            [
              {
                key: "mug",
                handle: "mug",
                title: "Mug",
              },
            ],
          );

          const fixtures =
            await loadAllFixtures(
              dir,
            );

          expect(
            fixtureCounts(
              fixtures,
            ),
          ).toEqual({
            products: 1,
            collections: 0,
            definitions: 0,
            metaobjects: 0,
          });
        } finally {
          await fs.rm(dir, {
            recursive: true,
            force: true,
          });
        }
      },
    );
  },
);