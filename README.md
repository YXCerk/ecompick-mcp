# EcomPick MCP

[![EcomPick](https://ecompick.com/badges/listed-small.svg)](https://ecompick.com)

Find and compare ecommerce tools from your AI assistant using EcomPick's free, read-only directory.

## Remote MCP — ready without installing a package

**URL:** `https://ecompick.com/mcp`
**Transport:** Streamable HTTP
**Authentication:** none. Basic queries are free forever.

The remote service supports protocol versions 2025-11-25, 2025-06-18 and 2025-03-26. It is stateless and returns JSON responses; a standalone GET stream is not offered. There is an approximate limit of 60 requests per IP per minute at each Cloudflare location. Respect HTTP 429 and `Retry-After`.

### Claude Code

```sh
claude mcp add --transport http ecompick https://ecompick.com/mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{"mcpServers":{"ecompick":{"url":"https://ecompick.com/mcp"}}}
```

### ChatGPT and Claude remote connectors

Add `https://ecompick.com/mcp` as a custom MCP connector/app where your account supports remote MCP. Choose no authentication. Availability and the settings UI depend on the client and plan.

## Local stdio server

Requires Node.js 22 or newer.

**npm publication is pending.** After the maintainer publishes `ecompick-mcp`, run:

```sh
npx -y ecompick-mcp
```

Until then, build from this repository:

```sh
git clone https://github.com/YXCerk/ecompick-mcp.git
cd ecompick-mcp
npm ci
npm run build
node dist/cli.js
```

The process reads MCP messages on stdin and writes protocol responses on stdout.

### Claude Desktop

Use `claude_desktop_config.json` with your absolute checkout path:

```json
{"mcpServers":{"ecompick":{"command":"node","args":["/absolute/path/ecompick-mcp/dist/cli.js"]}}}
```

After npm publication, the configuration becomes:

```json
{"mcpServers":{"ecompick":{"command":"npx","args":["-y","ecompick-mcp"]}}}
```

### Claude Code (local)

```sh
claude mcp add --transport stdio ecompick -- node /absolute/path/ecompick-mcp/dist/cli.js
```

### Cursor (local)

```json
{"mcpServers":{"ecompick":{"command":"node","args":["/absolute/path/ecompick-mcp/dist/cli.js"]}}}
```

## Tools

| Tool | Parameters | Result |
| --- | --- | --- |
| `search_tools` | `query?`, `task?`, `platform?`, `pricing?`, `kind?`, `limit?` | Filtered shortlist; default 5, maximum 20 |
| `get_tool` | `slug` | Public details and source links |
| `find_alternatives` | `slug` | Documented, published alternatives |
| `compare_tools` | `slugs` (2–3 distinct values) | Pricing types, platforms and kinds |
| `list_tasks` | none | Task IDs, names and counts |
| `list_platforms` | none | Platform IDs, names and explicit-support counts |

Every tool entry includes an EcomPick detail link with `?ref=mcp` and `checkedAt`, the last editorial verification date (null when unavailable). No scores are generated. A platform-independent tool is not claimed to have a native integration.

Pricing filters use catalog labels such as `Free`, `Free plan`, `Free trial`, `Paid`, `Usage based` or `Contact sales`. Filters combine with AND. Use facet tools for current task/platform IDs. Unknown prices remain unknown; official pricing links are provided.

## Example conversations

**Seller:** “Find product-image tools for my Shopify store with a free plan.”
**Assistant workflow:** `list_tasks()`, `list_platforms()`, then `search_tools({"task":"product-images","platform":"shopify","pricing":"Free plan"})`. Return current matches with dates and sources; if none match, say so.

**Seller:** “What alternatives are listed for this tool?”
**Assistant workflow:** Take the slug from a search result, call `find_alternatives({"slug":"<returned-slug>"})`, and explain the documented differences.

**Seller:** “Compare these two tools.”
**Assistant workflow:** `compare_tools({"slugs":["<first-slug>","<second-slug>"]})`. Compare pricing type, platform coverage and delivery kind without inventing numeric prices or ratings.

## Agent Skill

Copy [`skills/ecompick`](skills/ecompick) to `~/.claude/skills/ecompick` for Claude Code, or your Agent Skills-compatible client's skills directory. It uses the remote MCP tools when available and public JSON otherwise. No MCP installation is required for the JSON path.

## Data and privacy

The directory is **not bundled** in this repository or npm package. The stdio server fetches these read-only endpoints at runtime and caches successful responses for five minutes:

- https://ecompick.com/api/v1/tools.json
- https://ecompick.com/api/v1/categories.json
- https://ecompick.com/api/v1/platforms.json

Local stdio queries are filtered on your machine. The hosted MCP receives query arguments. Clicking an EcomPick result with `ref=mcp` contributes to referral analytics. No seller-account access is needed.

Code is licensed under [MIT](LICENSE). Public data is free to use; cite EcomPick detail pages, do not mirror the entire site and do not resell the directory data. See [data terms](https://ecompick.com/api). Product features and prices can change after the recorded check date.

## Development and publication

```sh
npm ci
npm test
npm run test:live
npm pack --dry-run
```

Tests use synthetic fixtures. CI builds and tests on Node.js 22 and 24. `test:live` checks the deployed remote server and the built stdio server with the official MCP SDK.

To publish the prepared package, the maintainer runs `npm login`, then `npm publish --access public` (complete npm's own account/2FA requirements). Update the publication note above after the package is actually available.
