---
name: voice-message-transcriber
description: Convert a Telegram voice note (.ogg) into text, then re-feed through telegram-inbound-parser for command routing. Lets Jack operate Day14 from the car. Phase 6 of autonomous architecture.
triggers:
  - "voice memo"
  - "voice note"
  - "transcribe"
  - "audio message"
---

# voice-message-transcriber

> Jack records a voice memo while driving: "approve 42, reject 43,
> draft a reply to Acme Pool saying I'll get back tomorrow."
> This skill turns audio into 3 actionable commands.

## Pipeline

1. Telegram voice attachment arrives → poller saves the .ogg file
2. This skill transcribes via Whisper API (or local whisper.cpp on the Mac mini)
3. Transcribed text re-enters `telegram-inbound-parser`
4. `multi-command-parser` (next skill in the cluster) splits multi-action voice memos
5. Each command routes through `telegram-command-router` independently

## Tooling

### Phase 1 (laptop interim)
Use OpenAI Whisper API:
```ts
const formData = new FormData();
formData.append('file', oggBlob, 'voice.ogg');
formData.append('model', 'whisper-1');
formData.append('language', 'en');

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
  body: formData,
});
const { text } = await res.json();
```

Cost: ~$0.006 per minute. Negligible at Day14's scale (Jack might send 5 voice memos a day = <$0.05/day).

### Phase 2 (Mac mini)
Switch to local `whisper.cpp` for $0 cost + offline operation. Same I/O, different backend.

## Confidence + cleanup

After transcription:
- Strip filler words ("uh", "um", "you know")
- Preserve numbers + commands verbatim
- If confidence < 0.7 (Whisper returns this): reply "Couldn't hear that clearly — can you re-send or type?"

## Integration

Transcribed text writes back to the same inbox file as the original:
```json
{
  "message_id": 123,
  "voice": {
    "file_id": "...",
    "duration": 12,
    "mime_type": "audio/ogg"
  },
  "voice_transcription": "approve 42 reject 43 draft a reply to Acme Pool saying I'll get back tomorrow",
  "voice_confidence": 0.92,
  "received_at": "...",
  "processed": false
}
```

`telegram-inbound-parser` then treats `voice_transcription` like normal text. `multi-command-parser` handles the multi-action split.

## Hard rules

1. **Never auto-act on transcribed commands without confidence ≥ 0.85.** Lower confidence = ask Jack to confirm.
2. **Preserve the audio file for 30 days** for audit. Then archive.
3. **Never send the transcription back to Jack as confirmation.** He knows what he said. Just act.
4. **Always log the transcription** so we can debug bad parses later.
5. **Never transcribe non-Jack voice memos** (allowlist enforced at poller).

## Failure modes

- **Whisper API down**: queue the .ogg; retry every 30s for up to 1 hour; if still failing, surface to Jack "Voice transcription failed — please type your message"
- **Multi-language voice memo**: detect language; if not English, route to operator (Jack speaks English; surface as anomaly)
- **Background noise heavy**: low confidence → ask Jack to re-send

## When invoked
- Any Telegram message with voice attachment
- Manually for testing
- Inside `multi-command-parser` for re-transcription if first pass low confidence

## Logging

`[YYYY-MM-DD HH:MM ET] voice-message-transcriber → voice_id: {id}, duration: {s}s, confidence: {N}, transcription_length: {chars}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('voice-message-transcriber', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'voice-message-transcriber', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
