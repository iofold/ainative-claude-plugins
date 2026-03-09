#!/usr/bin/env bun
/**
 * Gemini CLI - Flexible AI content generation utility
 *
 * A standalone CLI tool for Google Gemini models.
 * Supports single prompts, file attachments (images/docs/videos), batch processing,
 * and directory-based workflows.
 *
 * Usage:
 *   gemini --help                           # Show help
 *   gemini "Your prompt here"               # Simple prompt
 *   gemini -p prompt.txt                    # Prompt from file
 *   gemini -f image.png "Describe this"    # With file attachment
 *   gemini --batch input/ --out output/    # Batch process directory
 *
 * Environment Variables:
 *   GEMINI_API_KEY                  - Gemini API key (preferred)
 *   VERTEXAI_PROJECT                - Google Cloud project ID (fallback: Vertex AI mode)
 *   VERTEXAI_LOCATION               - Vertex AI location (default: us-central1)
 */

// Dependencies with pinned versions (Bun auto-install)
import { GoogleGenAI } from "@google/genai@^1.0.0";
import mime from "mime@^4.0.0";
import { config } from "dotenv@^17.0.0";

// Node.js built-ins (no version needed)
import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
  readdirSync, statSync
} from "fs";
import { join, dirname, resolve, basename, extname } from "path";
import { fileURLToPath } from "url";

// Load .env from script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// ============================================================================
// Types
// ============================================================================

interface GenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  thinkingLevel: string;
}

interface BatchItem {
  id: string;
  prompt: string;
  files: string[];
}

