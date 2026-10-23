---
name: gemini-batch
description: Run Google Gemini prompts, batch-process files, analyze images/PDFs, or generate images. Use when the user needs AI content generation at scale, multi-file analysis, or image generation with Vertex AI.
---

# Gemini CLI

Standalone CLI for Google Vertex AI Gemini models. Single prompts, file attachments, batch processing, and image generation.

**Script:** `skills/gemini-batch/gemini-batch.ts`

## Quick Start

```bash
# Simple prompt
skills/gemini-batch/gemini-batch.ts "Explain quantum computing"

# Analyze files
skills/gemini-batch/gemini-batch.ts -f screenshot.png "Describe this UI"
skills/gemini-batch/gemini-batch.ts -f before.png -f after.png "Compare these"

# Batch process directory
skills/gemini-batch/gemini-batch.ts --batch ./screenshots/ --out ./analysis/ -p prompt.txt

# Generate images (Nano Banana 2)
skills/gemini-batch/gemini-batch.ts --image "A serene mountain landscape" --out ./images/
```

## Configuration

Required env vars: `VERTEXAI_PROJECT`, `VERTEXAI_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS`

**Option A — Inject from vault:**
```bash
vault inject VERTEXAI_PROJECT VERTEXAI_LOCATION GOOGLE_APPLICATION_CREDENTIALS
# Or if vault keys differ from .env names:
vault inject VERTEXAI_PROJECT_MYAPP=VERTEXAI_PROJECT
```

**Option B — Claude Code session env:**
Set in `~/.claude/settings.json` under the `env` key (available as `process.env` automatically).

## Usage Modes

### 1. Single Prompt
```bash
gemini-batch.ts "Your prompt"           # inline
gemini-batch.ts -p system-prompt.txt    # from file
echo "prompt" | gemini-batch.ts --stdin # from stdin
```

### 2. File Attachments
```bash
gemini-batch.ts -f image.png -f doc.pdf "Analyze these"
```
Supported: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.pdf`, `.txt`, `.md`, `.json`, `.csv`, `.html`, `.xml`

### 3. Batch Mode
```bash
# Directory of files + shared prompt
gemini-batch.ts --batch ./images/ --out ./results/ -p "Analyze this UI"

# Subdirectories with individual prompt.txt files
gemini-batch.ts --batch ./tasks/ --out ./results/
```
Output: one `.md` file per input. Cached results reused unless `--no-cache`.

### 4. Image Generation (Nano Banana)
```bash
gemini-batch.ts --image "A cute robot reading a book" --out ./images/
gemini-batch.ts --image "Cyberpunk city" --out ./art/ --count 4 --aspect 16:9
```

## Model Selection

| Model | Use Case | Speed |
|-------|----------|-------|
| `gemini-3.1-pro-preview` | Best quality, reasoning (default) | Slower |
| `gemini-3-flash-preview` | Fast and cheap | Fast |
| `gemini-2.5-pro` | Legacy quality | Slower |
| `gemini-2.5-flash` | Legacy fast | Fast |

**Image models:** `gemini-3.1-flash-image-preview` (Nano Banana 2, default), `gemini-3-pro-image-preview` (max fidelity), `gemini-2.5-flash-image` (original)

**Rule of thumb:** `flash` for volume/speed, `pro` for quality/reasoning, Nano Banana 2 for images.

## Tips

1. `--temperature 0.3` for analysis tasks (more deterministic)
2. `--workers 3-5` to avoid rate limits
3. `--json` for programmatic processing
4. `--no-cache` during development

## Requirements

- **Runtime:** Bun (auto-installs deps, no `npm install` needed)
- **Auth:** Google Cloud service account with Vertex AI access

---

## Reference

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --prompt <file>` | Read prompt from file | - |
| `-f <file>` | Attach file (repeatable) | - |
| `--stdin` | Read prompt from stdin | - |
| `--batch <dir>` | Input directory for batch | - |
| `--out <dir>` | Output directory | - |
| `--model <name>` | Gemini model | `gemini-3.1-pro-preview` |
| `--temperature <n>` | Temperature (0-2) | `0.7` |
| `--max-tokens <n>` | Max output tokens | `65536` |
| `--workers <n>` | Parallel workers | `5` |
| `--no-cache` | Force re-processing | - |
| `--quiet` | Suppress progress | - |
| `--json` | JSON output | - |
| `--image <prompt>` | Generate image from text | - |
| `--imagen-model <name>` | Image model | `gemini-3.1-flash-image-preview` |
| `--count <n>` | Images to generate (1-4) | `1` |
| `--aspect <ratio>` | `1:1`, `3:4`, `4:3`, `9:16`, `16:9` | `1:1` |

### Batch Directory Formats

**Format 1** - Files with shared prompt (pass `-p`):
```
images/
  image1.png
  image2.png
```

**Format 2** - Subdirectories with individual prompts:
```
tasks/
  task1/
    prompt.txt      # Required
    data.json       # Optional attachment
    screenshot.png  # Optional attachment
  task2/
    prompt.md
    image.png
```

### Advanced Examples

```bash
# UI screenshot batch analysis
skills/gemini-batch/gemini-batch.ts \
  --batch ./screenshots/ --out ./analysis/ \
  -p ui-analysis-prompt.txt --temperature 0.3 --workers 4

# Code review with multiple files
skills/gemini-batch/gemini-batch.ts \
  -f src/component.tsx -f src/types.ts \
  "Review this code for potential bugs"

# Multi-model comparison
skills/gemini-batch/gemini-batch.ts --model gemini-2.5-pro -f data.json "Detailed analysis"
skills/gemini-batch/gemini-batch.ts --model gemini-2.5-flash "Quick summary of $(cat article.txt)"
```

### How Auto-Install Works

Uses Bun's auto-install with inline version specifiers (e.g., `import { VertexAI } from "@google-cloud/vertexai@^1.10.0"`). No `package.json` needed — deps cached globally in `~/.bun/install/cache`.
