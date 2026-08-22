export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export interface ProductOptionFixture {
  name: string;
  values: string[];
}

export interface ProductVariantFixture {
  sku: string;
  price: string;
  options?: Record<string, string>;
}

export interface ProductMetafieldFixture {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface ProductFixture {
  key: string;
  handle: string;
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  status?: ProductStatus;
  tags?: string[];
  options?: ProductOptionFixture[];
  variants?: ProductVariantFixture[];
  metafields?: ProductMetafieldFixture[];
}

export interface CollectionFixture {
  key: string;
  handle: string;
  title: string;
  descriptionHtml?: string;
}

export interface MetaobjectFieldDefinitionFixture {
  key: string;
  name: string;
  type: string;
  required?: boolean;
}

export interface MetaobjectDefinitionFixture {
  type: string;
  name: string;
  displayNameKey?: string;
  fields: MetaobjectFieldDefinitionFixture[];
}

export interface MetaobjectFixture {
  type: string;
  handle: string;
  fields: Record<string, string>;
}
