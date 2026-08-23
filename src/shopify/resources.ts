import type {
  CollectionFixture,
  MetaobjectDefinitionFixture,
  MetaobjectFixture,
  ProductFixture,
} from "../domain/types.js";
import type {
  CollectionState,
  MetaobjectDefinitionState,
  MetaobjectState,
  ProductState,
} from "../domain/diff.js";
import type { ShopifyClient } from "./client.js";
import { paginate } from "./pagination.js";

const PRODUCT_ID_BY_HANDLE = `
  query($identifier: ProductIdentifierInput!) {
    product: productByIdentifier(identifier: $identifier) {
      id
    }
  }
`;

const PRODUCT_STATE_BY_HANDLE = `
  query($identifier: ProductIdentifierInput!) {
    product: productByIdentifier(identifier: $identifier) {
      handle
      title
      descriptionHtml
      vendor
      productType
      status
      tags
      options {
        name
        optionValues {
          name
        }
      }
      variants(first: 250) {
        nodes {
          sku
          price
          selectedOptions {
            name
            value
          }
        }
        pageInfo {
          hasNextPage
        }
      }
      metafields(first: 250) {
        nodes {
          namespace
          key
          type
          value
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`;

const COLLECTION_ID_BY_HANDLE = `
  query($identifier: CollectionIdentifierInput!) {
    collection: collectionByIdentifier(identifier: $identifier) {
      id
    }
  }
`;

const COLLECTION_STATE_BY_HANDLE = `
  query($identifier: CollectionIdentifierInput!) {
    collection: collectionByIdentifier(identifier: $identifier) {
      handle
      title
      descriptionHtml
    }
  }
`;

const DEFINITION_BY_TYPE = `
  query($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      type
      name
      displayNameKey
      fieldDefinitions {
        key
        name
        required
        type {
          name
        }
      }
    }
  }
`;

const METAOBJECT_BY_HANDLE = `
  query($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      type
      handle
      fields {
        key
        value
      }
    }
  }
`;

