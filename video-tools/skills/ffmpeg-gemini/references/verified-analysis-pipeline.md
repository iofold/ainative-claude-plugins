# Verified Video-Analysis Pipeline (Gemini)

Battle-tested on an 18-clip, WhatsApp-sourced editing project (2026-08). Core principle: **verify empirically at every layer — never trust a parameter you set or a timestamp a model returned.**

## 1. High-fps sampling and how to PROVE it

Gemini samples video at 1 fps by default. Request more via the media part:

```ts
{ fileData: { fileUri, mimeType }, videoMetadata: { fps: 10 } }
```

The API never echoes the effective fps. Verify via `usageMetadata`:

- VIDEO-modality prompt tokens ≈ `duration_s × fps × ~68 tokens/frame` (media resolution default; ~62–69 observed). Audio is folded into the VIDEO modality (~310 tokens fixed + ~32/s).
- Run a **1 fps control call** on the shortest clip: the VIDEO-token ratio vs the 10 fps call should be ≈10× (minus the fixed audio component). If it isn't, your fps setting silently didn't take — stop and report, don't proceed.

Log the `USAGE {model, requestedFps, usageMetadata}` line for every call; it doubles as your coverage evidence.

## 2. Two-pass analysis: video pass ≠ transcript

**The 10 fps video pass is strong on visuals (framing, shot segments, motion, defects, timing) but UNRELIABLE for non-English ASR.** Observed failures: invented "PM's 72nd birthday" and "organization foundation day" for clips that plainly said "your 60th birthday"; misheard names and honorifics; both errors *survived a re-run*.

Always run a second, audio-only pass:

```bash
ffmpeg -i src.mp4 -vn -c:a copy audio.m4a   # stream copy → timestamps match source
```

Send as `inlineData` (audio/mp4) with a transcription prompt (see prompt-templates.md). Treat the audio pass as **authoritative for verbatim content**; the video pass owns visuals and shot timing. Reconcile in a per-clip "cross-check note".

For any disputed word (names, numbers, occasion words), run a **targeted disambiguation call**: ask the specific either/or question with confidence. One such call corrected an addressee mishear ("Kartikeya" → "Vijay") that would have cut a clip from the project.

## 3. Frame-accurate cut boundaries: the snip-verify loop

Never cut on a model's first timestamp. Loop until clean:

1. Ask for phrase boundaries (`start | end`, 0.1 s precision) against the audio file.
2. `ffmpeg -ss <start-0.2> -to <end+0.2> -i audio.m4a` → extract the snip.
3. Send all snips in ONE batched request: "transcribe EXACTLY what is audible; mark `[CUT-START]`/`[CUT-END]` if a word is clipped."
4. Adjust ±0.1–0.5 s per marker; re-extract; re-verify. Converges in 2–3 rounds.

Boundary answers can be off by **2–7 seconds** vs sentence-level transcripts — both passes are estimates; only the snip-verify loop is ground truth. A trailing next-word onset ("Aa–") is acceptable: a 50 ms fade-out erases it.

## 4. Look at actual frames

Extract JPEGs and read them (multimodal) at every decision point:

- Confirms content claims (which clip is which, who is where).
- Catches geometry bugs no transcript reveals: baked letterbox bars, pillarboxed grid tiles, bad crops.
- Locates visual comedy/action moments precisely (extract a strip every 5–8 s, pick, then refine).

`cropdetect` beats eyeballing for baked bars — trust its dominant value, then verify with one cropped test frame:

```bash
ffmpeg -ss 5 -t 10 -i in.mp4 -vf cropdetect=20:2:0 -f null - 2>&1 \
  | grep -oE "crop=[0-9:]+" | sort | uniq -c | sort -rn | head -3
```

## 5. Auditing an edit with Gemini: scoping rubric

A full-context "review this final video" audit **will report false FAILs** on anything unconventional (speakers legitimately shown inside group shots; deliberate cringe pacing; repeats). Treat audit output like fallible code review:

- **First audit (structure):** give the full intended EDL/spec and ask per-element present/order/complete-phrase checks with timestamps. Triage every finding against your own ground truth before acting — expect ~1 real finding per 4–5 reported.
- **Re-audits after small changes / stylized edits:** scope to TECHNICAL ONLY — black/frozen frames, A/V desync, clipped words, silence gaps, corrupted imagery — and state explicitly that style is intentional and out of scope.
- Never let an audit finding trigger a rebuild without independently verifying it (frame extract or snip transcribe).

## 6. Operational pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Bun inline-versioned imports (`from "pkg@^1"`) under parallel first runs | `ENOENT ... .bun/install/cache` for transitive deps | Local `package.json` + `bun install`; plain imports; run batches sequentially |
| Parallel Gemini calls on fresh envs | cascade failures | Sequential driver + retry on 429/503 (30 s backoff, 3 attempts), model-fallback chain |
| Trusting `success: true` from delivery CLIs | message silently went nowhere | Check the returned chat/route id matches intent (see hermes JID pitfall) |
| Player-induced "distortion" reports | user sees stretch; frames are fine | Compare SOURCE frame vs OUTPUT frame before any geometry "fix" — Telegram's player misrepresents aspect ratios |
| Genuinely distorted/letterboxed *sources* (WhatsApp re-encodes) | squeeze or bars baked into pixels | cropdetect + crop; only stretch-correct if the user confirms the source truly looks wrong |
| Duplicate transfers of the same file | inflated corpus | md5sum before counting; keep a canonical list |
| No creation-time metadata (WhatsApp strips it) | can't order clips by mtime | Order from content evidence only (clothing, lighting, narrative) |

## 7. Coverage discipline

For N-source projects: keep one artifact per clip (analysis .md + audio transcript + cross-check note + boundary table) and a coverage checklist (N/N rows with fps-verification numbers). Mid-project scope growth (6→16→18 sources here) then costs an increment, not a rebuild.
