---
name: ai-models-gateway
description: |
  This skill should be used when the user asks "which model should I use", "compare model prices", "cheapest LLM", "fastest model", "AI Gateway setup", "unified endpoint", "multi-provider AI", "model fallback", "OpenAI compatible endpoint", or questions about GPT-5.1, GPT-5.2, Claude 4.5, Claude 4.6, Gemini 2.5, Gemini 3 models. Provides model selection guidance, pricing comparisons, and Cloudflare AI Gateway configuration.
---

# AI Models & Cloudflare AI Gateway

## Overview

This skill provides current (2025-2026) AI model information, pricing comparisons, and guidance on using Cloudflare AI Gateway as a unified endpoint for OpenAI, Google, and Anthropic.

**Helper script:** `scripts/lib/openai-helper.ts` - Lightweight OpenAI-compatible client for hooks/scripts

## Reference Files

For detailed information, consult:
- **`references/models.ts`** - TypeScript definitions with all model IDs, gateway strings, pricing, and helper functions
- **`references/api-parameters.md`** - Detailed API parameters, constraints, and provider-specific nuances

## Quick Model Selection

| Use Case | Recommended Model | Price (Input/MTok) | Latency |
|----------|-------------------|-------------------|---------|
| **Cheap & fast** | `gpt-5-nano` | $0.10 | ~220ms |
| **Balanced** | `gpt-5.1`, `gpt-5.2-chat-latest` | $0.30-0.50 | ~260-1700ms |
| **Complex reasoning** | `gpt-5.2-thinking`, `gemini-3-pro-preview` | $1.50-1.75 | ~7000ms |
| **Maximum intelligence** | `gpt-5.2-pro`, `claude-opus-4-6` | $5.00 | varies |
| **Long context (1M+)** | `gemini-2.5-flash` | $0.15 | ~3000ms |
| **Code generation** | `gpt-5.2-codex`, `claude-sonnet-4-6` | $2.00-3.00 | varies |

> **Note:** `gpt-5.2-instant` does NOT exist. Use `gpt-5.2-chat-latest` instead.

## Model Selection Decision Tree

```
Is cost the primary concern?
├── Yes → gpt-5-nano ($0.10)
│
├── Need long context (>200K)?
│   └── gemini-2.5-flash (1M, $0.15)
│
├── Need maximum intelligence?
│   ├── OpenAI → gpt-5.2-pro (xhigh reasoning)
│   └── Anthropic → claude-opus-4-6 (latest, most capable)
│
├── Code/agentic tasks?
│   └── gpt-5.2-codex or claude-sonnet-4-6
│
└── Balanced quality/cost?
    └── gemini-3-pro-preview or claude-sonnet-4-6
```

## Cloudflare AI Gateway

### Why Use It?

- **Single endpoint** for models across OpenAI, Google, and Anthropic
- **Observability:** Logs, analytics, cost tracking
- **Reliability:** Automatic fallbacks, rate limiting
- **Caching:** Reduce costs with response caching

### Endpoint Format

```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat/chat/completions
```

**CRITICAL:** You MUST use `{provider}/{model}` format. Without the provider prefix, you'll get `400 Bad format` errors:
- `openai/gpt-5-nano` (not just `gpt-5-nano`)
- `openai/gpt-5.1` (no variants like mini/nano/turbo exist)
- `openai/gpt-5.2-chat-latest` (not `gpt-5.2-instant` - that doesn't exist!)
- `anthropic/claude-sonnet-4-6`
- `google-ai-studio/gemini-2.5-flash`

### Configuration

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_ID/compat"
});

const response = await client.chat.completions.create({
  model: "openai/gpt-5-nano",  // provider/model format
  messages: [{ role: "user", content: "Hello!" }]
});
```

## Key API Parameter Notes

> **Full details:** See `references/api-parameters.md`

### Critical Differences

| Provider | Token Param | Reasoning Param | Verified Latency |
|----------|-------------|-----------------|------------------|
| OpenAI (all) | `max_completion_tokens` | `reasoning_effort` | 220-1700ms |
| Anthropic | `max_tokens` (required!) | `thinking.budget_tokens` | 2500-5000ms |
| Google (Gemini 3) | `maxOutputTokens` | `thinking_level` | 3000-7000ms |

### Common Constraints

- **OpenAI models:** Use `max_completion_tokens` (not `max_tokens`), supports reasoning tokens
- **Claude 4.5/4.6/Haiku:** Cannot use both `temperature` AND `top_p` - pick one only
- **Gemini 3:** Use `thinking_level` (not `thinking_budget`). Token counts include internal thinking tokens
- **GPT 5.1:** Only `openai/gpt-5.1` exists - no mini/nano/turbo/preview variants

## Helper Script Usage

**Location:** `scripts/lib/openai-helper.ts`

```typescript
import { chat, chatStructured } from './lib/openai-helper.ts';

// Simple chat
const result = await chat("Explain this code", { model: "openai/gpt-5-nano" });

// Structured output
const data = await chatStructured<MyType>(prompt, {
  schema: { type: "object", properties: {...} },
  reasoningEffort: "medium"  // low | medium | high | xhigh
});
```

```bash
# CLI usage
bun scripts/lib/openai-helper.ts "Your prompt"
bun scripts/lib/openai-helper.ts --reasoning high "Complex question"
```

## Cost Optimization

1. **Use nano/flash models** for simple tasks
2. **Enable caching** in AI Gateway for repeated prompts
3. **Batch requests** when possible (50% savings with Anthropic)
4. **Prompt caching** for long system prompts (90% savings)

## Official Documentation

Always verify latest models against these sources:
- [Anthropic Claude Models](https://platform.claude.com/docs/en/about-claude/models/overview)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [Google Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
