---
name: ffmpeg-gemini
description: "Process video files with FFmpeg and analyze them with Gemini AI. Use when extracting clips, taking screenshots at timestamps, splitting long videos, analyzing video content with AI, transcribing/translating speech in video, building timestamped shot inventories, verifying cut points, assembling montages/grid walls from many phone clips, or auditing a finished edit with AI."
---

# FFmpeg + Gemini Video Workflows

Recipes for splitting, extracting, analyzing, and assembling video with FFmpeg and Google Gemini.

**Supporting files** (read the one matching your task before starting):
- `references/verified-analysis-pipeline.md` — the trust-nothing analysis methodology: proving effective fps via token accounting, two-pass video+audio analysis (video passes mishear speech!), the snip-verify loop for frame-accurate cuts, AI-audit scoping rubric, operational pitfalls table.
- `references/montage-editing.md` — conform treatments (cover-crop vs blur-pad), xstack grid walls, zoompan pans/zooms, letterbox removal, loudness normalization, concat assembly, pre-ship QC rubric.
- `references/prompt-templates.md` — proven prompts: per-clip inventory, cross-clip mapping, timestamped transcripts, word disambiguation, phrase boundaries, snip verification, structural + technical-only audits.
- `scripts/` — runnable Bun scripts: `analyze-video.ts` (single video @ explicit fps, retries, USAGE logging), `analyze-multi.ts` (N labeled videos, one request), `gemini-audio.ts` (prompt over audio files), `verify-snips.ts` (batch ground-truth of cut boundaries). Run `bun install` in `scripts/` once first — Bun inline-versioned imports corrupt their cache under parallel first runs.

## 1. Split Long Videos into Segments

```bash
# Lossless split (fast, no re-encode)
ffmpeg -ss 00:10:00 -i input.mp4 -t 00:10:00 -c copy -avoid_negative_ts make_zero segment.mp4

# Auto-split into 10-min chunks
ffmpeg -i input.mp4 -c copy -map 0 -segment_time 600 -f segment -reset_timestamps 1 segment_%03d.mp4

# Optimize for Gemini (downscale to 720p)
ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -crf 23 -c:a aac -b:a 128k optimized.mp4
```

**Key:** `-ss` before `-i` = fast keyframe seek; after = frame-accurate decode. With re-encode output, `-ss` before `-i` IS frame-accurate. `-c copy` = no re-encode.

## 2. Extract Screenshots

```bash
# Single frame
ffmpeg -ss 01:23:45 -i input.mp4 -frames:v 1 frame.png        # PNG (best quality)
ffmpeg -ss 01:23:45 -i input.mp4 -frames:v 1 -q:v 2 frame.jpg # JPEG (smaller)

# One frame every 30 seconds
ffmpeg -i input.mp4 -vf "fps=1/30" -q:v 2 frames/frame_%04d.jpg
```

Extract frames and actually LOOK at them (multimodal read) at every editing decision point — it catches baked letterboxes, bad crops, and locates action moments faster than any transcript.

## 3. Gemini Video Analysis

**Timestamp format:** `MM:SS` (<1h) or `H:MM:SS`. Default sampling is 1 fps; request more via `videoMetadata: { fps: N }` on the video part (up to 24). **The API never echoes the effective fps — verify it via usage tokens** (≈68 VIDEO tokens/frame; run a 1 fps control call and compare). See `references/verified-analysis-pipeline.md` §1.

```bash
ANALYZE_FPS=10 bun scripts/analyze-video.ts clip.mp4 prompt.txt out.md
```

**Speech is the weak spot:** a 10 fps *video* pass is excellent on visuals/timing but unreliable at non-English ASR (it has invented entire wrong occasions). For verbatim content, always run an audio-only pass and treat it as authoritative:

```bash
ffmpeg -i clip.mp4 -vn -c:a copy audio.m4a     # stream copy keeps source timestamps
bun scripts/gemini-audio.ts transcript-prompt.txt audio.m4a
```

Disputed words (names/numbers) → one targeted disambiguation call (template in `references/prompt-templates.md` §4).

## 4. Frame-Accurate Cutting on Speech

Never cut on a model's first timestamp (boundary answers can be off by seconds). Use the snip-verify loop: extract candidate snip → `bun scripts/verify-snips.ts snips/` (batch verbatim + `[CUT-START]`/`[CUT-END]` markers) → adjust ±0.1–0.5 s → repeat until clean. A stray next-word onset at the tail is fine — a 50 ms fade-out erases it. Details: `references/verified-analysis-pipeline.md` §3.

## 5. Montage Assembly & AI Audit

Full recipes in `references/montage-editing.md`: per-source conform (cover-crop vs blur-pad), `cropdetect` for baked letterbox bars, per-segment `loudnorm` + micro-fades (phone sources span ~14 dB), `xstack` grid walls, `zoompan` pans/zooms on video, concat-demuxer assembly.

Audit the finished edit with Gemini (templates §7–8) but **triage findings like fallible code review** — full-context audits false-FAIL unconventional edits; scope re-checks to technical-only defects.

## 6. Gemini Limits

| Parameter | Limit |
|---|---|
| Max file size | 2 GB (File API); 100 MB inline |
| Max duration | ~9.5 hours combined |
| Max videos/request | 10 (Gemini 2.5+) |
| Formats | MP4, MOV, AVI, FLV, MPG, WebM, 3GP |
| Max analyzable @1fps | ~63 min (1M context) |
| `videoMetadata.fps` | up to 24 |

**Best practices:** video parts BEFORE the text prompt; MP4/H.264; File API for video (wait for state `ACTIVE`); label multi-video requests (`VIDEO n: <name>` text part before each); sequential batches with 429-retry beat parallel.

## 7. Common Workflows

**Full pre-edit inventory of N clips** (per-clip 10 fps pass + audio transcript + cross-clip map):
```bash
for f in clips/*.mp4; do
  ANALYZE_FPS=10 bun scripts/analyze-video.ts "$f" inventory-prompt.txt "analysis/$(basename $f .mp4).md"
  ffmpeg -i "$f" -vn -c:a copy "audio/$(basename $f .mp4).m4a"
done
bun scripts/gemini-audio.ts transcript-prompt.txt audio/*.m4a
ANALYZE_FPS=10 bun scripts/analyze-multi.ts crossclip-prompt.txt map.md clips/*.mp4
```

**Analyze long video (>1h):** split into 10-min chunks (§1), analyze each, merge.

**Find and extract key moments:** request structured JSON timestamps, normalize (`MM:SS` → `HH:MM:SS`), extract clips around them — then snip-verify before any final cut.

## 8. Delivery Notes

- Keep a crf 19 master; deliver a crf 24–25 re-encode when a channel caps size (Telegram bot API ≈ 50 MB → "Request Entity Too Large").
- `-movflags +faststart` for anything sent to chat apps.
- Chat-app players can misrepresent aspect ratio — before "fixing" reported distortion, compare a source frame with an output frame. Preserve original source files untouched; do all work on extracted intermediates.
