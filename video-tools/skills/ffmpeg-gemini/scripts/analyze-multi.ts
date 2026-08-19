#!/usr/bin/env bun
/**
 * Multi-video Gemini analysis in ONE request (cross-clip mapping, dedup,
 * story ordering). Each video part is preceded by a text label "VIDEO n: <basename>"
 * so the prompt can reference clips by number.
 *
 * Usage: ANALYZE_FPS=10 bun analyze-multi.ts <prompt.txt> <out.md> <video1> <video2> ...
 * Note:  ≤10 videos per request (Gemini limit); a 16-video 10fps request ≈ 500k prompt
 *        tokens for ~12.5 min total footage — fits, but budget for it.
 * Caveat: cross-clip passes get per-clip details wrong more often than dedicated
 *        per-clip passes; use for the MAP, verify specifics per clip.
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";

const [promptPath, outPath, ...videos] = process.argv.slice(2);
if (!promptPath || !outPath || videos.length === 0) {
  console.error("usage: analyze-multi.ts <prompt.txt> <out.md> <video...>");
  process.exit(2);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const prompt = readFileSync(promptPath, "utf-8");
const FPS = Number(process.env.ANALYZE_FPS ?? "10");

const parts: object[] = [];
for (let i = 0; i < videos.length; i++) {
  console.error(`[upload ${i + 1}/${videos.length}] ${videos[i]}`);
  let f = await ai.files.upload({ file: videos[i], config: { mimeType: "video/mp4" } });
  const t0 = Date.now();
  while (f.state === "PROCESSING") {
    if (Date.now() - t0 > 300_000) { console.error("timeout"); process.exit(1); }
    await new Promise(r => setTimeout(r, 4000));
    f = await ai.files.get({ name: f.name! });
  }
  if (f.state !== "ACTIVE") { console.error(`state=${f.state}`); process.exit(1); }
  parts.push({ text: `VIDEO ${i + 1}: ${basename(videos[i])}` });
  parts.push({ fileData: { fileUri: f.uri!, mimeType: f.mimeType! }, videoMetadata: { fps: FPS } });
}
parts.push({ text: prompt });

const models = ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro"];
let lastErr: unknown = null;
for (const model of models) {
  try {
    console.error(`[generate] model=${model} fps=${FPS} videos=${videos.length}`);
    const resp = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: { temperature: 0.2, maxOutputTokens: 65536 },
    });
    const text = resp.text ?? "";
    if (!text.trim()) throw new Error("empty response");
    writeFileSync(outPath, text);
    console.error("USAGE " + JSON.stringify({ model, requestedFps: FPS, usage: resp.usageMetadata ?? null }));
    process.exit(0);
  } catch (e) { lastErr = e; console.error(`[error] ${model}: ${e}`); }
}
console.error(`all models failed: ${lastErr}`);
process.exit(1);
