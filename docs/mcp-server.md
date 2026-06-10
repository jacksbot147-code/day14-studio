# Day14 OS MCP server

A stdio MCP server that exposes the Day14 OS read surface + a governed
execution surface to any MCP client (Claude Desktop, Cowork, Hermes,
anything that speaks the Model Context Protocol over stdio).

Server source: `scripts/mcp-server.mjs` — plain ESM run via **tsx** so it
can import the TypeScript lib (`registry-loader.ts`, `customer-index.ts`,
`skill-runner.ts`, `audit-log-generator.ts`) directly with no build step.

## Run it

```bash
npm run mcp
# equivalent to:
npx tsx scripts/mcp-server.mjs
```

It speaks MCP on stdin/stdout (diagnostics on stderr). Don't pipe anything
else into it.

## Tools

| Tool | Kind | What it does |
|---|---|---|
| `list_skills` | read | Registry search. Args: `query?` (substring over name/description/triggers), `cluster?` (registry `pack` field, or `meta`). |
| `get_skill` | read | Full registry entry for `name` + incoming/outgoing skill-graph edges. |
| `get_customer` | read | Dossier summary for `slug`: 01-brand.json, dossier file list, last 30 lines of 02-status.md. |
| `search_customers` | read | Case-insensitive substring search over the customer index (slug, email, brand fields). |
| `query_work_register` | read | Tail of `_shared/growth/work-register.jsonl`. Args: `since?` (ISO), `type?` (e.g. `error`), `source?`, `limit?` (default 50, max 500). |
| `run_skill` | execute (allowlisted) | Runs ONLY the read-only analyzers: `uptime-monitor`, `customer-ltv-calculator`, `churn-risk-scorer`. Anything else is refused with a pointer to `queue_jack_tap`. |
| `queue_jack_tap` | write (approval queue) | Files an open operator to-do in `~/Documents/businesses/_shared/operator-todos.json` — the same store `/admin/inbox` and the approvals API use. Nothing executes until Jack approves. Dedup-safe. Args: `title`, `body`, `action`. |
| `system_health` | read | Poller heartbeat freshness from `_shared/poller/*-heartbeat.log` (same thresholds as `/dashboard/system`: >10m red, >3m yellow). |

### Governance

- Reads are free. Consequential actions are NOT executable through this
  server — they get queued as Jack-tap approval cards via `queue_jack_tap`.
- Every tool call is logged to the work-register with context `mcp`
  (via `logSkillInvocation`), feeding growth-watcher telemetry.
- `run_skill` and `queue_jack_tap` are additionally audit-logged to the
  hash-chained audit log (`auditLog()` from audit-log-generator).
- The `run_skill` allowlist is hard-coded in `scripts/mcp-server.mjs`
  (`RUN_SKILL_ALLOWLIST`). Extending it is a governance change — Jack-tap
  first.

## Register in Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) and add:

```json
{
  "mcpServers": {
    "day14-os": {
      "command": "npx",
      "args": ["tsx", "/Users/jcboppington/Documents/studio/scripts/mcp-server.mjs"]
    }
  }
}
```

Restart Claude Desktop; the eight `day14-os` tools appear in the tools menu.

If `npx` isn't on Claude Desktop's PATH, point at the repo-local binary
instead:

```json
{
  "mcpServers": {
    "day14-os": {
      "command": "/Users/jcboppington/Documents/studio/node_modules/.bin/tsx",
      "args": ["/Users/jcboppington/Documents/studio/scripts/mcp-server.mjs"]
    }
  }
}
```

## Generic MCP client config

Any client that supports stdio servers needs just:

- **command**: `npx` (or absolute path to `node_modules/.bin/tsx`)
- **args**: `["tsx", "<repo>/scripts/mcp-server.mjs"]`
- **transport**: stdio

Example (Cowork / generic JSON shape):

```json
{
  "name": "day14-os",
  "transport": "stdio",
  "command": "npx",
  "args": ["tsx", "/Users/jcboppington/Documents/studio/scripts/mcp-server.mjs"]
}
```

## Notes

- The server reads live state from `~/Documents/businesses/_shared/` — it
  only makes sense on the Mac where the empire data lives.
- `run_skill` goes through the normal `runSkill()` engine, so allowlisted
  skills hit their hand-coded TypeScript impls (fast, deterministic).
- `queue_jack_tap` items surface in `/admin/inbox` after the next
  empire-state sync (15 min LaunchAgent) and immediately in the
  operator-todos store the approvals API writes back to.
