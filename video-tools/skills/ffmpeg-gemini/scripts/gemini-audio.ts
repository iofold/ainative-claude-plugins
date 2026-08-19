#!/usr/bin/env bun
/**
 * Run a prompt against one or more audio files (inlineData). Covers the
 * audio-side pipeline: timestamped transcripts, phrase-boundary discovery,
 * targeted word disambiguation.
 *
 * Usage:
 *   bun gemini-audio.ts <prompt.txt> <audio1.m4a> [audio2.m4a ...]
 * Output: <audioN>.out.md next to each input (per-file requests, sequential).
 *
 * Extract audio from video first (stream copy keeps source timestamps):
 *   ffmpeg -i src.mp4 -vn -c:a copy audio.m4a
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync } from "fs";

const [promptPath, ...files] = process.argv.slice(2);
if (!promptPath || files.length === 0) {
  console.error("usage: gemini-audio.ts <prompt.txt> <audio...>");
  process.exit(2);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const prompt = readFileSync(promptPath, "utf-8");

for (const f of files) {
  const b64 = readFileSync(f).toString("base64");
  const resp = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/mp4", data: b64 } }, { text: prompt }] }],
    config: { temperature: 0.1, maxOutputTokens: 16384 },
  });
  const out = f.replace(/\.[^.]+$/, "") + ".out.md";
  writeFileSync(out, resp.text ?? "");
  console.log(`wrote ${out}`);
}
