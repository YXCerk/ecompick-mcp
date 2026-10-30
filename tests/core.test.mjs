import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executeTool,validateArguments,toolDefinitions} from '../dist/core.js';
import {createCatalogLoader} from '../dist/catalog.js';
// Synthetic data: the EcomPick directory is never bundled in this repository.
export const catalog={tools:['sample-a','sample-b','sample-c'].map((slug,i)=>({slug,name:'Sample '+i,tagline:i?'Inventory planning':'Product photo editor',taglineZh:i?null:'商品图片编辑',kind:i?'SaaS':'AI tool',category:i?'inventory':'photos',platforms:i?['Shopify']:[],worksWithAnyStore:!i,pricing:i?'Paid':'Free plan',pricingUrl:null,website:'https://example.com',url:'https://ecompick.com/tools/'+slug,alternativeSlugs:i?[]:['sample-b'],checkedAt:i?'2026-01-01':null,logoUrl:null})),categories:[{id:'photos',name:'Product photos',url:'https://ecompick.com/use-cases/photos',count:1,checkedAt:null}],platforms:[{id:'shopify',name:'Shopify',url:'https://ecompick.com/platforms/shopify',count:2,checkedAt:'2026-01-01'}]};
test('all six tools return source links and checked dates without ratings',()=>{
 const cases={search_tools:{},get_tool:{slug:'sample-a'},find_alternatives:{slug:'sample-a'},compare_tools:{slugs:['sample-a','sample-b']},list_tasks:{},list_platforms:{}};
 for(const d of toolDefinitions){const out=JSON.stringify(executeTool(d.name,cases[d.name],catalog));assert.match(out,/ref=mcp/);assert.match(out,/checkedAt/);assert.doesNotMatch(out,/rating/);}
});
test('filters combine, normalize platform IDs and distinguish native vs any-store',()=>{
 const result=executeTool('search_tools',{query:'商品',platform:'shopify',task:'photos',pricing:'Free plan',kind:'AI tool',limit:2},catalog);
 assert.equal(result.total,1);assert.deepEqual(result.tools[0].platforms,[]);assert.equal(result.tools[0].worksWithAnyStore,true);
 assert.equal(executeTool('search_tools',{query:'missing'},catalog).total,0);
 assert.throws(()=>executeTool('search_tools',{platform:'nonsense'},catalog),/Unknown platform/);
});
test('details exclude newly added private fields; unknown data remains null',()=>{
 const out=executeTool('get_tool',{slug:'sample-a'},{...catalog,tools:[{...catalog.tools[0],privateEmail:'secret@example.com'}]});
 assert.equal(out.tool.checkedAt,null);assert.equal(out.tool.pricingUrl,null);assert.equal(out.tool.privateEmail,undefined);
});
test('alternatives only follow documented links and reject missing tools',()=>{
 assert.equal(executeTool('find_alternatives',{slug:'sample-a'},catalog).alternatives.length,1);
 assert.deepEqual(executeTool('find_alternatives',{slug:'sample-b'},catalog).alternatives,[]);
 assert.throws(()=>executeTool('get_tool',{slug:'missing'},catalog),/not found/);
});
test('bounds, required args, types and unknown args are enforced',()=>{
 for(const input of [{limit:0},{limit:21},{limit:2.5},{query:2},{query:'x'.repeat(201)},{unexpected:1},[],null])assert.throws(()=>validateArguments('search_tools',input));
 for(const slugs of [[],['sample-a'],['sample-a','sample-a'],['a','b','c','d']])assert.throws(()=>validateArguments('compare_tools',{slugs}));
 assert.throws(()=>validateArguments('get_tool',{}));assert.throws(()=>validateArguments('bad',{}));
});
test('loader deduplicates requests, caches success and retries failures',async()=>{
 let calls=0;const load=createCatalogLoader(async url=>{calls++;return Response.json(url.includes('tools')?catalog.tools:url.includes('categories')?catalog.categories:catalog.platforms);});
 await Promise.all([load(),load()]);await load();assert.equal(calls,3);
 let fail=true;const retry=createCatalogLoader(async()=>fail?new Response('',{status:503}):Response.json([]));
 await assert.rejects(retry(),/503/);fail=false;assert.deepEqual((await retry()).tools,[]);
});
