import type { CollectionFixture, MetaobjectDefinitionFixture, MetaobjectFixture, ProductFixture } from "../domain/types.js";
import type { ShopifyClient } from "./client.js";
import { paginate } from "./pagination.js";

const PRODUCT_BY_HANDLE = `query($identifier:ProductIdentifierInput!){product:productByIdentifier(identifier:$identifier){id handle}}`;
const COLLECTION_BY_HANDLE = `query($query:String!){collections(first:1,query:$query){nodes{id handle}}}`;
const CREATE_PRODUCT = `mutation($product:ProductCreateInput!){productCreate(product:$product){product{id handle variants(first:1){nodes{id}}} userErrors{field message}}}`;
const BULK_VARIANTS = `mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!,$strategy:ProductVariantsBulkCreateStrategy){productVariantsBulkCreate(productId:$productId,variants:$variants,strategy:$strategy){productVariants{id sku price} userErrors{field message}}}`;
const CREATE_COLLECTION = `mutation($input:CollectionInput!){collectionCreate(input:$input){collection{id handle} userErrors{field message}}}`;

const DEF_BY_TYPE = `query($type:String!){metaobjectDefinitionByType(type:$type){id type}}`;
const CREATE_DEF = `mutation($definition:MetaobjectDefinitionCreateInput!){metaobjectDefinitionCreate(definition:$definition){metaobjectDefinition{id type} userErrors{field message code}}}`;
const UPSERT_METAOBJECT = `mutation($handle:MetaobjectHandleInput!,$values:JSON!){metaobjectUpsert(handle:$handle,values:$values){metaobject{id type handle} userErrors{field message code}}}`;
const SET_METAFIELDS = `mutation($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id namespace key} userErrors{field message code}}}`;

function assertUserErrors(errors: Array<{field?: unknown; message: string}> | undefined, label: string) {
  if (errors?.length) throw new Error(`${label}: ${errors.map(e => e.message).join("; ")}`);
}

export async function getProductIdByHandle(client: ShopifyClient, handle: string): Promise<string | undefined> {
  const data = await client.request<{product: {id: string} | null}>(PRODUCT_BY_HANDLE, {identifier: {handle}}); return data.product?.id;
}
export async function getCollectionIdByHandle(client: ShopifyClient, handle: string): Promise<string | undefined> {
  const data = await client.request<{collections: {nodes: Array<{id: string; handle: string}>}}>(COLLECTION_BY_HANDLE, {query: `handle:${handle}`});
  return data.collections.nodes.find(collection => collection.handle === handle)?.id;
}

export async function createProduct(client: ShopifyClient, product: ProductFixture): Promise<string> {
  const data = await client.request<any>(CREATE_PRODUCT, {product: {
    title: product.title, handle: product.handle, descriptionHtml: product.descriptionHtml, vendor: product.vendor,
    productType: product.productType, status: product.status ?? "DRAFT", tags: product.tags ?? [],
    productOptions: (product.options ?? []).map(o => ({name: o.name, values: o.values.map(name => ({name}))}))
  }});
  assertUserErrors(data.productCreate.userErrors, `productCreate ${product.handle}`);
  const id = data.productCreate.product?.id as string | undefined;
  if (!id) throw new Error(`productCreate ${product.handle}: no product returned`);
  if ((product.variants?.length ?? 0) > 0) {
    const variants = product.variants!.map(v => ({price: v.price, inventoryItem: {sku: v.sku}, optionValues: Object.entries(v.options ?? {}).map(([optionName, name]) => ({optionName, name}))}));
    // REPLACE_STANDALONE_VARIANT avoids keeping Shopify's placeholder initial variant when fixture variants are supplied.
    const bulk = await client.request<any>(BULK_VARIANTS, {productId: id, variants: variants.slice(0, 250), strategy: "REMOVE_STANDALONE_VARIANT"});
    assertUserErrors(bulk.productVariantsBulkCreate.userErrors, `productVariantsBulkCreate ${product.handle}`);
  }
  return id;
}

export async function createCollection(client: ShopifyClient, collection: CollectionFixture): Promise<string> {
  const data = await client.request<any>(CREATE_COLLECTION, {input: {title: collection.title, handle: collection.handle, descriptionHtml: collection.descriptionHtml}});
  assertUserErrors(data.collectionCreate.userErrors, `collectionCreate ${collection.handle}`);
  const id = data.collectionCreate.collection?.id as string | undefined;
  if (!id) throw new Error(`collectionCreate ${collection.handle}: no collection returned`); return id;
}

export async function hasMetaobjectDefinition(client: ShopifyClient, type: string): Promise<boolean> {
  const data = await client.request<{metaobjectDefinitionByType: {id: string} | null}>(DEF_BY_TYPE, {type});
  return Boolean(data.metaobjectDefinitionByType?.id);
}

export async function createMetaobjectDefinition(client: ShopifyClient, d: MetaobjectDefinitionFixture): Promise<void> {
  const data = await client.request<any>(CREATE_DEF, {definition: {type: d.type, name: d.name, displayNameKey: d.displayNameKey, fieldDefinitions: d.fields.map(f => ({key: f.key, name: f.name, type: f.type, required: f.required ?? false}))}});
  assertUserErrors(data.metaobjectDefinitionCreate.userErrors, `metaobjectDefinitionCreate ${d.type}`);
}
export async function upsertMetaobject(client: ShopifyClient, m: MetaobjectFixture): Promise<void> {
  const data = await client.request<any>(UPSERT_METAOBJECT, {handle: {type: m.type, handle: m.handle}, values: m.fields});
  assertUserErrors(data.metaobjectUpsert.userErrors, `metaobjectUpsert ${m.type}/${m.handle}`);
}
export async function setProductMetafields(client: ShopifyClient, productId: string, fields: ProductFixture["metafields"]): Promise<void> {
  if (!fields?.length) return;
  for (let i=0; i<fields.length; i+=25) {
    const metafields = fields.slice(i, i+25).map(f => ({ownerId: productId, ...f}));
    const data = await client.request<any>(SET_METAFIELDS, {metafields});
    assertUserErrors(data.metafieldsSet.userErrors, "metafieldsSet");
  }
}

export async function pullProducts(client: ShopifyClient) {
  const Q=`query($after:String){products(first:100,after:$after){nodes{handle title descriptionHtml vendor productType status tags options{name optionValues{name}} variants(first:100){nodes{sku price selectedOptions{name value}} pageInfo{hasNextPage}} metafields(first:50){nodes{namespace key type value} pageInfo{hasNextPage}}} pageInfo{hasNextPage endCursor}}}`;
  return paginate(async after => (await client.request<any>(Q,{after})).products);
}
export async function pullCollections(client: ShopifyClient) {
  const Q=`query($after:String){collections(first:100,after:$after){nodes{handle title descriptionHtml} pageInfo{hasNextPage endCursor}}}`;
  return paginate(async after => (await client.request<any>(Q,{after})).collections);
}
export async function pullDefinitions(client: ShopifyClient) {
  const Q=`query($after:String){metaobjectDefinitions(first:100,after:$after){nodes{type name displayNameKey fieldDefinitions{key name required type{name}}} pageInfo{hasNextPage endCursor}}}`;
  return paginate(async after => (await client.request<any>(Q,{after})).metaobjectDefinitions);
}
export async function pullMetaobjectsForType(client: ShopifyClient, type: string) {
  const Q=`query($type:String!,$after:String){metaobjects(type:$type,first:100,after:$after){nodes{type handle fields{key value}} pageInfo{hasNextPage endCursor}}}`;
  return paginate(async after => (await client.request<any>(Q,{type,after})).metaobjects);
}
