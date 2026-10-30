import type {Catalog} from './core.js';
export function createCatalogLoader(fetcher: typeof fetch = fetch, ttl = 300_000) {
  let cached: Catalog | undefined, until = 0, pending: Promise<Catalog> | undefined;
  return async (): Promise<Catalog> => {
    if (cached && Date.now() < until) return cached;
    if (pending) return pending;
    pending = (async () => {
      const files = await Promise.all(['tools','categories','platforms'].map(async name => {
        const response = await fetcher('https://ecompick.com/api/v1/' + name + '.json', {signal:AbortSignal.timeout(15_000), headers:{Accept:'application/json','User-Agent':'ecompick-mcp/0.1.0'}});
        if (!response.ok) throw new Error('EcomPick API returned HTTP ' + response.status + '. Try again later.');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Unexpected EcomPick catalog format.');
        return data;
      }));
      cached = {tools:files[0], categories:files[1], platforms:files[2]}; until = Date.now() + ttl;
      return cached;
    })();
    try {return await pending;} finally {pending = undefined;}
  };
}
