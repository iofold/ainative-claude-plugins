---
description: "Use when working with video files - extracting clips, taking screenshots at timestamps, analyzing videos with Gemini, or processing video for AI models. Triggers on 'ffmpeg', 'video clip', 'screenshot from video', 'video timestamps', 'analyze video', 'split video', 'video to gemini'."
---

# FFmpeg + Gemini Video Analysis Workflows

Practical recipes for splitting, extracting, and analyzing video with FFmpeg and Google Gemini.

## 1. Creating 10-Minute Snippets from Long Videos

Best practices for splitting videos into segments suitable for Gemini analysis.

**Lossless splitting (fast, no re-encoding):**

```bash
ffmpeg -ss 00:10:00 -i input.mp4 -t 00:10:00 -c copy -avoid_negative_ts make_zero segment.mp4
```

**Automated batch splitting into 10-min chunks:**

```bash
ffmpeg -i input.mp4 -c copy -map 0 -segment_time 600 -f segment -reset_timestamps 1 segment_%03d.mp4
```

**Keyframe-accurate splitting (two-pass):**

```bash
# Force keyframes at cut points first
ffmpeg -i input.mp4 -force_key_frames "00:10:00,00:20:00,00:30:00" -c:v libx264 -preset fast temp.mp4
# Then stream-copy at exact boundaries
ffmpeg -ss 00:10:00 -i temp.mp4 -t 00:10:00 -c copy output.mp4
```

**Key notes:**

- `-ss` before `-i` = fast keyframe seek (may be 1-2 frames off)
- `-ss` after `-i` = frame-accurate (slower, decodes from start)
- `-c copy` = no re-encoding, nearly instant
- MP4 with H.264/AAC is the safest format for Gemini
- `-avoid_negative_ts make_zero` prevents audio sync drift

**Optimizing for Gemini upload (reduce size):**

```bash
# Downscale to 720p and reasonable bitrate
ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -crf 23 -c:a aac -b:a 128k optimized.mp4
```

## 2. Extracting Screenshots at Exact Timestamps

**Single frame (highest quality PNG):**

```bash
ffmpeg -ss 01:23:45 -i input.mp4 -frames:v 1 frame.png
```

**Single frame (JPEG, smaller file):**

```bash
ffmpeg -ss 01:23:45 -i input.mp4 -frames:v 1 -q:v 2 frame.jpg
```

`-q:v` scale: 1=best, 31=worst. Use 2-5 for excellent quality.

**Frame-accurate extraction (slower but exact):**

```bash
ffmpeg -i input.mp4 -ss 01:23:45 -frames:v 1 frame.png
```

**Batch extraction from timestamp list:**

```bash
#!/bin/bash
# timestamps.txt: one per line (HH:MM:SS or MM:SS)
VIDEO="input.mp4"
OUT_DIR="./frames"
mkdir -p "$OUT_DIR"

while IFS= read -r ts; do
  safe_ts=$(echo "$ts" | tr ':' '_')
  ffmpeg -ss "$ts" -i "$VIDEO" -frames:v 1 -q:v 2 "${OUT_DIR}/frame_${safe_ts}.jpg" -y 2>/dev/null
  echo "Extracted frame at $ts"
done < timestamps.txt
```

**Extract a frame every N seconds (for overview):**

```bash
# One frame every 30 seconds
ffmpeg -i input.mp4 -vf "fps=1/30" -q:v 2 frames/frame_%04d.jpg
```

## 3. Getting Timestamps from Gemini Models

**How Gemini returns timestamps:**

- Format: `MM:SS` (videos under 1 hour) or `H:MM:SS` (longer videos)
- Precision: Second-level (no sub-second)
- Default sampling: 1 FPS

**Best prompting strategy - request structured JSON:**

Prompt example:

```
Analyze this video and identify all key moments. Return a JSON array where each element has:
- "timestamp": the MM:SS timestamp
- "description": what is happening
- "category": one of [scene_change, key_action, text_on_screen, speaker_change]
```

**Improving timestamp accuracy:**

- Use the `videoMetadata.fps` parameter to increase sampling rate (up to 24 FPS)
- Higher FPS = more tokens = higher cost, but better precision
- For mostly static content (lectures), fps < 1 saves tokens
- For fast-paced content (sports, demos), use fps=5-10

