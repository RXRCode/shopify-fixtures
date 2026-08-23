import type { ShopifyClient } from "../../shopify/client.js";
import {
  pullCollections,
  pullDefinitions,
  pullMetaobjectsForType,
  pullProducts,
} from "../../shopify/resources.js";
import {
  writeCollectionsFixtures,
  writeDefinitionsFixtures,
  writeMetaobjectsFixtures,
  writeProductsFixtures,
} from "../../fixtures/io.js";

export type PullResource =
  | "products"
  | "collections"
  | "metaobjects"
  | "all";

export interface PullResult {
  resource: PullResource;
  products: number;
  collections: number;
  definitions: number;
  metaobjects: number;
}

interface PulledProduct {
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: string;
  tags: string[];
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
    }>;
  }>;
  variants: {
    nodes: Array<{
      sku: string | null;
      price: string;
      selectedOptions: Array<{
        name: string;
        value: string;
      }>;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
  metafields: {
    nodes: Array<{
      namespace: string;
      key: string;
      type: string;
      value: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

interface PulledCollection {
  handle: string;
  title: string;
  descriptionHtml: string;
}

interface PulledDefinition {
  type: string;
  name: string;
  displayNameKey?: string | null;
  fieldDefinitions: Array<{
    key: string;
    name: string;
    required: boolean;
    type: {
      name: string;
    };
  }>;
}

interface PulledMetaobject {
  type: string;
  handle: string;
  fields: Array<{
    key: string;
    value: string | null;
  }>;
}

export function parsePullResource(
  value: string,
): PullResource {
  const supported: PullResource[] = [
    "products",
    "collections",
    "metaobjects",
    "all",
  ];

  if (
    !supported.includes(
      value as PullResource,
    )
  ) {
    throw new Error(
      `Unknown pull resource "${value}". Use products, collections, metaobjects, or all.`,
    );
  }

  return value as PullResource;
}

export function pullTargets(
  resource: PullResource,
) {
  return {
    products:
      resource === "products" ||
      resource === "all",

    collections:
      resource === "collections" ||
      resource === "all",

    metaobjects:
      resource === "metaobjects" ||
      resource === "all",
  };
}

function normalizeProducts(
  productsRaw: PulledProduct[],
) {
  for (const product of productsRaw) {
    if (
      product.variants.pageInfo
        .hasNextPage
    ) {
      throw new Error(
        `Pull refused to truncate variants for ${product.handle}; only the first 100 variants are currently supported`,
      );
    }

    if (
      product.metafields.pageInfo
        .hasNextPage
    ) {
      throw new Error(
        `Pull refused to truncate metafields for ${product.handle}; only the first 50 metafields are currently supported`,
      );
    }
  }

  return productsRaw.map(
    (product) => ({
      key: product.handle,
      handle: product.handle,
      title: product.title,

      descriptionHtml:
        product.descriptionHtml,

      vendor: product.vendor,

      productType:
        product.productType,

      status: product.status,

      tags: product.tags,

      options:
        product.options.map(
          (option) => ({
            name: option.name,

            values:
              option.optionValues.map(
                (value) =>
                  value.name,
              ),
          }),
        ),

      variants:
        product.variants.nodes.map(
          (variant) => ({
            sku: variant.sku ?? "",

            price: variant.price,

            options:
              Object.fromEntries(
                variant.selectedOptions.map(
                  (option) => [
                    option.name,
                    option.value,
                  ],
                ),
              ),
          }),
        ),

      metafields:
        product.metafields.nodes.map(
          (field) => ({
            namespace:
              field.namespace,

            key: field.key,

            type: field.type,

            value: field.value,
          }),
        ),
    }),
  );
}

function normalizeCollections(
  collectionsRaw: PulledCollection[],
) {
  return collectionsRaw.map(
    (collection) => ({
      key: collection.handle,

      handle:
        collection.handle,

      title:
        collection.title,

      descriptionHtml:
        collection.descriptionHtml,
    }),
  );
}

function normalizeDefinitions(
  definitionsRaw: PulledDefinition[],
) {
  return definitionsRaw.map(
    (definition) => ({
      type: definition.type,

      name: definition.name,

      displayNameKey:
        definition.displayNameKey ??
        undefined,

      fields:
        definition.fieldDefinitions.map(
          (field) => ({
            key: field.key,

            name: field.name,

            type: field.type.name,

            required:
              field.required,
          }),
        ),
    }),
  );
}

function normalizeMetaobjects(
  metaobjectsRaw: PulledMetaobject[],
) {
  return metaobjectsRaw.map(
    (metaobject) => ({
      type: metaobject.type,

      handle:
        metaobject.handle,

      fields:
        Object.fromEntries(
          metaobject.fields.map(
            (field) => [
              field.key,
              field.value ?? "",
            ],
          ),
        ),
    }),
  );
}

export async function pullCommand(
  client: ShopifyClient,
  dir: string,
  resource: PullResource = "all",
): Promise<PullResult> {
  const targets =
    pullTargets(resource);

  const result: PullResult = {
    resource,
    products: 0,
    collections: 0,
    definitions: 0,
    metaobjects: 0,
  };

  if (targets.products) {
    const productsRaw =
      (await pullProducts(
        client,
      )) as PulledProduct[];

    const products =
      normalizeProducts(
        productsRaw,
      );

    await writeProductsFixtures(
      dir,
      products,
    );

    result.products =
      products.length;
  }

  if (targets.collections) {
    const collectionsRaw =
      (await pullCollections(
        client,
      )) as PulledCollection[];

    const collections =
      normalizeCollections(
        collectionsRaw,
      );

    await writeCollectionsFixtures(
      dir,
      collections,
    );

    result.collections =
      collections.length;
  }

  if (targets.metaobjects) {
    const definitionsRaw =
      (await pullDefinitions(
        client,
      )) as PulledDefinition[];

    const definitions =
      normalizeDefinitions(
        definitionsRaw,
      );

    const metaobjectsRaw:
      PulledMetaobject[] = [];

    for (
      const definition of
      definitionsRaw
    ) {
      const pulled =
        (await pullMetaobjectsForType(
          client,
          definition.type,
        )) as PulledMetaobject[];

      metaobjectsRaw.push(
        ...pulled,
      );
    }

    const metaobjects =
      normalizeMetaobjects(
        metaobjectsRaw,
      );

    await writeDefinitionsFixtures(
      dir,
      definitions,
    );

    await writeMetaobjectsFixtures(
      dir,
      metaobjects,
    );

    result.definitions =
      definitions.length;

    result.metaobjects =
      metaobjects.length;
  }

  return result;
}