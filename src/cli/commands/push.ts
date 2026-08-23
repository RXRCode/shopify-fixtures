import type { ShopifyClient } from "../../shopify/client.js";
import {
  createCollection,
  createMetaobjectDefinition,
  createProduct,
  getCollectionByHandle,
  getMetaobjectByHandle,
  getMetaobjectDefinitionByType,
  getProductByHandle,
  setProductMetafields,
  upsertMetaobject,
} from "../../shopify/resources.js";
import {
  compareCollection,
  compareMetaobject,
  compareMetaobjectDefinition,
  compareProduct,
  type DiffItem,
} from "../../domain/diff.js";
import { validateFixtures } from "../../fixtures/validate.js";

export type PlanItem = DiffItem;

export interface PushPlan {
  items: PlanItem[];
  fixtures: Awaited<
    ReturnType<typeof validateFixtures>
  >["fixtures"];
}

export async function buildPlan(
  client: ShopifyClient,
  dir: string,
): Promise<PushPlan> {
  const validation = await validateFixtures(dir);

  if (!validation.ok) {
    throw new Error(
      `Fixture validation failed:\n${validation.errors.join("\n")}`,
    );
  }

  const items: PlanItem[] = [];

  for (const product of validation.fixtures.products.products) {
    const remote = await getProductByHandle(
      client,
      product.handle,
    );

    items.push(compareProduct(product, remote));
  }

  for (const collection of validation.fixtures.collections.collections) {
    const remote = await getCollectionByHandle(
      client,
      collection.handle,
    );

    items.push(compareCollection(collection, remote));
  }

  for (const definition of validation.fixtures.definitions.definitions) {
    const remote = await getMetaobjectDefinitionByType(
      client,
      definition.type,
    );

    items.push(
      compareMetaobjectDefinition(definition, remote),
    );
  }

  for (const metaobject of validation.fixtures.metaobjects.metaobjects) {
    const remote = await getMetaobjectByHandle(
      client,
      metaobject.type,
      metaobject.handle,
    );

    items.push(compareMetaobject(metaobject, remote));
  }

  return {
    items,
    fixtures: validation.fixtures,
  };
}

function unsupportedChanges(plan: PushPlan): PlanItem[] {
  return plan.items.filter(
    (item) =>
      item.action === "CHANGE" &&
      item.resource !== "metaobject",
  );
}

export async function applyPlan(
  client: ShopifyClient,
  plan: PushPlan,
): Promise<void> {
  const unsupported = unsupportedChanges(plan);

  if (unsupported.length > 0) {
    const details = unsupported
      .map(
        (item) =>
          `${item.resource} ${item.key}`,
      )
      .join("\n");

    throw new Error(
      [
        "Apply refused before making any mutations.",
        "v0.2 detected changes to existing resources that do not yet support automatic updates:",
        details,
        "Review the diff or update the Shopify resource manually.",
      ].join("\n"),
    );
  }

  for (const product of plan.fixtures.products.products) {
    const item = plan.items.find(
      (candidate) =>
        candidate.resource === "product" &&
        candidate.key === product.handle,
    );

    if (item?.action !== "CREATE") continue;

    const id = await createProduct(client, product);
    await setProductMetafields(
      client,
      id,
      product.metafields,
    );
  }

  for (const collection of plan.fixtures.collections.collections) {
    const item = plan.items.find(
      (candidate) =>
        candidate.resource === "collection" &&
        candidate.key === collection.handle,
    );

    if (item?.action === "CREATE") {
      await createCollection(client, collection);
    }
  }

  for (const definition of plan.fixtures.definitions.definitions) {
    const item = plan.items.find(
      (candidate) =>
        candidate.resource === "metaobject-definition" &&
        candidate.key === definition.type,
    );

    if (item?.action === "CREATE") {
      await createMetaobjectDefinition(
        client,
        definition,
      );
    }
  }

  for (const metaobject of plan.fixtures.metaobjects.metaobjects) {
    const key = `${metaobject.type}/${metaobject.handle}`;

    const item = plan.items.find(
      (candidate) =>
        candidate.resource === "metaobject" &&
        candidate.key === key,
    );

    if (
      item?.action === "CREATE" ||
      item?.action === "CHANGE"
    ) {
      await upsertMetaobject(client, metaobject);
    }
  }
}