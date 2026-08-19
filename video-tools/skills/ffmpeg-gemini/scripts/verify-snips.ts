#!/usr/bin/env bun
/**
 * Ground-truth verification of cut boundaries: batch-transcribe every audio
 * snip in a directory in ONE request, with clipped-word markers.
 *
 * Usage: bun verify-snips.ts <snips-dir>
 *
 * Loop (converges in 2–3 rounds):
 *   1. ffmpeg -ss <in> -to <out> -i audio.m4a -c:a aac snips/<name>.m4a
 *   2. bun verify-snips.ts snips/
 *   3. Adjust boundaries ±0.1–0.5s per [CUT-START]/[CUT-END] marker; repeat.
 * Accept when the target phrase is complete; a stray NEXT-word onset at the
 * tail is fine — a 50ms audio fade-out erases it.
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dir = process.argv[2];
if (!dir) { console.error("usage: verify-snips.ts <snips-dir>"); process.exit(2); }
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const parts: object[] = [];
const files = readdirSync(dir).filter(f => /\.(m4a|mp3|wav|aac)$/i.test(f)).sort();
if (files.length === 0) { console.error("no audio snips found"); process.exit(1); }
for (const f of files) {
  parts.push({ text: `SNIP ${f}:` });
  parts.push({ inlineData: { mimeType: "audio/mp4", data: readFileSync(join(dir, f)).toString("base64") } });
}
parts.push({ text: `For EACH snip above, transcribe EXACTLY what is audible, verbatim (original script as spoken). Note if a word is cut off at the start or end (partial word). Format: one line per snip: "<filename> => <verbatim transcription>" plus "[CUT-START]" or "[CUT-END]" markers if words are clipped.` });

const resp = await ai.models.generateContent({
  model: "gemini-3.1-pro-preview",
  contents: [{ role: "user", parts }],
  config: { temperature: 0.1, maxOutputTokens: 8192 },
});
console.log(resp.text);
