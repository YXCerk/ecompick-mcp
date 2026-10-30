// Run from a stable egress IP. A rotating proxy can spread calls across counters.
import assert from 'node:assert/strict';
const start=Date.now(),colos=new Set();let blocked;
for(let i=1;i<=100;i++){
 const r=await fetch('https://ecompick.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','x-ecompick-check':'rate-limit-acceptance'},body:JSON.stringify({jsonrpc:'2.0',id:i,method:'ping'}),signal:AbortSignal.timeout(10000)});
 await r.arrayBuffer();colos.add(r.headers.get('cf-ray')?.split('-').at(-1));
 if(r.status===429){assert.equal(r.headers.get('retry-after'),'60');blocked=i;break;}
 assert.equal(r.status,200);
 if(Date.now()-start>50000)throw new Error('Rate-limit test exceeded its single-minute observation window.');
}
assert.ok(blocked,'No 429 observed in 100 requests from this egress path.');
console.log(JSON.stringify({requestsUntil429:blocked,elapsedMs:Date.now()-start,colos:[...colos],retryAfter:60}));
