import fs from "node:fs/promises";
import path from "node:path";
import { collectionsFileSchema, definitionsFileSchema, metaobjectsFileSchema, productsFileSchema } from "./schema.js";

export const fixturePaths = (dir: string) => ({
  products: path.join(dir, "products.json"),
  collections: path.join(dir, "collections.json"),
  definitions: path.join(dir, "metaobject-definitions.json"),
  metaobjects: path.join(dir, "metaobjects.json")
});

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, "utf8"));
}
async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export async function initializeFixtureDir(dir: string): Promise<void> {
  const p = fixturePaths(dir);
  await writeJson(p.products, {version: 1, products: []});
  await writeJson(p.collections, {version: 1, collections: []});
  await writeJson(p.definitions, {version: 1, definitions: []});
  await writeJson(p.metaobjects, {version: 1, metaobjects: []});
}

export async function loadAllFixtures(dir: string) {
  const p = fixturePaths(dir);
  return {
    products: productsFileSchema.parse(await readJson(p.products)),
    collections: collectionsFileSchema.parse(await readJson(p.collections)),
    definitions: definitionsFileSchema.parse(await readJson(p.definitions)),
    metaobjects: metaobjectsFileSchema.parse(await readJson(p.metaobjects))
  };
}

export async function writeGeneratedFixtures(dir: string, data: {
  products: unknown[]; collections: unknown[]; definitions: unknown[]; metaobjects: unknown[];
}) {
  const p = fixturePaths(dir);
  await writeJson(p.products, {version: 1, products: data.products});
  await writeJson(p.collections, {version: 1, collections: data.collections});
  await writeJson(p.definitions, {version: 1, definitions: data.definitions});
  await writeJson(p.metaobjects, {version: 1, metaobjects: data.metaobjects});
}
