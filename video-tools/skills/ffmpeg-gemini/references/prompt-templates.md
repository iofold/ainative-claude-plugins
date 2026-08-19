# Prompt Templates (Gemini video/audio)

Proven templates. Placeholders in `<angle brackets>`. Keep temperature ≤ 0.2 for all analysis calls.

## 1. Per-clip inventory (video @ 10 fps)

> You are a professional video editor's assistant performing a rigorous pre-edit inventory of ONE source clip. The video is attached and is being sampled at 10 frames per second, so you have ~0.1s temporal granularity — use precise timestamps in M:SS.d format. Timestamps must never exceed the clip's actual duration.
>
> Analyze the ENTIRE clip from first frame to last. Return ONLY Markdown with EXACTLY these sections, in this order:
> `## Synopsis` (2–4 sentences) · `## People & Subjects` (appearance detail sufficient to match the same person across other clips; never guess identities) · `## Scene / Shot Segments` (table `# | In | Out | Description | Framing | Camera movement`; no gaps, first In 0:00.0, last Out = clip end) · `## Spoken Content & Audio Cues` (table `Time | Type | Content`; verbatim + translation; note language) · `## Technical Assessment` (lighting, exposure, focus, stability w/ worst timestamps, motion blur, compression, rolling shutter, orientation, audio quality, glitches) · `## Strongest Moments` (`In–Out — why`) · `## Unusable / Weak Portions` (`In–Out — why`) · `## Candidate Cut Points` (`Timestamp — reason`; suggestions only).
>
> Be factual and specific. Mark uncertainty with "(uncertain)". Do not pad.

Caveat: treat this pass's speech table as approximate — see template 3.

## 2. Cross-clip pass (all videos in ONE request, labeled)

Interleave parts: `{text: "VIDEO n: <filename>"}` before each video part. Then:

> You have been given N source clips (labelled VIDEO 1..N with filenames), each sampled at 10 fps. They are candidate material for a single combined edit. Analyze them TOGETHER. Return ONLY Markdown with sections: `## Cross-Clip People Map` (editor-friendly handles, which clips + ranges, match confidence) · `## Duplicate / Overlapping Material` (retakes, same-scene alternates, subsets; cite clips+timestamps; say "none" explicitly) · `## Location & Setting Map` · `## Likely Chronological / Story Order` (visual/audio evidence only — file metadata is absent) · `## Continuity Issues` · `## Open Editorial Questions` (concrete questions).

Caveat: cross-clip passes get per-clip details wrong more often than dedicated passes — use for the map, verify claims against per-clip artifacts.

## 3. Audio-only timestamped transcript (authoritative verbatim)

> Transcribe this audio verbatim with timestamps. Return a Markdown table: `| Time | Type | Content |` where Time is M:SS.d for the START of each sentence/phrase, Type is speech/music/ambient/noise/silence, and Content is the verbatim text (original script) followed by an English translation in parentheses. Cover the ENTIRE audio from 0:00.0 to the end, including trailing silence. Do not invent content.

## 4. Targeted disambiguation (disputed word)

> Listen extremely carefully to this audio. CRITICAL: (1) Does the speaker say "<option A>" or "<option B>" or something else? (2) <second binary question>. (3) What name/organization, if any, is mentioned? (4) Transcribe the full audio verbatim. State your confidence for each answer.

Run when passes disagree on names, numbers, or occasion words. One targeted call beats re-running the full pass.

## 5. Phrase boundary discovery

> For EACH phrase listed below, give the exact START and END time of that spoken phrase with 0.1-second precision, measured from 0:00.0 of this audio. Format strictly: `PHRASE | start_seconds | end_seconds`. Choose boundaries so the phrase is complete but no neighboring words are included. Phrases: 1. <…> 2. <…>

Expect ±0.5–7 s error — always follow with template 6.

## 6. Snip verification (batch, ground truth)

Attach all extracted snips in one request, each preceded by `{text: "SNIP <filename>:"}`:

> For EACH snip above, transcribe EXACTLY what is audible, verbatim. Note if a word is cut off at the start or end (partial word). Format one line per snip: `<filename> => <verbatim>` plus `[CUT-START]` or `[CUT-END]` markers if words are clipped.

Accept a snip when the target phrase is complete; a marked stray onset of the NEXT word is fine (fade-out erases it).

## 7. Structural audit of a finished edit

> Audit this <N>-second video (sampled at 10 fps). Intended structure: <numbered EDL: each element with its phrase/visual>. Report in Markdown: `## Verdict` (PASS/FAIL + one sentence) · `## Sequence check` (each element: present? complete phrase audible, not clipped mid-word? correct order? timestamps) · `## <section> check` · `## Defects` (black frames, freezes, desync, clipped words, loudness jumps) · `## Notes` (max 3 concrete improvements).

**Triage rule:** expect false FAILs where the edit is unconventional (speakers inside group shots, intentional repeats). Verify each finding independently before acting.

## 8. Technical-only audit (stylized edits / small re-checks)

> This is an intentionally <style, e.g. awkward/comedic> edit built with deliberate <zooms/repeats/abrupt ending>. Do NOT judge editorial style — that is the point. Audit ONLY technical execution: (1) black/blank/frozen frames or stutter, (2) A/V desync, (3) zoom/pan that jitters or crops a speaking face fully out, (4) unexpected silent segments, (5) corrupted imagery. Report: `## Verdict` (technical PASS/FAIL, one sentence) · `## Findings` (numbered, timestamped; "none" where clean).
