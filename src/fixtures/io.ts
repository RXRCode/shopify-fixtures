import fs from "node:fs/promises";
import path from "node:path";
import {
  collectionsFileSchema,
  definitionsFileSchema,
  metaobjectsFileSchema,
  productsFileSchema,
} from "./schema.js";

export const fixturePaths = (dir: string) => ({
  products: path.join(dir, "products.json"),
  collections: path.join(dir, "collections.json"),
  definitions: path.join(
    dir,
    "metaobject-definitions.json",
  ),
  metaobjects: path.join(
    dir,
    "metaobjects.json",
  ),
});

async function readJson(
  file: string,
): Promise<unknown> {
  return JSON.parse(
    await fs.readFile(file, "utf8"),
  );
}

async function writeJson(
  file: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(file), {
    recursive: true,
  });

  await fs.writeFile(
    file,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

export async function initializeFixtureDir(
  dir: string,
): Promise<void> {
  await Promise.all([
    writeProductsFixtures(dir, []),
    writeCollectionsFixtures(dir, []),
    writeDefinitionsFixtures(dir, []),
    writeMetaobjectsFixtures(dir, []),
  ]);
}

export async function loadAllFixtures(
  dir: string,
) {
  const paths = fixturePaths(dir);

  return {
    products: productsFileSchema.parse(
      await readJson(paths.products),
    ),
    collections: collectionsFileSchema.parse(
      await readJson(paths.collections),
    ),
    definitions: definitionsFileSchema.parse(
      await readJson(paths.definitions),
    ),
    metaobjects: metaobjectsFileSchema.parse(
      await readJson(paths.metaobjects),
    ),
  };
}

export async function writeProductsFixtures(
  dir: string,
  products: unknown[],
): Promise<void> {
  await writeJson(
    fixturePaths(dir).products,
    {
      version: 1,
      products,
    },
  );
}

export async function writeCollectionsFixtures(
  dir: string,
  collections: unknown[],
): Promise<void> {
  await writeJson(
    fixturePaths(dir).collections,
    {
      version: 1,
      collections,
    },
  );
}

export async function writeDefinitionsFixtures(
  dir: string,
  definitions: unknown[],
): Promise<void> {
  await writeJson(
    fixturePaths(dir).definitions,
    {
      version: 1,
      definitions,
    },
  );
}

export async function writeMetaobjectsFixtures(
  dir: string,
  metaobjects: unknown[],
): Promise<void> {
  await writeJson(
    fixturePaths(dir).metaobjects,
    {
      version: 1,
      metaobjects,
    },
  );
}

export async function writeGeneratedFixtures(
  dir: string,
  data: {
    products: unknown[];
    collections: unknown[];
    definitions: unknown[];
    metaobjects: unknown[];
  },
): Promise<void> {
  await Promise.all([
    writeProductsFixtures(
      dir,
      data.products,
    ),
    writeCollectionsFixtures(
      dir,
      data.collections,
    ),
    writeDefinitionsFixtures(
      dir,
      data.definitions,
    ),
    writeMetaobjectsFixtures(
      dir,
      data.metaobjects,
    ),
  ]);
}