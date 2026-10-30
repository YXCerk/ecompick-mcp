import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../dist/server.js';
const t={slug:'sample',name:'Sample',tagline:'Synthetic test tool',taglineZh:null,kind:'SaaS',category:'test',platforms:[],worksWithAnyStore:true,pricing:null,pricingUrl:null,website:'https://example.com',url:'https://ecompick.com/tools/sample',alternativeSlugs:[],checkedAt:null,logoUrl:null};
test('SDK initialize, discovery, all six calls and error behavior',async()=>{
 const server=createServer(async()=>({tools:[t,{...t,slug:'sample-b'}],categories:[],platforms:[]}));
 const client=new Client({name:'test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{assert.equal((await client.listTools()).tools.length,6);for(const [name,args]of [['search_tools',{}],['get_tool',{slug:'sample'}],['find_alternatives',{slug:'sample'}],['compare_tools',{slugs:['sample','sample-b']}],['list_tasks',{}],['list_platforms',{}]]){const out=await client.callTool({name,arguments:args});assert.ok(!out.isError,name);assert.ok(out.content.length);}
 assert.equal((await client.callTool({name:'get_tool',arguments:{slug:'missing'}})).isError,true);
 }finally{await client.close();await server.close();}
});