const CREATE_PRODUCT = `
  mutation($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        handle
        variants(first: 1) {
          nodes {
            id
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const BULK_VARIANTS = `
  mutation(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
    $strategy: ProductVariantsBulkCreateStrategy
  ) {
    productVariantsBulkCreate(
      productId: $productId
      variants: $variants
      strategy: $strategy
    ) {
      productVariants {
        id
        sku
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_COLLECTION = `
  mutation($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_DEFINITION = `
  mutation($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const UPSERT_METAOBJECT = `
  mutation($handle: MetaobjectHandleInput!, $values: JSON!) {
    metaobjectUpsert(handle: $handle, values: $values) {
      metaobject {
        id
        type
        handle
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const SET_METAFIELDS = `
  mutation($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

interface RawProductState {
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: NonNullable<ProductFixture["status"]>;
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

interface RawDefinitionState {
  type: string;
  name: string;
  displayNameKey: string | null;
  fieldDefinitions: Array<{
    key: string;
    name: string;
    required: boolean;
    type: {
      name: string;
    };
  }>;
}

interface RawMetaobjectState {
  type: string;
  handle: string;
  fields: Array<{
    key: string;
    value: string | null;
  }>;
}

function assertUserErrors(
  errors: Array<{
    field?: unknown;
    message: string;
  }> | undefined,
  label: string,
): void {
  if (errors?.length) {
    throw new Error(
      `${label}: ${errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }
}

export async function getProductIdByHandle(
  client: ShopifyClient,
  handle: string,
): Promise<string | undefined> {
  const data = await client.request<{
    product: {
      id: string;
    } | null;
  }>(PRODUCT_ID_BY_HANDLE, {
    identifier: {
      handle,
    },
  });

  return data.product?.id;
}

export async function getProductByHandle(
  client: ShopifyClient,
  handle: string,
): Promise<ProductState | undefined> {
  const data = await client.request<{
    product: RawProductState | null;
  }>(PRODUCT_STATE_BY_HANDLE, {
    identifier: {
      handle,
    },
  });

  const product = data.product;

  if (!product) {
    return undefined;
  }

  if (product.variants.pageInfo.hasNextPage) {
    throw new Error(
      `Diff refused to truncate variants for ${handle}; more than 250 variants were returned`,
    );
  }

  if (product.metafields.pageInfo.hasNextPage) {
    throw new Error(
      `Diff refused to truncate metafields for ${handle}; more than 250 metafields were returned`,
    );
  }

  return {
    handle: product.handle,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    vendor: product.vendor,
    productType: product.productType,
    status: product.status,
    tags: product.tags,
    options: product.options.map((option) => ({
      name: option.name,
      values: option.optionValues.map(
        (value) => value.name,
      ),
    })),
    variants: product.variants.nodes.map(
      (variant) => ({
        sku: variant.sku ?? "",
        price: variant.price,
        options: Object.fromEntries(
          variant.selectedOptions.map(
            (option) => [
              option.name,
              option.value,
            ],
          ),
        ),
      }),
    ),
    metafields: product.metafields.nodes.map(
      (field) => ({
        namespace: field.namespace,
        key: field.key,
        type: field.type,
        value: field.value,
      }),
    ),
  };
}

export async function getCollectionIdByHandle(
  client: ShopifyClient,
  handle: string,
): Promise<string | undefined> {
  const data = await client.request<{
    collection: {
      id: string;
    } | null;
  }>(COLLECTION_ID_BY_HANDLE, {
    identifier: {
      handle,
    },
  });

  return data.collection?.id;
}

export async function getCollectionByHandle(
  client: ShopifyClient,
  handle: string,
): Promise<CollectionState | undefined> {
  const data = await client.request<{
    collection: {
      handle: string;
      title: string;
      descriptionHtml: string;
    } | null;
  }>(COLLECTION_STATE_BY_HANDLE, {
    identifier: {
      handle,
    },
  });

  if (!data.collection) {
    return undefined;
  }

  return {
    handle: data.collection.handle,
    title: data.collection.title,
    descriptionHtml:
      data.collection.descriptionHtml,
  };
}

export async function getMetaobjectDefinitionByType(
  client: ShopifyClient,
  type: string,
): Promise<
  MetaobjectDefinitionState | undefined
> {
  const data = await client.request<{
    metaobjectDefinitionByType:
      | RawDefinitionState
      | null;
  }>(DEFINITION_BY_TYPE, {
    type,
  });

  const definition =
    data.metaobjectDefinitionByType;

  if (!definition) {
    return undefined;
  }

  return {
    type: definition.type,
    name: definition.name,
    displayNameKey:
      definition.displayNameKey ?? undefined,
    fields: definition.fieldDefinitions.map(
      (field) => ({
        key: field.key,
        name: field.name,
        type: field.type.name,
        required: field.required,
      }),
    ),
  };
}

export async function hasMetaobjectDefinition(
  client: ShopifyClient,
  type: string,
): Promise<boolean> {
  return Boolean(
    await getMetaobjectDefinitionByType(
      client,
      type,
    ),
  );
}

export async function getMetaobjectByHandle(
  client: ShopifyClient,
  type: string,
  handle: string,
): Promise<MetaobjectState | undefined> {
  const data = await client.request<{
    metaobjectByHandle:
      | RawMetaobjectState
      | null;
  }>(METAOBJECT_BY_HANDLE, {
    handle: {
      type,
      handle,
    },
  });

  const metaobject = data.metaobjectByHandle;

  if (!metaobject) {
    return undefined;
  }

  return {
    type: metaobject.type,
    handle: metaobject.handle,
    fields: Object.fromEntries(
      metaobject.fields.map((field) => [
        field.key,
        field.value ?? "",
      ]),
    ),
  };
}

export async function createProduct(
  client: ShopifyClient,
  product: ProductFixture,
): Promise<string> {
  const data = await client.request<{
    productCreate: {
      product?: {
        id: string;
      } | null;
      userErrors?: Array<{
        field?: unknown;
        message: string;
      }>;
    };
  }>(CREATE_PRODUCT, {
    product: {
      title: product.title,
      handle: product.handle,
      descriptionHtml:
        product.descriptionHtml,
      vendor: product.vendor,
      productType: product.productType,
      status: product.status ?? "DRAFT",
      tags: product.tags ?? [],
      productOptions: (
        product.options ?? []
      ).map((option) => ({
        name: option.name,
        values: option.values.map(
          (name) => ({
            name,
          }),
        ),
      })),
    },
  });

  assertUserErrors(
    data.productCreate.userErrors,
    `productCreate ${product.handle}`,
  );

  const id = data.productCreate.product?.id;

  if (!id) {
    throw new Error(
      `productCreate ${product.handle}: no product returned`,
    );
  }

  if ((product.variants?.length ?? 0) > 0) {
    const variants =
      product.variants?.map((variant) => ({
        price: variant.price,

        ...(variant.sku
          ? {
              inventoryItem: {
                sku: variant.sku,
              },
            }
          : {}),

        optionValues: Object.entries(
          variant.options ?? {},
        ).map(([optionName, name]) => ({
          optionName,
          name,
        })),
      })) ?? [];

    const bulk = await client.request<{
      productVariantsBulkCreate: {
        userErrors?: Array<{
          field?: unknown;
          message: string;
        }>;
      };
    }>(BULK_VARIANTS, {
      productId: id,
      variants: variants.slice(0, 250),
      strategy:
        "REMOVE_STANDALONE_VARIANT",
    });

    assertUserErrors(
      bulk.productVariantsBulkCreate
        .userErrors,
      `productVariantsBulkCreate ${product.handle}`,
    );
  }

  return id;
}

export async function createCollection(
  client: ShopifyClient,
  collection: CollectionFixture,
): Promise<string> {
  const data = await client.request<{
    collectionCreate: {
      collection?: {
        id: string;
      } | null;
      userErrors?: Array<{
        field?: unknown;
        message: string;
      }>;
    };
  }>(CREATE_COLLECTION, {
    input: {
      title: collection.title,
      handle: collection.handle,
      descriptionHtml:
        collection.descriptionHtml,
    },
  });

  assertUserErrors(
    data.collectionCreate.userErrors,
    `collectionCreate ${collection.handle}`,
  );

  const id =
    data.collectionCreate.collection?.id;

  if (!id) {
    throw new Error(
      `collectionCreate ${collection.handle}: no collection returned`,
    );
  }

  return id;
}

export async function createMetaobjectDefinition(
  client: ShopifyClient,
  definition: MetaobjectDefinitionFixture,
): Promise<void> {
  const data = await client.request<{
    metaobjectDefinitionCreate: {
      userErrors?: Array<{
        field?: unknown;
        message: string;
      }>;
    };
  }>(CREATE_DEFINITION, {
    definition: {
      type: definition.type,
      name: definition.name,
      displayNameKey:
        definition.displayNameKey,
      fieldDefinitions:
        definition.fields.map(
          (field) => ({
            key: field.key,
            name: field.name,
            type: field.type,
            required:
              field.required ?? false,
          }),
        ),
    },
  });

  assertUserErrors(
    data.metaobjectDefinitionCreate
      .userErrors,
    `metaobjectDefinitionCreate ${definition.type}`,
  );
}

export async function upsertMetaobject(
  client: ShopifyClient,
  metaobject: MetaobjectFixture,
): Promise<void> {
  const data = await client.request<{
    metaobjectUpsert: {
      userErrors?: Array<{
        field?: unknown;
        message: string;
      }>;
    };
  }>(UPSERT_METAOBJECT, {
    handle: {
      type: metaobject.type,
      handle: metaobject.handle,
    },
    values: metaobject.fields,
  });

  assertUserErrors(
    data.metaobjectUpsert.userErrors,
    `metaobjectUpsert ${metaobject.type}/${metaobject.handle}`,
  );
}

export async function setProductMetafields(
  client: ShopifyClient,
  productId: string,
  fields: ProductFixture["metafields"],
): Promise<void> {
  if (!fields?.length) {
    return;
  }

  for (
    let index = 0;
    index < fields.length;
    index += 25
  ) {
    const metafields = fields
      .slice(index, index + 25)
      .map((field) => ({
        ownerId: productId,
        ...field,
      }));

    const data = await client.request<{
      metafieldsSet: {
        userErrors?: Array<{
          field?: unknown;
          message: string;
        }>;
      };
    }>(SET_METAFIELDS, {
      metafields,
    });

    assertUserErrors(
      data.metafieldsSet.userErrors,
      "metafieldsSet",
    );
  }
}

export async function pullProducts(
  client: ShopifyClient,
) {
  const query = `
    query($after: String) {
      products(first: 100, after: $after) {
        nodes {
          handle
          title
          descriptionHtml
          vendor
          productType
          status
          tags
          options {
            name
            optionValues {
              name
            }
          }
          variants(first: 100) {
            nodes {
              sku
              price
              selectedOptions {
                name
                value
              }
            }
            pageInfo {
              hasNextPage
            }
          }
          metafields(first: 50) {
            nodes {
              namespace
              key
              type
              value
            }
            pageInfo {
              hasNextPage
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return paginate(
    async (after) =>
      (
        await client.request<any>(query, {
          after,
        })
      ).products,
  );
}

export async function pullCollections(
  client: ShopifyClient,
) {
  const query = `
    query($after: String) {
      collections(first: 100, after: $after) {
        nodes {
          handle
          title
          descriptionHtml
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return paginate(
    async (after) =>
      (
        await client.request<any>(query, {
          after,
        })
      ).collections,
  );
}

export async function pullDefinitions(
  client: ShopifyClient,
) {
  const query = `
    query($after: String) {
      metaobjectDefinitions(first: 100, after: $after) {
        nodes {
          type
          name
          displayNameKey
          fieldDefinitions {
            key
            name
            required
            type {
              name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return paginate(
    async (after) =>
      (
        await client.request<any>(query, {
          after,
        })
      ).metaobjectDefinitions,
  );
}

export async function pullMetaobjectsForType(
  client: ShopifyClient,
  type: string,
) {
  const query = `
    query($type: String!, $after: String) {
      metaobjects(
        type: $type
        first: 100
        after: $after
      ) {
        nodes {
          type
          handle
          fields {
            key
            value
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return paginate(
    async (after) =>
      (
        await client.request<any>(query, {
          type,
          after,
        })
      ).metaobjects,
  );
}