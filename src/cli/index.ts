#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { fixtureDirWithoutAuth, loadConfig } from "./config.js";
import { initializeFixtureDir } from "../fixtures/io.js";
import { validateFixtures } from "../fixtures/validate.js";
import { generateCommand } from "./commands/generate.js";
import { ShopifyClient } from "../shopify/client.js";
import { applyPlan, buildPlan } from "./commands/push.js";
import { pullCommand } from "./commands/pull.js";

const program=new Command().name("rxr-fixtures").description("Reproducible development data for Shopify.").version("0.1.0");
program.command("init").description("Create empty v1 fixture files").action(async()=>{const dir=fixtureDirWithoutAuth();await initializeFixtureDir(dir);console.log(pc.green(`Initialized ${dir}`));});
program.command("generate").description("Generate deterministic fixtures")
  .option("--preset <name>","minimal | fashion | electronics","minimal")
  .option("--products <n>","number of products","10").option("--collections <n>","number of collections","3").option("--seed <n>","deterministic seed","1")
  .action(async o=>{if(!["minimal","fashion","electronics"].includes(o.preset))throw new Error("Unknown preset");const dir=fixtureDirWithoutAuth();const data=await generateCommand(dir,{preset:o.preset,products:Number(o.products),collections:Number(o.collections),seed:Number(o.seed)});console.log(pc.green(`Generated ${data.products.length} products and ${data.collections.length} collections in ${dir}`));});
program.command("validate").description("Validate local fixtures").action(async()=>{const result=await validateFixtures(fixtureDirWithoutAuth());if(!result.ok){result.errors.forEach(e=>console.error(pc.red(`✗ ${e}`)));process.exitCode=1;return;}console.log(pc.green("✓ Fixtures are valid"));});
program.command("status").description("Show configured store and fixture directory").action(()=>{const c=loadConfig();console.log(`Store: ${c.store}\nAPI: ${c.apiVersion}\nFixtures: ${c.fixturesDir}`);});
program.command("push").description("Plan fixture writes; add --apply to mutate Shopify").option("--apply","execute the planned writes",false).action(async o=>{const c=loadConfig();const client=new ShopifyClient(c.store,c.apiVersion,c.auth);const plan=await buildPlan(client,c.fixturesDir);console.log(pc.bold("Plan"));for(const i of plan.items)console.log(`${i.action.padEnd(6)} ${i.resource.padEnd(22)} ${i.key}`);console.log("\nNo delete operations are implemented.");if(!o.apply){console.log(pc.yellow("Plan only. Run again with --apply to write."));return;}if(plan.items.some(i=>(i.action==="CREATE"||i.action==="CHANGE")&&i.resource==="metaobject"))console.log(pc.yellow("Warning: metaobjectUpsert replaces the supplied values object for each entry."));await applyPlan(client,plan);console.log(pc.green("✓ Apply complete"));});
program.command("pull").description("Pull supported store data into local fixture files").action(async()=>{const c=loadConfig();const client=new ShopifyClient(c.store,c.apiVersion,c.auth);const d=await pullCommand(client,c.fixturesDir);console.log(pc.green(`Pulled ${d.products.length} products, ${d.collections.length} collections, ${d.definitions.length} definitions, ${d.metaobjects.length} metaobjects.`));});
program.parseAsync().catch(err=>{console.error(pc.red(err instanceof Error?err.message:String(err)));process.exitCode=1;});
