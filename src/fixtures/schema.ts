import { z } from "zod";

const version = z.literal(1);
const handle = z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/);
const price = z.string().regex(/^\d+(\.\d{1,2})?$/);

export const productFixtureSchema = z.object({
  key: z.string().min(1),
  handle,
  title: z.string().min(1),
  descriptionHtml: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  tags: z.array(z.string()).optional(),
  options: z.array(z.object({
    name: z.string().min(1),
    values: z.array(z.string().min(1)).min(1)
  })).optional(),
  variants: z.array(z.object({
    sku: z.string().min(1),
    price,
    options: z.record(z.string(), z.string()).optional()
  })).optional(),
  metafields: z.array(z.object({
    namespace: z.string().min(1),
    key: z.string().min(1),
    type: z.string().min(1),
    value: z.string()
  })).optional()
});

export const productsFileSchema = z.object({version, products: z.array(productFixtureSchema)});
export const collectionsFileSchema = z.object({
  version,
  collections: z.array(z.object({
    key: z.string().min(1), handle, title: z.string().min(1), descriptionHtml: z.string().optional()
  }))
});
export const definitionsFileSchema = z.object({
  version,
  definitions: z.array(z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    displayNameKey: z.string().optional(),
    fields: z.array(z.object({
      key: z.string().min(1), name: z.string().min(1), type: z.string().min(1), required: z.boolean().optional()
    })).min(1)
  }))
});
export const metaobjectsFileSchema = z.object({
  version,
  metaobjects: z.array(z.object({
    type: z.string().min(1), handle, fields: z.record(z.string(), z.string())
  }))
});
