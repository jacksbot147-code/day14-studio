# Hermes Agent × Day14 OS — integration kit (phase 3, optional)

Hermes itself is $0 (MIT, self-hosted, no telemetry). Only cost is model
tokens, which this setup minimizes. Defer entirely if you want $0 — the
Telegram poller already covers messaging.

## 1. Install (on the Mac, or a $5 VPS)

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.zshrc
hermes setup        # wizard: provider, model, gateway
```

## 2. Wire Hermes to Day14 via MCP

Day14's MCP server (`npm run mcp` in ~/Documents/studio) exposes:
list_skills, get_skill, get_customer, search_customers,
query_work_register, run_skill (read-only allowlist), queue_jack_tap,
system_health. Register it as an MCP server in Hermes — stdio command:

```
command: npx
args: ["tsx", "scripts/mcp-server.mjs"]
cwd: /Users/jcboppington/Documents/studio
```

Exact config location: see https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
(format may differ by version — `hermes doctor` validates).

## 3. Cost controls

- `hermes model` → pick a cheap default. Gateway chatter doesn't need a
  frontier model: claude-haiku via Anthropic key, or a low-cost OpenRouter
  model. Switch per-conversation with `/model`.
- Real work routes through Day14 skills — the 6 hand-coded ones cost zero
  tokens. Hermes is a thin gateway, not the brain.
- `/usage` and `/compress` keep context (and spend) down on long threads.
- Disable tools you don't need (`hermes tools`) — fewer tools = smaller
  system prompt = cheaper turns.

## 4. Governance (non-negotiable, mirrors CLAUDE.md)

- Hermes gets NO Stripe/Resend/Supabase keys. Only the MCP server.
- All consequential actions go through `queue_jack_tap` → you approve in
  /admin/inbox. `run_skill` is hard-allowlisted to read-only analyzers
  (uptime-monitor, customer-ltv-calculator, churn-risk-scorer) in
  scripts/mcp-server.mjs — Hermes cannot widen it.
- Day14's audit log records every MCP call (source: "mcp").
- Don't port Day14's SKILL.mds into Hermes' skill system wholesale —
  they're governance specs, not Hermes skills. Hermes' own learned skills
  live in ~/.hermes/skills and stay separate.

## 5. Replacing telegram-poller (only when ready)

`hermes gateway setup` + `hermes gateway start` takes over Telegram (plus
Discord/Slack/WhatsApp/Signal). Before switching: unload the
telegram-poller LaunchAgent so both aren't consuming the same bot updates.
Keep the poller as fallback until the gateway has run clean for a week.
