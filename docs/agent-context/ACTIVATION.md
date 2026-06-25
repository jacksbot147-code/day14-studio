# Activating agent-context injection

This is the **one** change that alters live agent behavior, so it's left for you to
apply and push deliberately. Everything else (the compile script, the compiled
context files, the loader module, the CLAUDE.md pointer, the npm script) is
additive and inert until this edit is made.

What it does: prepends the compiled Day14 preamble (identity + prime directives +
role directory, ~300 tokens) to every agent's system prompt, by editing the single
shared LLM chokepoint `scripts/_generic/llm-call.mjs`. Every employee/engine that
calls `llmCall` inherits it automatically.

---

## The edit (2 small changes in `scripts/_generic/llm-call.mjs`)

**1. Add the import** next to the existing imports near the top of the file:

```
import { loadAgentPreamble } from "./agent-context.mjs";
```

**2. Inject the preamble** at the start of `llmCall`. Find this line:

```
export async function llmCall({
  prompt,
  systemPrompt,
  useGrounding = false,
  temperature = 0.6,
  maxTokens = 3000,
  preferAnthropic = false,
  model,
}) {
  const env = await loadEnv();
```

Immediately **after** `const env = await loadEnv();` add:

```
  const _preamble = loadAgentPreamble();
  if (_preamble) systemPrompt = [_preamble, systemPrompt].filter(Boolean).join("\n\n");
```

That's it. `systemPrompt` is a local binding, so reassigning it is safe and flows
into both the Gemini and Anthropic paths below.

---

## Controls

- **Kill switch:** set `DAY14_AGENT_CONTEXT=0` in the environment to disable injection
  globally without reverting code.
- **Per-call opt-out:** for a call that should stay lean, don't rely on the global —
  the loader is centralized, so use the env switch, or add a `noContext` guard if you
  want finer control later.

## Keeping context fresh

The compiled files are generated from the Obsidian vault. After editing the vault:

```
npm run context:compile
```

This rewrites `docs/agent-context/AGENT-CONTEXT.md` and `agent-preamble.md`. It is NOT
wired into `npm run build` on purpose (a missing vault should never break a build). Add
it to the build chain yourself only if the vault is always present on the mini.

---

## Review, verify, commit, push (your gate)

Stage only the intended paths (pollers dirty other files concurrently):

```
cd ~/Documents/studio
git status
git add docs/agent-context scripts/compile-agent-context.mjs scripts/_generic/agent-context.mjs package.json CLAUDE.md
```

If you applied the llm-call edit, also:

```
git add scripts/_generic/llm-call.mjs
node --check scripts/_generic/llm-call.mjs
```

Verify, commit, and push:

```
npm run context:compile
git diff --cached --stat
git commit -m "agent-context: wire Obsidian vault into agent runtime + CLAUDE.md"
git push
```

Then a quick smoke test — run one employee and confirm its output still looks right
and that it's now business-aware:

```
node scripts/employees/cfo-agent.mjs
```
