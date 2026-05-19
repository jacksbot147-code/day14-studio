---
name: voice-tts-out
description: Generate audio reply for Telegram when Jack is hands-free (driving, walking). Day14 OS speaks back via OpenAI TTS or macOS `say`. Phase 6 supporting skill.
triggers:
  - "voice reply"
  - "speak back"
  - "TTS"
  - "audio response"
---

# voice-tts-out

> When Jack sends a voice memo, the reply is also audio. Lets him
> stay hands-free start to finish.

## Trigger
Voice-out reply happens when EITHER:
- Jack's last message was a voice memo (return-in-kind)
- Jack has `voice_mode: on` set in `~/Documents/businesses/_shared/telegram/config.json`
- Jack typed `/voice` to toggle voice-on for the next reply

## The TTS pipeline

### Phase 1 — Open AI TTS
```ts
const res = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'tts-1',
    voice: 'alloy', // or 'echo', 'onyx', 'nova', 'shimmer', 'fable'
    input: replyText,
    response_format: 'opus', // Telegram-friendly
  }),
});
const audioBlob = await res.blob();
```

Cost: ~$0.015 / 1000 characters. ~$0.05 per voice reply average.

### Phase 2 — Local TTS (after Mac mini)
Use macOS `say` command piped to AAC/OGG:
```bash
say -v "Samantha" -o /tmp/reply.aiff "Approved card 42. Build resuming."
ffmpeg -i /tmp/reply.aiff /tmp/reply.ogg
```

$0 cost, offline-capable.

## Voice rules

Use `day14-voice` rules tightened for spoken English:
- Even shorter sentences (5-10 words each)
- No em-dashes (don't translate well to speech)
- Numbers spoken out loud ("42" not "card #42")
- No emoji at all
- No file paths or URLs

Example transformations:

| Text reply | Voice reply |
|---|---|
| ✅ Approval card #42 approved. Build resuming in ~5 min. | "Approved card 42. Build resumes in 5 minutes." |
| 🚀 Acme Pool is LIVE at acmepool.com. | "Acme Pool launched. Live at acmepool.com." |
| Stripe webhook fails signature verification. | "Stripe webhook failing. Signature issue. Check Vercel env vars." |

## Sending via Telegram

Upload audio as a voice note (not document):
```ts
const formData = new FormData();
formData.append('chat_id', CHAT_ID);
formData.append('voice', audioBlob, 'reply.ogg');
formData.append('duration', audioBlob.duration);

await fetch(`https://api.telegram.org/bot${TOKEN}/sendVoice`, {
  method: 'POST',
  body: formData,
});
```

Voice notes play inline in Telegram and trigger Jack's headphones if he's wearing them.

## Hard rules

1. **Never voice-out secrets, URLs with tokens, or money amounts > $1000.** Type those instead.
2. **Never voice-out long replies (>200 chars).** Long text replies are better as text.
3. **Always include a text version too** so Jack can re-read if needed. Send voice first, then text.
4. **Never auto-voice without an explicit voice-mode flag or voice-memo trigger.**

## Failure modes

- **TTS API timeout**: fallback to text reply with note "voice generation failed"
- **Audio file too large for Telegram (>20MB)**: split into 2 voice notes; rare for short replies
- **Jack's phone is muted**: he sees the voice note as unread; not Day14's problem

## When invoked
- Inside `telegram-outbound-formatter` if voice-mode is on for this reply
- Manually when Jack runs `/voice` toggle

## Logging

`[YYYY-MM-DD HH:MM ET] voice-tts-out → reply_chars: {N}, voice: {model/voice}, audio_duration: {s}s, cost: ${cost}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('voice-tts-out', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'voice-tts-out', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
