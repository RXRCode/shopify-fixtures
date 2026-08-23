import { describe, expect, it } from "vitest";
import {
  compareCollection,
  compareMetaobject,
  compareMetaobjectDefinition,
  compareProduct,
  hasDrift,
  summarizeDiff,
  type ProductState,
} from "../../src/domain/diff.js";
import type {
  MetaobjectDefinitionFixture,
  MetaobjectFixture,
  ProductFixture,
} from "../../src/domain/types.js";

const product: ProductFixture = {
  key: "classic-mug",
  handle: "classic-mug",
  title: "Classic Mug",
  descriptionHtml: "<p>A mug</p>",
  vendor: "RXR Fixtures",
  productType: "Mug",
  status: "ACTIVE",
  tags: ["ceramic", "drinkware"],
  options: [
    {
      name: "Size",
      values: ["Large", "Small"],
    },
  ],
  variants: [
    {
      sku: "MUG-L",
      price: "24.00",
      options: {
        Size: "Large",
      },
    },
    {
      sku: "MUG-S",
      price: "20.00",
      options: {
        Size: "Small",
      },
    },
  ],
  metafields: [
    {
      namespace: "rxr",
      key: "fixture",
      type: "single_line_text_field",
      value: "true",
    },
  ],
};

const remoteProduct: ProductState = {
  handle: product.handle,
  title: product.title,
  descriptionHtml: product.descriptionHtml,
  vendor: product.vendor,
  productType: product.productType,
  status: product.status,
  tags: product.tags,
  options: product.options,
  variants: product.variants,
  metafields: product.metafields,
};

describe("diff engine", () => {
  it("detects CREATE when a product is missing", () => {
    expect(compareProduct(product, undefined)).toEqual({
      action: "CREATE",
      resource: "product",
      key: "classic-mug",
    });
  });

  it("detects SKIP when a product matches", () => {
    expect(compareProduct(product, remoteProduct).action).toBe(
      "SKIP",
    );
  });

  it("detects CHANGE when a product field differs", () => {
    const remote: ProductState = {
      ...remoteProduct,
      title: "Old Mug",
    };

    const result = compareProduct(product, remote);

    expect(result.action).toBe("CHANGE");
    expect(result.changes).toContainEqual({
      field: "title",
      local: "Classic Mug",
      remote: "Old Mug",
    });
  });

  it("ignores ordering-only differences", () => {
    const remote: ProductState = {
      ...remoteProduct,
      tags: ["drinkware", "ceramic"],
      options: [
        {
          name: "Size",
          values: ["Small", "Large"],
        },
      ],
      variants: [
        product.variants?.[1],
        product.variants?.[0],
      ].filter(
        (
          variant,
        ): variant is NonNullable<
          ProductFixture["variants"]
        >[number] => Boolean(variant),
      ),
    };

    expect(compareProduct(product, remote).action).toBe(
      "SKIP",
    );
  });

  it("ignores unmanaged remote product metafields", () => {
    const remote: ProductState = {
      ...remoteProduct,
      metafields: [
        ...(remoteProduct.metafields ?? []),
        {
          namespace: "other",
          key: "unmanaged",
          type: "single_line_text_field",
          value: "leave-me-alone",
        },
      ],
    };

    expect(compareProduct(product, remote).action).toBe(
      "SKIP",
    );
  });

  it("normalizes equivalent decimal prices", () => {
    const remote: ProductState = {
      ...remoteProduct,
      variants: remoteProduct.variants?.map((variant) => ({
        ...variant,
        price:
          variant.sku === "MUG-L"
            ? "24"
            : variant.price,
      })),
    };

    expect(compareProduct(product, remote).action).toBe(
      "SKIP",
    );
  });

  it("compares collections", () => {
    const local = {
      key: "summer",
      handle: "summer",
      title: "Summer",
      descriptionHtml: "<p>Summer</p>",
    };

    expect(
      compareCollection(local, {
        handle: "summer",
        title: "Summer",
        descriptionHtml: "<p>Summer</p>",
      }).action,
    ).toBe("SKIP");

    expect(
      compareCollection(local, {
        handle: "summer",
        title: "Old Summer",
        descriptionHtml: "<p>Summer</p>",
      }).action,
    ).toBe("CHANGE");
  });

  it("compares metaobject definitions independent of field order", () => {
    const local: MetaobjectDefinitionFixture = {
      type: "rxr_note",
      name: "RXR Note",
      displayNameKey: "title",
      fields: [
        {
          key: "title",
          name: "Title",
          type: "single_line_text_field",
          required: true,
        },
        {
          key: "body",
          name: "Body",
          type: "multi_line_text_field",
        },
      ],
    };

    const remote: MetaobjectDefinitionFixture = {
      ...local,
      fields: [
        local.fields[1]!,
        local.fields[0]!,
      ],
    };

    expect(
      compareMetaobjectDefinition(local, remote).action,
    ).toBe("SKIP");
  });

  it("detects identical metaobjects as SKIP", () => {
    const local: MetaobjectFixture = {
      type: "rxr_fixture_note",
      handle: "seed-42",
      fields: {
        title: "Seed 42",
        settings: "{\"enabled\":true,\"count\":2}",
      },
    };

    const remote: MetaobjectFixture = {
      type: "rxr_fixture_note",
      handle: "seed-42",
      fields: {
        settings: "{\"count\":2,\"enabled\":true}",
        title: "Seed 42",
      },
    };

    expect(compareMetaobject(local, remote).action).toBe(
      "SKIP",
    );
  });

  it("detects changed metaobject values", () => {
    const local: MetaobjectFixture = {
      type: "rxr_fixture_note",
      handle: "seed-42",
      fields: {
        title: "New title",
      },
    };

    const remote: MetaobjectFixture = {
      type: "rxr_fixture_note",
      handle: "seed-42",
      fields: {
        title: "Old title",
      },
    };

    const result = compareMetaobject(local, remote);

    expect(result.action).toBe("CHANGE");
    expect(result.changes).toContainEqual({
      field: "fields",
      local: {
        title: "New title",
      },
      remote: {
        title: "Old title",
      },
    });
  });

  it("summarizes drift", () => {
    const items = [
      {
        action: "CREATE" as const,
        resource: "product" as const,
        key: "one",
      },
      {
        action: "CHANGE" as const,
        resource: "collection" as const,
        key: "two",
      },
      {
        action: "SKIP" as const,
        resource: "metaobject" as const,
        key: "three",
      },
    ];

    expect(summarizeDiff(items)).toEqual({
      create: 1,
      change: 1,
      skip: 1,
      total: 3,
    });

    expect(hasDrift(items)).toBe(true);
  });
});