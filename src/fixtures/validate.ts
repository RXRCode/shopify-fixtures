import { loadAllFixtures } from "./io.js";

function duplicates(values: string[]): string[] {
  const seen = new Set<string>(); const dup = new Set<string>();
  for (const value of values) { if (seen.has(value)) dup.add(value); seen.add(value); }
  return [...dup];
}

export async function validateFixtures(dir: string) {
  const all = await loadAllFixtures(dir);
  const errors: string[] = [];
  const productHandles = duplicates(all.products.products.map(p => p.handle));
  const skus = duplicates(all.products.products.flatMap(p => (p.variants ?? []).map(v => v.sku)));
  const collectionHandles = duplicates(all.collections.collections.map(c => c.handle));
  const definitionTypes = duplicates(all.definitions.definitions.map(d => d.type));
  const metaobjectIds = duplicates(all.metaobjects.metaobjects.map(m => `${m.type}/${m.handle}`));
  if (productHandles.length) errors.push(`Duplicate product handles: ${productHandles.join(", ")}`);
  if (skus.length) errors.push(`Duplicate SKUs: ${skus.join(", ")}`);
  if (collectionHandles.length) errors.push(`Duplicate collection handles: ${collectionHandles.join(", ")}`);
  if (definitionTypes.length) errors.push(`Duplicate metaobject definition types: ${definitionTypes.join(", ")}`);
  if (metaobjectIds.length) errors.push(`Duplicate metaobjects: ${metaobjectIds.join(", ")}`);
  const defs = new Map<string, Set<string>>(all.definitions.definitions.map(d => [d.type, new Set<string>(d.fields.map(f => f.key))]));
  for (const metaobject of all.metaobjects.metaobjects) {
    const fields = defs.get(metaobject.type);
    if (!fields) errors.push(`Metaobject ${metaobject.type}/${metaobject.handle} has no local definition`);
    else for (const key of Object.keys(metaobject.fields)) if (!fields.has(key)) errors.push(`Unknown field ${metaobject.type}.${key}`);
  }
  for (const product of all.products.products) {
    if ((product.options ?? []).length > 3) errors.push(`Product ${product.handle}: v0.1 supports at most 3 product options`);
    if ((product.variants ?? []).length > 250) errors.push(`Product ${product.handle}: v0.1 supports at most 250 fixture variants per product`);
    const optionNames = new Set((product.options ?? []).map(o => o.name));
    for (const variant of product.variants ?? []) {
      for (const name of Object.keys(variant.options ?? {})) if (!optionNames.has(name)) errors.push(`Product ${product.handle}: variant uses undeclared option ${name}`);
    }
  }
  return {ok: errors.length === 0, errors, fixtures: all};
}
