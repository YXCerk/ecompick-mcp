// SPDX-License-Identifier: MIT
// Public API contract and query engine. No directory data is bundled.
export interface Tool {
  slug: string; name: string; tagline: string; taglineZh: string | null;
  kind: string; category: string; platforms: string[]; worksWithAnyStore: boolean;
  pricing: string | null; pricingUrl: string | null; website: string; url: string;
  alternativeSlugs: string[]; checkedAt: string | null; logoUrl: string | null;
}
export interface Facet { id: string; name: string; description?: string; url: string; count: number; checkedAt: string | null; }
export interface Catalog { tools: Tool[]; categories: Facet[]; platforms: Facet[]; }
const string = (description: string, maxLength = 120) => ({type: 'string', minLength: 1, maxLength, description});
const slug = string('Exact tool slug from search_tools, for example photoroom.');
const object = (properties: Record<string, unknown>, required: string[] = []) => ({type: 'object' as const, properties, required, additionalProperties: false});
const annotations = {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true};
export const toolDefinitions = [
  {name: 'search_tools', description: 'Find published ecommerce tools by text, seller task, platform, pricing type and delivery kind. Filters combine with AND. Returns up to 20 concise matches with EcomPick source links and last checked dates. Any-store tools are included for a platform but are not implied to have native integrations.', inputSchema: object({query: string('Text to match in tool names and English/Chinese taglines.', 200), task: string('Task ID or name from list_tasks, e.g. product-images.'), platform: string('Platform ID or name from list_platforms, e.g. shopify.'), pricing: string('Pricing label: Free, Free plan, Free trial, Paid, Usage based, Contact sales, or the exact catalog label.'), kind: string('Delivery kind: SaaS, AI tool, MCP server, Agent skill, Browser extension, Agentic commerce, API.'), limit: {type: 'integer', minimum: 1, maximum: 20, default: 5, description: 'Maximum results (default 5, maximum 20).'}}), annotations},
  {name: 'get_tool', description: 'Get one published tool by exact slug: tagline, task, platform support, pricing label and official pricing link, website, alternatives, EcomPick source and last checked date. Does not invent prices or ratings.', inputSchema: object({slug}, ['slug']), annotations},
  {name: 'find_alternatives', description: 'Get editorially linked published alternatives to a tool. Returns an empty list when none are documented; does not guess substitutes.', inputSchema: object({slug}, ['slug']), annotations},
  {name: 'compare_tools', description: 'Compare two or three distinct published tools by pricing label, official pricing page, platforms, any-store support and delivery kind. Includes sources and last checked dates; no scores or invented prices.', inputSchema: object({slugs: {type: 'array', items: slug, minItems: 2, maxItems: 3, uniqueItems: true, description: 'Two or three distinct exact tool slugs from search_tools.'}}, ['slugs']), annotations},
  {name: 'list_tasks', description: 'List seller task IDs and names for the task filter, with published tool counts, EcomPick links and the oldest available last checked date among their tools.', inputSchema: object({}), annotations},
  {name: 'list_platforms', description: 'List commerce platform IDs and names for the platform filter. Counts are explicit platform support, excluding tools marked only as any-store. Includes source links and oldest available last checked dates.', inputSchema: object({}), annotations},
];
export class InputError extends Error {}
export function validateArguments(name: string, input: unknown): Record<string, any> {
  const def = toolDefinitions.find(t => t.name === name);
  if (!def) throw new InputError('Unknown tool: ' + name);
  if (input === undefined) input = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Arguments must be an object.');
  const args = input as Record<string, any>, props = def.inputSchema.properties;
  for (const key of Object.keys(args)) if (!Object.hasOwn(props, key)) throw new InputError('Unknown argument: ' + key);
  for (const key of def.inputSchema.required) if (!Object.hasOwn(args, key)) throw new InputError('Missing argument: ' + key);
  for (const [key, value] of Object.entries(args)) {
    const schema = props[key] as any;
    if (schema.type === 'string' && (typeof value !== 'string' || !value.trim() || value.length > schema.maxLength)) throw new InputError('Invalid ' + key + '.');
    if (schema.type === 'integer' && (!Number.isInteger(value) || value < 1 || value > 20)) throw new InputError('limit must be an integer from 1 to 20.');
    if (schema.type === 'array' && (!Array.isArray(value) || value.length < 2 || value.length > 3 || new Set(value).size !== value.length || value.some(s => typeof s !== 'string' || !/^[a-z0-9-]{1,120}$/.test(s)))) throw new InputError('slugs must contain 2 to 3 distinct tool slugs.');
    if (key === 'slug' && !/^[a-z0-9-]{1,120}$/.test(value)) throw new InputError('Invalid slug.');
  }
  return args;
}
const norm = (s: string) => s.normalize('NFKC').toLowerCase().trim();
const ref = (url: string) => {const u = new URL(url); u.searchParams.set('ref', 'mcp'); return u.toString();};
// An explicit projection also protects clients if the remote API adds fields later.
export function present(t: Tool) {
  return {slug:t.slug, name:t.name, tagline:t.tagline, taglineZh:t.taglineZh, kind:t.kind, category:t.category, platforms:t.platforms, worksWithAnyStore:t.worksWithAnyStore, pricing:t.pricing, pricingUrl:t.pricingUrl, website:t.website, url:ref(t.url), alternativeSlugs:t.alternativeSlugs, checkedAt:t.checkedAt, logoUrl:t.logoUrl};
}
export function executeTool(name: string, input: unknown, catalog: Catalog): object {
  const a = validateArguments(name, input);
  const get = (slug: string) => {const t = catalog.tools.find(t => t.slug === slug); if (!t) throw new InputError('Published tool not found: ' + slug); return t;};
  if (name === 'get_tool') return {tool:present(get(a.slug))};
  if (name === 'find_alternatives') {const t = get(a.slug); return {tool:present(t), alternatives:t.alternativeSlugs.flatMap(s => {const alt = catalog.tools.find(t => t.slug === s);return alt ? [present(alt)] : [];})};}
  if (name === 'compare_tools') return {tools:a.slugs.map((s: string) => present(get(s)))};
  if (name === 'list_tasks' || name === 'list_platforms') return {items:(name === 'list_tasks' ? catalog.categories : catalog.platforms).map(f => ({...f, url:ref(f.url)}))};
  const task = a.task && catalog.categories.find(f => [f.id, f.name].some(s => norm(s) === norm(a.task)));
  const platform = a.platform && catalog.platforms.find(f => [f.id, f.name].some(s => norm(s) === norm(a.platform)));
  if (a.task && !task) throw new InputError('Unknown task. Use list_tasks.');
  if (a.platform && !platform) throw new InputError('Unknown platform. Use list_platforms.');
  const words = a.query ? norm(a.query).split(/\s+/) : [];
  const matches = catalog.tools.filter(t => (!task || t.category === task.id) && (!platform || t.worksWithAnyStore || t.platforms.some(p => norm(p) === norm(platform.name))) && (!a.pricing || norm(t.pricing || '') === norm(a.pricing)) && (!a.kind || norm(t.kind) === norm(a.kind)) && words.every((w: string) => norm([t.name,t.slug,t.tagline,t.taglineZh || ''].join(' ')).includes(w)));
  matches.sort((a,b) => Number(norm(b.name) === norm(String(input && (input as any).query || ''))) - Number(norm(a.name) === norm(String(input && (input as any).query || ''))) || a.slug.localeCompare(b.slug));
  return {total:matches.length, tools:matches.slice(0, a.limit ?? 5).map(present)};
}
