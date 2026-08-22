import type { ShopifyClient } from "../../shopify/client.js";
import { createCollection, createMetaobjectDefinition, createProduct, getCollectionIdByHandle, getProductIdByHandle, hasMetaobjectDefinition, setProductMetafields, upsertMetaobject } from "../../shopify/resources.js";
import { validateFixtures } from "../../fixtures/validate.js";

export interface PlanItem {action: "CREATE"|"SKIP"|"UPSERT"; resource: string; key: string;}
export async function buildPlan(client: ShopifyClient, dir: string): Promise<{items: PlanItem[]; fixtures: Awaited<ReturnType<typeof validateFixtures>>["fixtures"]}> {
  const validation = await validateFixtures(dir); if (!validation.ok) throw new Error(`Fixture validation failed:\n${validation.errors.join("\n")}`);
  const items: PlanItem[] = [];
  for (const p of validation.fixtures.products.products) items.push({action: await getProductIdByHandle(client,p.handle)?"SKIP":"CREATE", resource:"product",key:p.handle});
  for (const c of validation.fixtures.collections.collections) items.push({action: await getCollectionIdByHandle(client,c.handle)?"SKIP":"CREATE", resource:"collection",key:c.handle});
  for (const d of validation.fixtures.definitions.definitions) items.push({action: await hasMetaobjectDefinition(client,d.type)?"SKIP":"CREATE",resource:"metaobject-definition",key:d.type});
  for (const m of validation.fixtures.metaobjects.metaobjects) items.push({action:"UPSERT",resource:"metaobject",key:`${m.type}/${m.handle}`});
  return {items, fixtures: validation.fixtures};
}
export async function applyPlan(client: ShopifyClient, plan: Awaited<ReturnType<typeof buildPlan>>) {
  for (const p of plan.fixtures.products.products) if (plan.items.find(i=>i.resource==="product"&&i.key===p.handle)?.action === "CREATE") {
    const id=await createProduct(client,p); await setProductMetafields(client,id,p.metafields);
  }
  for (const c of plan.fixtures.collections.collections) if (plan.items.find(i=>i.resource==="collection"&&i.key===c.handle)?.action === "CREATE") await createCollection(client,c);
  for (const d of plan.fixtures.definitions.definitions) if (plan.items.find(i=>i.resource==="metaobject-definition"&&i.key===d.type)?.action === "CREATE") await createMetaobjectDefinition(client,d);
  for (const m of plan.fixtures.metaobjects.metaobjects) await upsertMetaobject(client,m);
}
