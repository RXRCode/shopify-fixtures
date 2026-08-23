import type {
  CollectionFixture,
  MetaobjectDefinitionFixture,
  MetaobjectFixture,
  ProductFixture,
} from "./types.js";

export type DiffAction = "CREATE" | "CHANGE" | "SKIP";

export type DiffResource =
  | "product"
  | "collection"
  | "metaobject-definition"
  | "metaobject";

export interface FieldChange {
  field: string;
  local: unknown;
  remote: unknown;
}

export interface DiffItem {
  action: DiffAction;
  resource: DiffResource;
  key: string;
  changes?: FieldChange[];
}

export interface DiffSummary {
  create: number;
  change: number;
  skip: number;
  total: number;
}

export type ProductState = Omit<ProductFixture, "key">;
export type CollectionState = Omit<CollectionFixture, "key">;
export type MetaobjectDefinitionState = MetaobjectDefinitionFixture;
export type MetaobjectState = MetaobjectFixture;

function normalizeText(value: string | null | undefined): string {
  return value ?? "";
}

function normalizeDecimal(value: string): string {
  if (!value.includes(".")) return value;

  const normalized = value.replace(/0+$/, "").replace(/\.$/, "");
  return normalized || "0";
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value !== null && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(input).sort()) {
      output[key] = stableValue(input[key]);
    }

    return output;
  }

  return value;
}

function normalizeStoredValue(value: string): string {
  try {
    return JSON.stringify(stableValue(JSON.parse(value)));
  } catch {
    return value;
  }
}

function normalizeOptions(
  options: ProductFixture["options"],
): Array<{ name: string; values: string[] }> {
  return (options ?? [])
    .map((option) => ({
      name: option.name,
      values: [...option.values].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeVariantOptions(
  options: Record<string, string> | undefined,
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const key of Object.keys(options ?? {}).sort()) {
    const value = options?.[key];
    if (value !== undefined) output[key] = value;
  }

  return output;
}

function normalizeVariants(
  variants: ProductFixture["variants"],
): Array<{
  sku: string;
  price: string;
  options: Record<string, string>;
}> {
  return (variants ?? [])
    .map((variant) => ({
      sku: variant.sku,
      price: normalizeDecimal(variant.price),
      options: normalizeVariantOptions(variant.options),
    }))
    .sort((a, b) => {
      const aKey = `${a.sku}:${JSON.stringify(a.options)}:${a.price}`;
      const bKey = `${b.sku}:${JSON.stringify(b.options)}:${b.price}`;
      return aKey.localeCompare(bKey);
    });
}

function normalizeMetafields(
  metafields: ProductFixture["metafields"],
): Array<{
  namespace: string;
  key: string;
  type: string;
  value: string;
}> {
  return (metafields ?? [])
    .map((field) => ({
      namespace: field.namespace,
      key: field.key,
      type: field.type,
      value: normalizeStoredValue(field.value),
    }))
    .sort((a, b) =>
      `${a.namespace}.${a.key}`.localeCompare(`${b.namespace}.${b.key}`),
    );
}

function managedRemoteMetafields(
  local: ProductFixture,
  remote: ProductState,
): ProductFixture["metafields"] {
  const managedKeys = new Set(
    (local.metafields ?? []).map(
      (field) => `${field.namespace}.${field.key}`,
    ),
  );

  return (remote.metafields ?? []).filter((field) =>
    managedKeys.has(`${field.namespace}.${field.key}`),
  );
}

function normalizeProduct(
  product: ProductState,
  metafields: ProductFixture["metafields"] = product.metafields,
): Record<string, unknown> {
  return {
    title: product.title,
    descriptionHtml: normalizeText(product.descriptionHtml),
    vendor: normalizeText(product.vendor),
    productType: normalizeText(product.productType),
    status: product.status ?? "DRAFT",
    tags: [...(product.tags ?? [])].sort((a, b) => a.localeCompare(b)),
    options: normalizeOptions(product.options),
    variants: normalizeVariants(product.variants),
    metafields: normalizeMetafields(metafields),
  };
}

function normalizeCollection(
  collection: CollectionState,
): Record<string, unknown> {
  return {
    title: collection.title,
    descriptionHtml: normalizeText(collection.descriptionHtml),
  };
}

function normalizeDefinition(
  definition: MetaobjectDefinitionState,
): Record<string, unknown> {
  return {
    name: definition.name,
    displayNameKey: normalizeText(definition.displayNameKey),
    fields: definition.fields
      .map((field) => ({
        key: field.key,
        name: field.name,
        type: field.type,
        required: field.required ?? false,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

function normalizeMetaobject(
  metaobject: MetaobjectState,
): Record<string, unknown> {
  const fields: Record<string, string> = {};

  for (const key of Object.keys(metaobject.fields).sort()) {
    const value = metaobject.fields[key];
    if (value !== undefined) {
      fields[key] = normalizeStoredValue(value);
    }
  }

  return { fields };
}

function valuesEqual(local: unknown, remote: unknown): boolean {
  return JSON.stringify(local) === JSON.stringify(remote);
}

function fieldChanges(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): FieldChange[] {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);

  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .filter((key) => !valuesEqual(local[key], remote[key]))
    .map((key) => ({
      field: key,
      local: local[key],
      remote: remote[key],
    }));
}

function makeItem(
  resource: DiffResource,
  key: string,
  local: Record<string, unknown>,
  remote: Record<string, unknown> | undefined,
): DiffItem {
  if (!remote) {
    return {
      action: "CREATE",
      resource,
      key,
    };
  }

  const changes = fieldChanges(local, remote);

  if (changes.length === 0) {
    return {
      action: "SKIP",
      resource,
      key,
    };
  }

  return {
    action: "CHANGE",
    resource,
    key,
    changes,
  };
}

export function compareProduct(
  local: ProductFixture,
  remote: ProductState | undefined,
): DiffItem {
  if (!remote) {
    return {
      action: "CREATE",
      resource: "product",
      key: local.handle,
    };
  }

  return makeItem(
    "product",
    local.handle,
    normalizeProduct(local),
    normalizeProduct(
      remote,
      managedRemoteMetafields(local, remote),
    ),
  );
}

export function compareCollection(
  local: CollectionFixture,
  remote: CollectionState | undefined,
): DiffItem {
  return makeItem(
    "collection",
    local.handle,
    normalizeCollection(local),
    remote ? normalizeCollection(remote) : undefined,
  );
}

export function compareMetaobjectDefinition(
  local: MetaobjectDefinitionFixture,
  remote: MetaobjectDefinitionState | undefined,
): DiffItem {
  return makeItem(
    "metaobject-definition",
    local.type,
    normalizeDefinition(local),
    remote ? normalizeDefinition(remote) : undefined,
  );
}

export function compareMetaobject(
  local: MetaobjectFixture,
  remote: MetaobjectState | undefined,
): DiffItem {
  return makeItem(
    "metaobject",
    `${local.type}/${local.handle}`,
    normalizeMetaobject(local),
    remote ? normalizeMetaobject(remote) : undefined,
  );
}

export function summarizeDiff(items: DiffItem[]): DiffSummary {
  return {
    create: items.filter((item) => item.action === "CREATE").length,
    change: items.filter((item) => item.action === "CHANGE").length,
    skip: items.filter((item) => item.action === "SKIP").length,
    total: items.length,
  };
}

export function hasDrift(items: DiffItem[]): boolean {
  return items.some(
    (item) => item.action === "CREATE" || item.action === "CHANGE",
  );
}