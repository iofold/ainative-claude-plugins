# Montage / Multi-Source Editing Recipes (ffmpeg)

For combining heterogeneous phone/WhatsApp sources (mixed resolutions, orientations, VFR 17–60 fps, ~14 dB loudness spread) into one deliverable. All recipes preserve sources; work on extracted intermediates only.

## Conform treatments (pick per source)

```bash
# Portrait-ish source → portrait canvas: cover-crop (no distortion, trims edges)
COVER="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"

# Landscape / square / near-square → portrait canvas: blur-pad (keeps full content)
BLUR="split=2[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,\
boxblur=luma_radius=30:luma_power=2[bg];[b]scale=1080:-2[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,setsar=1"

# Baked letterbox/pillarbox: crop FIRST, then conform
"crop=478:506:0:172,$BLUR"
```

Rules of thumb:
- Cover-crop only when source aspect is within ~25% of target; beyond that faces get cut — blur-pad instead.
- A near-square clip can NEVER fill a wide slot without heavy vertical loss — reassign the slot, don't force it.
- Rotation metadata (`rotation: -90` side data): ffmpeg autorotates on decode; just conform normally.
- Sources with squeezed pixels (bad re-encodes): confirm with the user before applying corrective `scale=iw*K:ih` — the "distortion" may be the player's fault (see pipeline doc).

## Segment extraction (frame-accurate + clean audio)

```bash
ffmpeg -ss <in> -to <out> -i src.mp4 \
  -vf "$COVER" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.04,afade=t=out:st=<dur-0.05>:d=0.05" \
  -ar 48000 -ac 2 -c:v libx264 -preset fast -crf 19 -c:a aac -b:a 160k out.mp4 -y
```

- `-ss` before `-i` IS frame-accurate when re-encoding.
- Per-segment `loudnorm` is mandatory across phone sources; 40/50 ms micro-fades kill cut pops and erase a stray next-word onset at the tail.
- `bc` outputs ".55" (no leading zero) which afade rejects → wrap: `printf "%0.3f"`.

## Grid wall ("Matrix" opener) via xstack

```bash
# 3 small (360x640) / 1 wide (1080x640) / 3 small, portrait 1080x1920 canvas
ffmpeg -i t1.mp4 -i t2.mp4 -i t3.mp4 -i wide.mp4 -i t5.mp4 -i t6.mp4 -i t7.mp4 -i audio.m4a \
 -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v][6:v]xstack=inputs=7:\
layout=0_0|360_0|720_0|0_640|0_1280|360_1280|720_1280,format=yuv420p[v]" \
 -map "[v]" -map 7:a -t 5.0 -c:v libx264 -crf 19 -c:a aac wall.mp4 -y
```

- Tiles pre-conformed to exact slot size, `-an`; ONE clip supplies the audio (map it separately).
- The wide slot wants a true-landscape source (16:9 → 1080×640 is a gentle side-crop). Put the audio-source clip in the biggest slot — seeing the singers sing the soundtrack reads as intentional.
- Skip a tile's first second if the source fades in from black (or crop its baked bars).

## Ken Burns on video (weird pans & zooms)

`crop` cannot animate its output size — use `zoompan` with `pzoom` (previous frame's zoom):

```bash
# Creeping zoom 1.0 → MAX over the clip; INC = (MAX-1)/(dur*30)
zoompan=z='min(pzoom+INC,MAX)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30

# Lateral pan at fixed zoom (on = output frame index; FRAMES = dur*30)
zoompan=z='1.3':d=1:x='(iw-iw/zoom)*min(on/FRAMES,1)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30

# Instant punch-in (static): even dims via trunc; off-center via x weight
crop=trunc(iw/1.3/2)*2:trunc(ih/1.3/2)*2:(iw-ow)*0.25:(ih-oh)/2,scale=1080:1920,setsar=1
```

Apply AFTER the conform so zoompan operates on the final canvas. Comedy grammar that lands: slow creep on frozen smiles/awkward silence; escalating punch-ins on a repeated line (×3); punch framed onto the sight gag; hard cut mid-word as an ending.

## Assembly

```bash
# Uniformly encoded intermediates → concat demuxer → one final re-encode
printf "file 'p01.mp4'\nfile 'p02.mp4'\n..." > concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c:v libx264 -preset medium -crf 19 \
  -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k -ar 48000 -movflags +faststart final.mp4 -y
```

Delivery: Telegram bot API media cap ≈ **50 MB** ("Request Entity Too Large") — re-encode at crf 24–25 for delivery, keep the crf 19 master.

## QC rubric before shipping

1. Frame-extract every treatment type (wall, blur-pad, punch, zoom start+end) and LOOK at them.
2. Durations: `ffprobe` total vs planned EDL sum.
3. Loudness: `volumedetect` on the final (mean −18…−21 dB, max ≤ −1 dB).
4. Gemini technical-only audit (see prompt-templates.md) — triage findings, don't auto-fix.
5. Every planned phrase present & unclipped (the snip-verify loop upstream should guarantee this; the audit double-checks).
