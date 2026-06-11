# Env keys checklist — 2026-06-10 (pre-cutover)

All 8 required keys are **missing** from `.env.local` (it currently only has
VERCEL_OIDC_TOKEN and GEMINI_API_KEY). Paste each into
`~/Documents/studio/.env.local` before tonight's Mac mini rsync — **by 6 PM**.

For each: get the value, then append the line shown to `.env.local`.

## STRIPE_SECRET_KEY

Get it: https://dashboard.stripe.com/apikeys → reveal the Secret key (live mode).

```
STRIPE_SECRET_KEY=<paste here>
```

## STRIPE_WEBHOOK_SECRET

Get it: https://dashboard.stripe.com/webhooks → click the day14 webhook
endpoint → reveal the Signing secret (`whsec_...`).

```
STRIPE_WEBHOOK_SECRET=<paste here>
```

## RESEND_API_KEY

Get it: https://resend.com/api-keys → create or reveal an API key.

```
RESEND_API_KEY=<paste here>
```

## ANTHROPIC_API_KEY

Get it: https://console.anthropic.com → Settings → API Keys → create key.

```
ANTHROPIC_API_KEY=<paste here>
```

## TELEGRAM_BOT_TOKEN

Get it: message @BotFather in Telegram → /mybots → your bot → API Token
(or /newbot if not created yet).

```
TELEGRAM_BOT_TOKEN=<paste here>
```

## TELEGRAM_CHAT_ID

Get it: send any message to the bot, then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and read
`message.chat.id` from the JSON.

```
TELEGRAM_CHAT_ID=<paste here>
```

## SUPABASE_SERVICE_ROLE_KEY

Get it: Supabase dashboard → your project → Project Settings → API →
`service_role` key (the secret one, not anon).

```
SUPABASE_SERVICE_ROLE_KEY=<paste here>
```

## ADMIN_PASSWORD

Invent a strong one (password manager generator).

```
ADMIN_PASSWORD=<paste here>
```

---

After pasting all 8 locally, they also need to go into Vercel for prod:
day14-studio project → Settings → Environment Variables (todo-95).
