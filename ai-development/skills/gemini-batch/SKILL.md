---
name: gemini-batch
description: Use when generating content with Google Gemini at scale - provides parallel batch processing, retry logic, output validation, and file caching patterns for Vertex AI
---

# Gemini CLI

A flexible standalone CLI tool for Google Vertex AI Gemini models. Supports single prompts, file attachments (images, PDFs, text), batch processing with parallel execution, and **image generation with Nano Banana 2** (Gemini's image generation family).

**Script location:** `skills/gemini-batch/gemini-batch.ts`

## Quick Start

```bash
# Simple prompt
skills/gemini-batch/gemini-batch.ts "Explain quantum computing"

# Analyze an image
skills/gemini-batch/gemini-batch.ts -f screenshot.png "Describe this UI"

# Multiple files
skills/gemini-batch/gemini-batch.ts -f before.png -f after.png "Compare these"

# Batch process directory of images
skills/gemini-batch/gemini-batch.ts \
  --batch ./screenshots/ \
  --out ./analysis/ \
  -p prompt.txt

# Generate images with Imagen
skills/gemini-batch/gemini-batch.ts \
  --image "A serene mountain landscape at sunset" \
  --out ./generated-images/
```

## Configuration

Create a `.env` file in the skill directory or set environment variables:

```env
VERTEXAI_PROJECT=your-project-id
VERTEXAI_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./your-credentials.json
```

## Usage Modes

### 1. Single Prompt Mode

```bash
# Inline prompt
gemini-batch.ts "Your prompt here"

# Prompt from file
gemini-batch.ts -p system-prompt.txt

# Prompt from file with additional context
gemini-batch.ts -p system-prompt.txt "Additional instructions"

# From stdin
echo "Your prompt" | gemini-batch.ts --stdin
```

### 2. With File Attachments

```bash
# Single image
gemini-batch.ts -f image.png "Analyze this screenshot"

# Multiple files
gemini-batch.ts -f doc.pdf -f data.json -f image.png "Process these"

# Prompt from file + attachments
gemini-batch.ts -p analysis-prompt.txt -f screenshot.png
```

**Supported file types:**
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- Documents: `.pdf`
- Text: `.txt`, `.md`, `.json`, `.csv`, `.html`, `.xml`

### 3. Batch Mode

Process multiple items in parallel:

```bash
# Directory of files with shared prompt
gemini-batch.ts --batch ./images/ --out ./results/ -p "Analyze this UI"

# Directory with subdirectories (each has its own prompt.txt)
gemini-batch.ts --batch ./tasks/ --out ./results/
```

**Directory Formats:**

Format 1 - Files with shared prompt:
```
images/
  image1.png
  image2.png
  image3.png
```

Format 2 - Subdirectories with individual prompts:
```
tasks/
  task1/
    prompt.txt      # Required: the prompt for this task
    data.json       # Optional: attached file
    screenshot.png  # Optional: attached file
  task2/
    prompt.md
    image.png
```

### 4. Image Generation Mode (Nano Banana)

Generate images from text prompts using Google's Nano Banana image models:

```bash
# Basic image generation
skills/gemini-batch/gemini-batch.ts \
  --image "A cute robot reading a book" \
  --out ./images/

# Multiple images with custom aspect ratio
skills/gemini-batch/gemini-batch.ts \
  --image "Cyberpunk city at night" \
  --out ./art/ \
  --count 4 \
  --aspect 16:9

# Wide aspect ratio for banners
skills/gemini-batch/gemini-batch.ts \
  --image "Abstract geometric patterns" \
  --out ./art/ \
  --aspect 16:9
```

**Image Generation Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--image <prompt>` | Generate images from text prompt | - |
| `--imagen-model <name>` | Image model name | `gemini-3.1-flash-image-preview` (Nano Banana 2) |
| `--count <n>` | Number of images (1-4) | `1` |
| `--aspect <ratio>` | Aspect ratio: `1:1`, `3:4`, `4:3`, `9:16`, `16:9` | `1:1` |

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --prompt <file>` | Read prompt from file | - |
| `-f <file>` | Attach file (can use multiple times) | - |
| `--stdin` | Read prompt from stdin | - |
| `--batch <dir>` | Input directory for batch processing | - |
| `--out <dir>` | Output directory for results | - |
| `--model <name>` | Gemini model name | `gemini-3.1-pro-preview` |
| `--temperature <n>` | Temperature (0-2) | `0.7` |
| `--max-tokens <n>` | Max output tokens | `65536` |
| `--workers <n>` | Parallel workers for batch | `5` |
| `--no-cache` | Don't skip existing outputs | - |
| `--quiet` | Suppress progress output | - |
| `--json` | Output results as JSON | - |
| `-h, --help` | Show help | - |

## Examples

### UI Screenshot Analysis

```bash
# Take screenshots with Playwright MCP, then batch analyze:
skills/gemini-batch/gemini-batch.ts \
  --batch ./screenshots/ \
  --out ./analysis/ \
  -p ui-analysis-prompt.txt \
  --temperature 0.3 \
  --workers 4
```

### Code Review

```bash
skills/gemini-batch/gemini-batch.ts \
  -f src/component.tsx \
  -f src/types.ts \
  "Review this code for potential bugs and improvements"
```

### Document Analysis

```bash
skills/gemini-batch/gemini-batch.ts \
  -f report.pdf \
  "Summarize the key findings in this document"
```

### Multi-model Comparison

```bash
# Pro model for complex analysis
skills/gemini-batch/gemini-batch.ts \
  --model gemini-2.5-pro \
  -f data.json \
  "Detailed analysis"

# Flash model for quick tasks
skills/gemini-batch/gemini-batch.ts \
  --model gemini-2.5-flash \
  "Quick summary of $(cat article.txt)"
```

## Output

### Single Prompt Mode
- Output is printed to stdout
- Use `--json` for structured output
- Errors go to stderr

### Batch Mode
- Creates one `.md` file per input in `--out` directory
- File names match input IDs
- Cached results are reused unless `--no-cache` is set

## Model Selection Guide

### Text Models

| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| `gemini-3.1-pro-preview` | Best quality, thinking/reasoning (default) | Slower | Higher |
| `gemini-3-flash-preview` | Fast and cheap | Fast | Lower |
| `gemini-2.5-pro` | Legacy, quality | Slower | Higher |
| `gemini-2.5-flash` | Legacy, fast | Fast | Lower |

### Image Models (Nano Banana family)

| Model | Codename | Released | Based On |
|-------|----------|----------|----------|
| `gemini-3.1-flash-image-preview` | **Nano Banana 2** (default) | Feb 2026 | Gemini 3.1 Flash |
| `gemini-3-pro-image-preview` | Nano Banana Pro | Nov 2025 | Gemini 3 Pro |
| `gemini-2.5-flash-image` | Nano Banana (original) | Aug 2025 | Gemini 2.5 Flash |

**Rule of thumb:**
- Use `flash` for: summaries, simple extraction, high volume
- Use `pro` for: image analysis, complex reasoning, quality-critical
- Use Nano Banana 2 for: fast + high quality image generation (best default)
- Use Nano Banana Pro for: maximum image fidelity at higher cost

## Tips

1. **Use `--no-cache` during development** to force re-processing
2. **Set `--temperature 0.3` for analysis tasks** (more deterministic)
3. **Use `--workers 3-5` to avoid rate limits**
4. **Use `--model gemini-2.5-flash` for cost-effective batch jobs**
5. **Use `--json` for programmatic processing** of results

### Image Generation

```bash
# Generate a single image
skills/gemini-batch/gemini-batch.ts \
  --image "A futuristic space station orbiting Earth" \
  --out ./generated/

# Generate multiple variations
skills/gemini-batch/gemini-batch.ts \
  --image "Product photo of a sleek smartphone on a wooden desk" \
  --out ./product-images/ \
  --count 4 \
  --aspect 4:3

# Wide format for banners
skills/gemini-batch/gemini-batch.ts \
  --image "Mountain landscape with aurora borealis" \
  --out ./banners/ \
  --aspect 16:9
```

## Requirements

- **Runtime:** Bun (uses auto-install - no `npm install` needed)
- **Dependencies:** Auto-installed on first run (versions pinned in imports):
  - `@google-cloud/vertexai@^1.10.0`
  - `@google/genai@^1.0.0`
  - `dotenv@^17.0.0`
  - `mime@^4.0.0`
- **Auth:** Google Cloud service account with Vertex AI access
- **Setup:** `.env` file in skill directory with credentials

## How Auto-Install Works

This skill uses [Bun's auto-install feature](https://bun.com/docs/runtime/auto-install) with inline version specifiers:

```typescript
// Versions pinned directly in imports - no package.json needed
import { VertexAI } from "@google-cloud/vertexai@^1.10.0";
import { GoogleGenAI } from "@google/genai@^1.0.0";
```

When you run the script:
1. Bun detects there's no `node_modules` directory
2. It auto-installs dependencies to the global cache (`~/.bun/install/cache`)
3. Versions are pinned inline in import statements for reproducibility
4. Subsequent runs are instant (cached globally)

**No setup required** - just run the script and Bun handles the rest. Single-file, self-contained.
