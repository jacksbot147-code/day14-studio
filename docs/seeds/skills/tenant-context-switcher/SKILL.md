---
name: tenant-context-switcher
description: Telegram /switch command + /tenants list. Sets a 'current tenant' for the agent so subsequent freeform messages route to that tenant's context.
triggers:
  - "/switch"
  - "/tenants"
  - "switch tenant"
  - "current business"
pack: multi-business-operator
---

# tenant-context-switcher

> 'What's MRR?' is ambiguous across 5 businesses.
> /switch ecom-store-1 makes the next 30 minutes scoped to that tenant.

## Commands

```
/tenants                  → list all tenants with status + MRR
/switch {slug}            → set active tenant for this session
/switch off               → clear, go back to multi-business mode
/current                  → show active tenant
```

## State

Active tenant per chat_id stored at:
`~/Documents/businesses/_shared/founder-ops/active-tenant.json`

```json
{
  "{chat_id}": {
    "tenant_slug": "splash-jacks-pools",
    "set_at": "2026-05-17T22:14:00Z",
    "expires_at": "2026-05-17T23:14:00Z"
  }
}
```

Expires after 1 hour of inactivity (forces explicit re-switch).

## Hard rules

1. **Always confirm switch** with a 1-line ack: "Now in: splash-jacks-pools".
2. **Always expire after 1hr** — context drift kills accuracy.
3. **Always show current tenant** in every reply when set.
4. **Always validate slug exists** before switching.
5. **Never auto-switch based on message content** — too risky.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('tenant-context-switcher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'tenant-context-switcher', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
