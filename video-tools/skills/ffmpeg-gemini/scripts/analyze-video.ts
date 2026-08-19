#!/usr/bin/env bun
/**
 * Single-video Gemini analysis at an explicit sampling fps, with retries and
 * verifiable usage logging.
 *
 * Usage:   ANALYZE_FPS=10 bun analyze-video.ts <video.mp4> <prompt.txt> <out.md> [model]
 * Env:     GEMINI_API_KEY (required), ANALYZE_FPS (default 10)
 * Prereq:  run `bun install` in this directory once (avoids Bun inline-install
 *          cache corruption under parallel runs — a real failure mode).
 *
 * Emits a machine-parseable `USAGE {...}` line on stderr. Verify effective fps:
 * VIDEO-modality tokens ≈ duration_s × fps × ~68 (audio folds into VIDEO, ~310 + 32/s).
 * Run once with ANALYZE_FPS=1 on a short clip as a control; ratio should be ≈ fps×.
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync } from "fs";

const [videoPath, promptPath, outPath, modelArg] = process.argv.slice(2);
if (!videoPath || !promptPath || !outPath) {
  console.error("usage: analyze-video.ts <video> <prompt.txt> <out.md> [model]");
  process.exit(2);
}
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("GEMINI_API_KEY not set"); process.exit(2); }
const ai = new GoogleGenAI({ apiKey });
const prompt = readFileSync(promptPath, "utf-8");

console.error(`[upload] ${videoPath}`);
let file = await ai.files.upload({ file: videoPath, config: { mimeType: "video/mp4" } });
const t0 = Date.now();
while (file.state === "PROCESSING") {
  if (Date.now() - t0 > 300_000) { console.error("timeout waiting for ACTIVE"); process.exit(1); }
  await new Promise(r => setTimeout(r, 4000));
  file = await ai.files.get({ name: file.name! });
}
if (file.state !== "ACTIVE") { console.error(`file state: ${file.state}`); process.exit(1); }

const FPS = Number(process.env.ANALYZE_FPS ?? "10");
const models = modelArg ? [modelArg] : ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro"];

let lastErr: unknown = null;
for (const model of models) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.error(`[generate] model=${model} fps=${FPS} attempt=${attempt}`);
      const resp = await ai.models.generateContent({
        model,
        contents: [{
          role: "user",
          parts: [
            { fileData: { fileUri: file.uri!, mimeType: file.mimeType! }, videoMetadata: { fps: FPS } },
            { text: prompt },
          ],
        }],
        config: { temperature: 0.2, maxOutputTokens: 65536 },
      });
      const text = resp.text ?? "";
      if (!text.trim()) throw new Error("empty response text");
      writeFileSync(outPath, text);
      console.error("USAGE " + JSON.stringify({ model, requestedFps: FPS, usage: resp.usageMetadata ?? null }));
      process.exit(0);
    } catch (e) {
      lastErr = e;
      console.error(`[error] ${model}: ${e}`);
      const retriable = /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|overloaded/i.test(String(e));
      if (retriable && attempt < 3) { console.error("[retry] backing off 30s"); await new Promise(r => setTimeout(r, 30_000)); continue; }
      break; // next model
    }
  }
}
console.error(`all models failed: ${lastErr}`);
process.exit(1);