interface BatchResult {
  id: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

interface ImageGenerationConfig {
  sampleCount: number;
  aspectRatio: string;
  personGeneration: string;
  safetyFilterLevel: string;
  addWatermark: boolean;
}

interface ImageResult {
  success: boolean;
  images: string[];  // File paths of saved images
  error?: string;
}

// ============================================================================
// MIME Type Detection
// ============================================================================

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.xml': 'text/xml',
  '.mp4': 'video/mp4',
  '.mkv': 'video/matroska',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

function getMimeType(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function isImageFile(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

function isVideoFile(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();
  return ['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(ext);
}

function isTextFile(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();
  return ['.txt', '.md', '.json', '.csv', '.html', '.xml'].includes(ext);
}

const FILE_API_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB

// ============================================================================
// Gemini Client
// ============================================================================

function initGemini(): GoogleGenAI {
  const project = process.env.VERTEXAI_PROJECT;
  const apiKey = process.env.GEMINI_API_KEY;

  if (project) {
    // Vertex AI mode
    const location = process.env.VERTEXAI_LOCATION || 'us-central1';
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  if (apiKey) {
    // API key mode
    return new GoogleGenAI({ apiKey });
  }

  console.error('Error: No authentication configured.');
  console.error('  Set GEMINI_API_KEY for API key auth, or');
  console.error('  Set VERTEXAI_PROJECT for Vertex AI auth.');
  console.error('  Configure in the .env file alongside this script.');
  process.exit(1);
}

// ============================================================================
// Gemini Image Generation (gemini-3-pro-image-preview)
// ============================================================================

async function generateImages(
  prompt: string,
  imageConfig: ImageGenerationConfig,
  outputDir: string,
  client: GoogleGenAI,
  modelName: string = 'gemini-3-pro-image-preview',
  quiet: boolean = false
): Promise<ImageResult> {
  try {
    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    const savedImages: string[] = [];
    const timestamp = Date.now();

    // Generation config for image output
    const generationConfig = {
      maxOutputTokens: 32768,
      temperature: 1,
      topP: 0.95,
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: imageConfig.aspectRatio,
        imageSize: "1K",
        outputMimeType: "image/png",
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
      ],
    };

    // Generate requested number of images
    for (let i = 0; i < imageConfig.sampleCount; i++) {
      if (!quiet && imageConfig.sampleCount > 1) {
        console.log(`  Generating image ${i + 1}/${imageConfig.sampleCount}...`);
      }

      const response = await client.models.generateContentStream({
        model: modelName,
        config: generationConfig,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });

      // Process streamed response
      for await (const chunk of response) {
        if (!chunk.candidates?.[0]?.content?.parts) {
          continue;
        }

        for (const part of chunk.candidates[0].content.parts) {
          if (part.inlineData) {
            const inlineData = part.inlineData;
            const fileExtension = mime.getExtension(inlineData.mimeType || 'image/png') || 'png';
            const buffer = Buffer.from(inlineData.data || '', 'base64');
            const filename = `gemini-img-${timestamp}-${savedImages.length + 1}.${fileExtension}`;
            const filepath = join(outputDir, filename);
            writeFileSync(filepath, buffer);
            savedImages.push(filepath);

            if (!quiet) {
              console.log(`  Saved: ${filepath}`);
            }
          } else if (part.text && !quiet) {
            // Model returned text (possibly a message about the image)
            console.log(`  ${part.text}`);
          }
        }
      }

      // Small delay between requests if generating multiple
      if (i < imageConfig.sampleCount - 1) {
        await sleep(1000);
      }
    }

    if (savedImages.length === 0) {
      return {
        success: false,
        images: [],
        error: 'No images were generated. The model may have returned text instead of images.'
      };
    }

    return { success: true, images: savedImages };

  } catch (error: any) {
    return {
      success: false,
      images: [],
      error: error.message || 'Image generation failed'
    };
  }
}

// ============================================================================
// Content Generation
// ============================================================================

async function generateContent(
  client: GoogleGenAI,
  modelName: string,
  prompt: string,
  files: string[],
  genConfig: GenerationConfig,
  retries: number = 3
): Promise<{ output: string; error?: string }> {

  // Build content parts
  const parts: any[] = [];

  // Track uploaded files for cleanup
  const uploadedFiles: { name: string }[] = [];

  try {
    // Add file attachments first
    for (const filepath of files) {
      if (!existsSync(filepath)) {
        return { output: '', error: `File not found: ${filepath}` };
      }

      const mimeType = getMimeType(filepath);
      const fileSize = statSync(filepath).size;
      const needsFileApi = isVideoFile(filepath) || fileSize > FILE_API_SIZE_THRESHOLD;

      if (needsFileApi) {
        // Use File API for video files and large files
        let uploadedFile = await client.files.upload({ file: filepath, config: { mimeType } });
        uploadedFiles.push({ name: uploadedFile.name! });
        // Wait for file to become ACTIVE (large videos need processing time)
        let waitAttempts = 0;
        const maxWaitAttempts = 60; // up to 2 minutes
        while (uploadedFile.state === 'PROCESSING' && waitAttempts < maxWaitAttempts) {
          await sleep(2000);
          waitAttempts++;
          const fileStatus = await client.files.get({ name: uploadedFile.name! });
          uploadedFile = { ...uploadedFile, ...fileStatus };
        }
        if (uploadedFile.state !== 'ACTIVE') {
          return { output: '', error: `File upload failed - state: ${uploadedFile.state} for ${filepath}` };
        }
        parts.push({
          fileData: {
            fileUri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType,
          }
        });
      } else if (isImageFile(filepath) || mimeType === 'application/pdf') {
        // Binary files: base64 encode
        const data = readFileSync(filepath);
        parts.push({
          inlineData: {
            mimeType,
            data: data.toString('base64')
          }
        });
      } else if (isTextFile(filepath)) {
        // Text files: include as text
        const content = readFileSync(filepath, 'utf-8');
        const filename = basename(filepath);
        parts.push({
          text: `\n--- File: ${filename} ---\n${content}\n--- End of ${filename} ---\n`
        });
      } else {
        // Unknown: try as base64
        const data = readFileSync(filepath);
        parts.push({
          inlineData: {
            mimeType,
            data: data.toString('base64')
          }
        });
      }
    }

    // Add prompt text
    parts.push({ text: prompt });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Only include thinkingConfig for models that support it
        const supportsThinking = modelName.includes('gemini-3') || modelName === 'gemini-2.5-pro';
        const config: any = {
          temperature: genConfig.temperature,
          maxOutputTokens: genConfig.maxOutputTokens,
          topP: genConfig.topP,
        };
        if (supportsThinking && genConfig.thinkingLevel !== 'OFF') {
          config.thinkingConfig = { thinkingLevel: genConfig.thinkingLevel };
        }

        const response = await client.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts }],
          config,
        });

        const candidate = response.candidates?.[0];

        if (!candidate?.content?.parts) {
          if (attempt === retries) {
            return {
              output: '',
              error: `Invalid response: ${candidate?.finishReason || 'no content'}`
            };
          }
          await sleep(1000 * attempt);
          continue;
        }

        // Extract text, skipping thinking parts
        const textParts: string[] = [];
        for (const part of candidate.content.parts) {
          if ((part as any).thought) {
            // Thinking content - skip
          } else if (part.text) {
            textParts.push(part.text);
          }
        }

        const text = textParts.join('').trim();
        return { output: text };

      } catch (error: any) {
        if (attempt === retries) {
          return { output: '', error: error.message || 'Unknown error' };
        }
        await sleep(1000 * attempt);
      }
    }

    return { output: '', error: 'Max retries exceeded' };

  } finally {
    // Clean up uploaded files
    for (const uploaded of uploadedFiles) {
      try {
        await client.files.delete({ name: uploaded.name });
      } catch {
        // Best effort cleanup
      }
    }
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

async function processBatch(
  items: BatchItem[],
  client: GoogleGenAI,
  modelName: string,
  genConfig: GenerationConfig,
  outputDir: string | null,
  workers: number,
  skipExisting: boolean,
  quiet: boolean
): Promise<BatchResult[]> {

  const results: BatchResult[] = [];
  let completed = 0;
  let skipped = 0;

  if (outputDir) {
    mkdirSync(outputDir, { recursive: true });
  }

  if (!quiet) {
    console.log(`\nProcessing ${items.length} items with ${workers} workers\n`);
  }

  // Process in batches
  for (let i = 0; i < items.length; i += workers) {
    const batch = items.slice(i, i + workers);

    const promises = batch.map(async (item): Promise<BatchResult> => {
      const startTime = Date.now();

      // Check cache
      if (outputDir && skipExisting) {
        const outputPath = join(outputDir, `${item.id}.md`);
        if (existsSync(outputPath)) {
          skipped++;
          return {
            id: item.id,
            success: true,
            output: readFileSync(outputPath, 'utf-8'),
            duration: 0
          };
        }
      }

      // Generate
      const result = await generateContent(client, modelName, item.prompt, item.files, genConfig);
      const duration = Date.now() - startTime;

      // Save output
      if (outputDir && result.output) {
        const outputPath = join(outputDir, `${item.id}.md`);
        writeFileSync(outputPath, result.output, 'utf-8');
      }

      return {
        id: item.id,
        success: !result.error,
        output: result.output,
        error: result.error,
        duration
      };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    completed += batchResults.length;

    if (!quiet) {
      const success = batchResults.filter(r => r.success).length;
      const pct = ((completed / items.length) * 100).toFixed(0);
      const cacheInfo = skipped > 0 ? ` | ${skipped} cached` : '';
      console.log(`[${completed}/${items.length}] ${pct}% | ${success}/${batchResults.length} ok${cacheInfo}`);
    }

    // Rate limit delay
    if (i + workers < items.length) {
      await sleep(500);
    }
  }

  return results;
}

// ============================================================================
// Directory Scanner
// ============================================================================

function scanInputDirectory(inputDir: string, promptFile: string | null): BatchItem[] {
  const items: BatchItem[] = [];

  // Read shared prompt if provided
  let sharedPrompt = '';
  if (promptFile) {
    if (!existsSync(promptFile)) {
      console.error(`Prompt file not found: ${promptFile}`);
      process.exit(1);
    }
    sharedPrompt = readFileSync(promptFile, 'utf-8').trim();
  }

  const entries = readdirSync(inputDir);

  // Check if directory contains subdirectories (grouped items) or files (single items)
  const hasSubdirs = entries.some(e => {
    const path = join(inputDir, e);
    return statSync(path).isDirectory();
  });

  if (hasSubdirs) {
    // Each subdirectory is one batch item
    // Look for prompt.txt/prompt.md and any other files as attachments
    for (const entry of entries) {
      const entryPath = join(inputDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      const files = readdirSync(entryPath);
      let itemPrompt = sharedPrompt;
      const attachments: string[] = [];

      for (const file of files) {
        const filePath = join(entryPath, file);
        if (file === 'prompt.txt' || file === 'prompt.md') {
          itemPrompt = readFileSync(filePath, 'utf-8').trim();
        } else if (!statSync(filePath).isDirectory()) {
          attachments.push(filePath);
        }
      }

      if (!itemPrompt) {
        console.warn(`Skipping ${entry}: no prompt found`);
        continue;
      }

      items.push({
        id: entry,
        prompt: itemPrompt,
        files: attachments
      });
    }
  } else {
    // Each file is one batch item (useful for image analysis)
    if (!sharedPrompt) {
      console.error('When input directory contains files, --prompt is required');
      process.exit(1);
    }

    for (const entry of entries) {
      const filePath = join(inputDir, entry);
      if (statSync(filePath).isDirectory()) continue;

      const id = basename(entry, extname(entry));
      items.push({
        id,
        prompt: sharedPrompt,
        files: [filePath]
      });
    }
  }

  return items.sort((a, b) => a.id.localeCompare(b.id));
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(args: string[]): Map<string, string | boolean | string[]> {
  const result = new Map<string, string | boolean | string[]>();
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];

      if (!next || next.startsWith('-')) {
        result.set(key, true);
      } else {
        result.set(key, next);
        i++;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];

      // Handle -f which can have multiple values
      if (key === 'f') {
        const files: string[] = (result.get('files') as string[]) || [];
        if (next && !next.startsWith('-')) {
          files.push(next);
          result.set('files', files);
          i++;
        }
      } else if (!next || next.startsWith('-')) {
        result.set(key, true);
      } else {
        result.set(key, next);
        i++;
      }
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    result.set('_positional', positional);
  }

  return result;
}

// ============================================================================
// Help
// ============================================================================

function printHelp(): void {
  console.log(`
Gemini CLI - Flexible AI content generation

USAGE:
  gemini [options] [prompt]
  gemini --batch <dir> --out <dir> [options]
  gemini --image "prompt" --out <dir> [options]

SINGLE PROMPT MODE:
  gemini "Explain quantum computing"
  gemini -p prompt.txt
  gemini -f image.png "Describe this image"
  gemini -f doc.pdf -f image.png "Analyze these files"
  echo "prompt" | gemini --stdin

BATCH MODE:
  gemini --batch input/ --out output/
  gemini --batch images/ --out analysis/ -p analyze-prompt.txt

IMAGE GENERATION MODE:
  gemini --image "A cat wearing a top hat" --out ./images/
  gemini --image "Futuristic city" --out ./images/ --count 4 --aspect 16:9

OPTIONS:
  -p, --prompt <file>     Read prompt from file
  -f <file>               Attach file (image, PDF, text, video). Can use multiple times
  --stdin                 Read prompt from stdin
  --batch <dir>           Batch process directory
  --out <dir>             Output directory for results
  --model <name>          Model name (default: gemini-3.1-pro-preview)
  --thinking <level>      Thinking level: MINIMAL, LOW, MEDIUM, HIGH (default: HIGH for pro)
  --temperature <n>       Temperature 0-2 (default: 0.7)
  --max-tokens <n>        Max output tokens (default: 65536)
  --workers <n>           Parallel workers for batch (default: 5)
  --no-cache              Don't skip existing outputs
  --quiet                 Suppress progress output
  --json                  Output results as JSON
  -h, --help              Show this help

IMAGE GENERATION OPTIONS:
  --image <prompt>        Generate images from text prompt
  --imagen-model <name>   Model (default: gemini-3-pro-image-preview)
  --count <n>             Number of images to generate (1-4, default: 1)
  --aspect <ratio>        Aspect ratio: 1:1, 3:4, 4:3, 9:16, 16:9, 2:3, 3:2, 4:5, 5:4, 21:9 (default: 1:1)

MODELS:
  gemini-3.1-pro-preview  Best quality, thinking/reasoning (default)
  gemini-3-flash-preview  Fast and cheap
  gemini-2.5-flash        Legacy, fast
  gemini-2.5-pro          Legacy, quality

BATCH DIRECTORY FORMATS:

  Format 1 - Files with shared prompt:
    images/
      image1.png
      image2.png
    $ gemini --batch images/ --out results/ -p "Analyze this UI"

  Format 2 - Subdirectories with individual prompts:
    tasks/
      task1/
        prompt.txt
        data.json
        screenshot.png
      task2/
        prompt.md
        image.png

ENVIRONMENT:
  GEMINI_API_KEY                  Gemini API key (preferred)
  VERTEXAI_PROJECT                Google Cloud project ID (Vertex AI fallback)
  VERTEXAI_LOCATION               Location (default: us-central1)

EXAMPLES:
  # Simple prompt
  gemini "Write a haiku about coding"

  # Analyze an image
  gemini -f screenshot.png "What UI issues do you see?"

  # Multiple files
  gemini -f before.png -f after.png "Compare these designs"

  # Long prompt from file
  gemini -p system-prompt.txt -f data.json "Process this data"

  # Analyze a video
  gemini -f demo.mp4 "Summarize what happens in this video"

  # Batch analyze images
  gemini --batch ./screenshots/ --out ./analysis/ \\
    -p "Analyze this UI screenshot for accessibility issues"

  # Fast model for simple tasks
  gemini --model gemini-3-flash-preview "Summarize: $(cat article.txt)"

  # Generate images with Gemini
  gemini --image "A serene mountain landscape at sunset" --out ./generated/

  # Generate multiple images
  gemini --image "Cyberpunk city street" --out ./art/ --count 4

  # Control thinking level
  gemini --thinking MINIMAL "Quick answer: what is 2+2?"
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Help
  if (args.has('help') || args.has('h')) {
    printHelp();
    return;
  }

  // Configuration
  const modelName = (args.get('model') as string) || 'gemini-3.1-pro-preview';
  const temperature = parseFloat((args.get('temperature') as string) || '0.7');
  const maxTokens = parseInt((args.get('max-tokens') as string) || '65536');
  const workers = parseInt((args.get('workers') as string) || '5');
  const skipExisting = !args.has('no-cache');
  const quiet = args.has('quiet');
  const jsonOutput = args.has('json');
  const thinkingLevel = (args.get('thinking') as string) || 'HIGH';

  const genConfig: GenerationConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    topP: 0.95,
    thinkingLevel,
  };

  // Initialize client
  const client = initGemini();

  // BATCH MODE
  if (args.has('batch')) {
    const inputDir = args.get('batch') as string;
    const outputDir = args.get('out') as string;
    const promptFile = (args.get('prompt') || args.get('p')) as string | null;

    if (!existsSync(inputDir)) {
      console.error(`Input directory not found: ${inputDir}`);
      process.exit(1);
    }

    if (!outputDir) {
      console.error('--out <dir> is required for batch mode');
      process.exit(1);
    }

    const items = scanInputDirectory(inputDir, promptFile || null);

    if (items.length === 0) {
      console.error('No items found in input directory');
      process.exit(1);
    }

    if (!quiet) {
      console.log('='.repeat(60));
      console.log('  Gemini Batch Processor');
      console.log('='.repeat(60));
      console.log(`  Model:       ${modelName}`);
      console.log(`  Workers:     ${workers}`);
      console.log(`  Temperature: ${temperature}`);
      console.log(`  Max Tokens:  ${maxTokens}`);
      console.log(`  Thinking:    ${thinkingLevel}`);
      console.log(`  Input:       ${inputDir} (${items.length} items)`);
      console.log(`  Output:      ${outputDir}/`);
      console.log('='.repeat(60));
    }

    const startTime = Date.now();
    const results = await processBatch(
      items, client, modelName, genConfig, outputDir, workers, skipExisting, quiet
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (jsonOutput) {
      console.log(JSON.stringify({ results, summary: { total: results.length, successful, failed, duration } }, null, 2));
    } else if (!quiet) {
      console.log('\n' + '='.repeat(60));
      console.log('  Summary');
      console.log('='.repeat(60));
      console.log(`  Total:      ${results.length}`);
      console.log(`  Success:    ${successful}`);
      console.log(`  Failed:     ${failed}`);
      console.log(`  Duration:   ${duration}s`);
      console.log('='.repeat(60));

      if (failed > 0) {
        console.log('\nFailed items:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  ${r.id}: ${r.error}`);
        });
      }
    }

    process.exit(failed > 0 ? 1 : 0);
  }

  // IMAGE GENERATION MODE
  if (args.has('image')) {
    const imagePrompt = args.get('image') as string;
    const outputDir = (args.get('out') as string) || './generated-images';
    const imagenModel = (args.get('imagen-model') as string) || 'gemini-3-pro-image-preview';
    const sampleCount = Math.min(4, Math.max(1, parseInt((args.get('count') as string) || '1')));
    const aspectRatio = (args.get('aspect') as string) || '1:1';

    // Validate aspect ratio
    const validAspects = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '4:5', '5:4', '21:9'];
    if (!validAspects.includes(aspectRatio)) {
      console.error(`Invalid aspect ratio: ${aspectRatio}`);
      console.error(`Valid options: ${validAspects.join(', ')}`);
      process.exit(1);
    }

    if (!imagePrompt || imagePrompt === 'true') {
      console.error('--image requires a prompt');
      console.error('Usage: gemini --image "your prompt" --out ./images/');
      process.exit(1);
    }

    const imageConfig: ImageGenerationConfig = {
      sampleCount,
      aspectRatio,
      personGeneration: 'allow_adult',
      safetyFilterLevel: 'block_some',
      addWatermark: false,
    };

    if (!quiet) {
      console.log('='.repeat(60));
      console.log('  Gemini Image Generation');
      console.log('='.repeat(60));
      console.log(`  Model:       ${imagenModel}`);
      console.log(`  Count:       ${sampleCount}`);
      console.log(`  Aspect:      ${aspectRatio}`);
      console.log(`  Output:      ${outputDir}/`);
      console.log('='.repeat(60));
      console.log(`\nPrompt: "${imagePrompt}"\n`);
    }

    const startTime = Date.now();
    const result = await generateImages(imagePrompt, imageConfig, outputDir, client, imagenModel, quiet);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (jsonOutput) {
      console.log(JSON.stringify({ ...result, duration }));
    } else if (result.success) {
      if (!quiet) {
        console.log('\n' + '='.repeat(60));
        console.log(`  Generated ${result.images.length} image(s) in ${duration}s`);
        console.log('='.repeat(60));
      }
    } else {
      console.error(`\nError: ${result.error}`);
      process.exit(1);
    }

    return;
  }

  // SINGLE PROMPT MODE
  let prompt = '';
  const files: string[] = (args.get('files') as string[]) || [];

  // Get prompt from various sources
  const promptFile = (args.get('prompt') || args.get('p')) as string;
  const positional = args.get('_positional') as string[] | undefined;

  if (args.has('stdin')) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    prompt = Buffer.concat(chunks).toString('utf-8').trim();
  } else if (promptFile) {
    if (!existsSync(promptFile)) {
      console.error(`Prompt file not found: ${promptFile}`);
      process.exit(1);
    }
    prompt = readFileSync(promptFile, 'utf-8').trim();
    // If there's also a positional arg, append it
    if (positional && positional.length > 0) {
      prompt = prompt + '\n\n' + positional.join(' ');
    }
  } else if (positional && positional.length > 0) {
    prompt = positional.join(' ');
  }

  if (!prompt) {
    console.error('No prompt provided');
    console.error('Usage: gemini "your prompt" or gemini -p prompt.txt');
    console.error('Run gemini --help for more options');
    process.exit(1);
  }

  // Validate files exist
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
  }

  if (!quiet && !jsonOutput) {
    const fileInfo = files.length > 0 ? ` with ${files.length} file(s)` : '';
    console.error(`${modelName}${fileInfo} [thinking=${thinkingLevel}]\n`);
  }

  const result = await generateContent(client, modelName, prompt, files, genConfig);

  if (result.error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: result.error }));
    } else {
      console.error(`Error: ${result.error}`);
    }
    process.exit(1);
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ success: true, output: result.output }));
  } else {
    console.log(result.output);
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error.message || error);
  process.exit(1);
});