**Parsing Gemini timestamps for ffmpeg:**

```bash
# Gemini "5:32" -> ffmpeg "00:05:32"
normalize_timestamp() {
  local ts="$1"
  local colons=$(echo "$ts" | tr -cd ':' | wc -c)
  if [ "$colons" -eq 1 ]; then
    echo "00:${ts}"
  elif [ "$colons" -eq 2 ]; then
    printf "%02d:%s" "${ts%%:*}" "${ts#*:}"
  else
    echo "$ts"
  fi
}

# Usage: normalize_timestamp "5:32"  -> "00:05:32"
# Usage: normalize_timestamp "1:23:45" -> "01:23:45"
```

**Full pipeline - Gemini analysis to ffmpeg extraction:**

```bash
# 1. Upload video and get timestamps from Gemini (using gemini-batch CLI)
gemini-batch -f video.mp4 \
  "List all scene changes with timestamps. Return JSON array: [{\"timestamp\": \"MM:SS\", \"description\": \"...\"}]" \
  --json > scenes.json

# 2. Extract timestamps and generate frames
jq -r '.[].timestamp' scenes.json | while read ts; do
  normalized=$(normalize_timestamp "$ts")
  safe_ts=$(echo "$normalized" | tr ':' '_')
  ffmpeg -ss "$normalized" -i video.mp4 -frames:v 1 -q:v 2 "scene_${safe_ts}.jpg" -y 2>/dev/null
done
```

## 4. Gemini Video Limits and Best Practices

| Parameter | Limit |
|---|---|
| Max file size | 2 GB per video |
| Max duration | ~9.5 hours combined per request |
| Max videos per request | 10 (Gemini 2.5+) |
| Supported formats | MP4, MOV, AVI, FLV, MPG, WebM, 3GP |
| Token rate | ~263 tokens/second (~15,780/minute) |
| Context window | 1M tokens |
| Max analyzable duration | ~63 minutes at 1 FPS |

**Upload methods:**

- **Inline** (up to 100MB): Simpler, good for small files
- **File API** (up to 2GB): Required for larger files, files persist 48 hours, reusable across requests

**Best practices:**

1. Place video BEFORE text prompt for better results
2. Split long videos into 10-min segments, analyze each
3. Use MP4/H.264 for widest compatibility
4. Pre-process to 720p if original is 4K (sufficient for analysis, much smaller)
5. Wait for File API upload state to be "ACTIVE" before querying
6. For cost optimization: lower FPS for static content, higher for dynamic

## 5. Common Workflows

**Workflow A: Analyze a long video (>1 hour)**

```bash
# Split into 10-minute chunks
ffmpeg -i long_video.mp4 -c copy -f segment -segment_time 600 -reset_timestamps 1 chunks/chunk_%03d.mp4

# Analyze each chunk with Gemini
for chunk in chunks/chunk_*.mp4; do
  gemini-batch -f "$chunk" -p analyze_prompt.txt --out results/ --quiet
done
```

**Workflow B: Find and extract key moments**

```bash
# 1. Get timestamps from Gemini
gemini-batch -f video.mp4 "List all timestamps where the speaker changes topic. Return as JSON array of {timestamp, topic}" --json > topics.json

# 2. Extract screenshots at each timestamp
jq -r '.[].timestamp' topics.json > timestamps.txt
# Use the batch extraction script from Section 2

# 3. Create clips around each moment (30 seconds before and after)
jq -r '.[].timestamp' topics.json | while read ts; do
  normalized=$(normalize_timestamp "$ts")
  # Calculate 30 seconds before (simplified - may need adjustment for edge cases)
  ffmpeg -ss "$normalized" -i video.mp4 -t 60 -c copy "clip_${normalized//:/_}.mp4" -y 2>/dev/null
done
```

**Workflow C: Generate video summary with thumbnails**

```bash
# 1. Extract one frame every 60 seconds
ffmpeg -i video.mp4 -vf "fps=1/60" -q:v 2 thumbnails/thumb_%04d.jpg

# 2. Send thumbnails to Gemini for captioning
gemini-batch --batch thumbnails/ --out captions/ -p "Describe what's shown in this video frame in one sentence."
```
