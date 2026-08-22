import { describe, expect, it } from "vitest"; import { paginate } from "../../src/shopify/pagination.js";
describe("paginate",()=>{it("collects pages",async()=>{let n=0;const result=await paginate(async()=>{n++;return n===1?{nodes:[1,2],pageInfo:{hasNextPage:true,endCursor:"x"}}:{nodes:[3],pageInfo:{hasNextPage:false,endCursor:null}}});expect(result).toEqual([1,2,3]);});});
