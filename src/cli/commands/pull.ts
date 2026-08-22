import type { ShopifyClient } from "../../shopify/client.js";
import { pullCollections, pullDefinitions, pullMetaobjectsForType, pullProducts } from "../../shopify/resources.js";
import { writeGeneratedFixtures } from "../../fixtures/io.js";
export async function pullCommand(client: ShopifyClient, dir: string) {
  const productsRaw=await pullProducts(client); const collectionsRaw=await pullCollections(client); const defsRaw=await pullDefinitions(client);
  const metaobjectsRaw=[] as any[]; for (const d of defsRaw as any[]) metaobjectsRaw.push(...await pullMetaobjectsForType(client,d.type));
  for (const p of productsRaw as any[]) {
    if (p.variants.pageInfo.hasNextPage) throw new Error(`Pull refused to truncate variants for ${p.handle}; v0.1 supports the first 100 only`);
    if (p.metafields.pageInfo.hasNextPage) throw new Error(`Pull refused to truncate metafields for ${p.handle}; v0.1 supports the first 50 only`);
  }
  const products=productsRaw.map((p:any)=>({key:p.handle,handle:p.handle,title:p.title,descriptionHtml:p.descriptionHtml,vendor:p.vendor,productType:p.productType,status:p.status,tags:p.tags,options:p.options.map((o:any)=>({name:o.name,values:o.optionValues.map((v:any)=>v.name)})),variants:p.variants.nodes.map((v:any)=>({sku:v.sku||`fixture-${p.handle}`,price:v.price,options:Object.fromEntries(v.selectedOptions.map((o:any)=>[o.name,o.value]))})),metafields:p.metafields.nodes.map((m:any)=>({namespace:m.namespace,key:m.key,type:m.type,value:m.value}))}));
  const collections=collectionsRaw.map((c:any)=>({key:c.handle,handle:c.handle,title:c.title,descriptionHtml:c.descriptionHtml}));
  const definitions=defsRaw.map((d:any)=>({type:d.type,name:d.name,displayNameKey:d.displayNameKey??undefined,fields:d.fieldDefinitions.map((f:any)=>({key:f.key,name:f.name,type:f.type.name,required:f.required}))}));
  const metaobjects=metaobjectsRaw.map((m:any)=>({type:m.type,handle:m.handle,fields:Object.fromEntries(m.fields.map((f:any)=>[f.key,f.value??""]))}));
  await writeGeneratedFixtures(dir,{products,collections,definitions,metaobjects}); return {products,collections,definitions,metaobjects};
}
