import type { ShopifyClient } from "../../shopify/client.js";
import {
  hasDrift,
  summarizeDiff,
  type DiffItem,
  type DiffSummary,
} from "../../domain/diff.js";
import { buildPlan } from "./push.js";

export interface DiffResult {
  items: DiffItem[];
  summary: DiffSummary;
}

export async function diffCommand(
  client: ShopifyClient,
  dir: string,
): Promise<DiffResult> {
  const plan = await buildPlan(
    client,
    dir,
  );

  return {
    items: plan.items,
    summary: summarizeDiff(
      plan.items,
    ),
  };
}

function formatValue(
  value: unknown,
): string {
  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return (
    JSON.stringify(value) ??
    String(value)
  );
}

const resourceLabels = {
  product: "Products",
  collection: "Collections",
  "metaobject-definition":
    "Metaobject definitions",
  metaobject: "Metaobjects",
} as const;

export function formatDiffHuman(
  result: DiffResult,
): string {
  const lines: string[] = [
    "Shopify Fixture Diff",
  ];

  const resources = [
    "product",
    "collection",
    "metaobject-definition",
    "metaobject",
  ] as const;

  for (const resource of resources) {
    const items =
      result.items.filter(
        (item) =>
          item.resource === resource,
      );

    if (items.length === 0) {
      continue;
    }

    lines.push(
      "",
      resourceLabels[resource],
    );

    for (const item of items) {
      lines.push(
        `  ${item.action.padEnd(7)} ${item.key}`,
      );

      for (const change of
        item.changes ?? []) {
        lines.push(
          `    ${change.field}: ${formatValue(change.remote)} -> ${formatValue(change.local)}`,
        );
      }
    }
  }

  lines.push(
    "",
    "Summary",
    `  ${result.summary.create} create`,
    `  ${result.summary.change} change`,
    `  ${result.summary.skip} unchanged`,
    "  0 delete",
  );

  return lines.join("\n");
}

export function serializeDiff(
  store: string,
  apiVersion: string,
  result: DiffResult,
) {
  return {
    store,
    apiVersion,
    summary: {
      create:
        result.summary.create,
      change:
        result.summary.change,
      skip: result.summary.skip,
      delete: 0,
      total: result.summary.total,
    },
    items: result.items,
  };
}

export function diffShouldFailCheck(
  result: DiffResult,
): boolean {
  return hasDrift(result.items);
}