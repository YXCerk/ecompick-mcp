import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
for(const mode of ['remote','stdio']){
 const client=new Client({name:'ecompick-check',version:'0.1.0'});
 const transport=mode==='remote'?new StreamableHTTPClientTransport(new URL('https://ecompick.com/mcp'),{requestInit:{headers:{'x-ecompick-check':'acceptance'}}}):new StdioClientTransport({command:process.execPath,args:['dist/cli.js'],stderr:'inherit'});
 try{
  await client.connect(transport);assert.equal((await client.listTools()).tools.length,6);
  const search=await client.callTool({name:'search_tools',arguments:{limit:3}});assert.ok(!search.isError);const found=JSON.parse(search.content[0].text).tools;assert.ok(found.length>=2);
  const cases=[['get_tool',{slug:found[0].slug}],['find_alternatives',{slug:found[0].slug}],['compare_tools',{slugs:found.slice(0,2).map(t=>t.slug)}],['list_tasks',{}],['list_platforms',{}]];
  for(const [name,args]of cases){const out=await client.callTool({name,arguments:args});assert.ok(!out.isError,name);assert.match(JSON.stringify(out),/ref=mcp/);assert.match(JSON.stringify(out),/checkedAt/);}
  console.log(JSON.stringify({mode,tools:6,status:'passed'}));
 }finally{await client.close();}
}
