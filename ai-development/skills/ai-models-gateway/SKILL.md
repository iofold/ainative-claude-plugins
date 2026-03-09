---
name: ai-models-gateway
description: |
  This skill should be used when the user asks "which model should I use", "compare model prices", "cheapest LLM", "fastest model", "AI Gateway setup", "unified endpoint", "multi-provider AI", "model fallback", "OpenAI compatible endpoint", or questions about GPT-5.4, GPT-5, GPT-5-mini, GPT-5-nano, Claude 4.5, Claude 4.6, Gemini 2.5, Gemini 3, Gemini 3.1 models. Provides model selection guidance, pricing comparisons, and Cloudflare AI Gateway configuration.
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

| Use Case | Recommended Model | Price (Input/MTok) | Context |
|----------|-------------------|-------------------|---------|
| **Cheapest** | `gpt-5-nano` | $0.05 | 400K |
| **Budget + 1M context** | `gemini-2.5-flash-lite` | $0.10 | 1M |
| **Balanced** | `gpt-5-mini`, `gemini-2.5-flash` | $0.25-0.30 | 400K-1M |
| **Flagship** | `gpt-5.4`, `gemini-3.1-pro-preview` | $2.00-2.50 | 1M+ |
| **Code/agentic** | `gpt-5`, `claude-sonnet-4-6` | $1.25-3.00 | 200K-400K |
| **Maximum intelligence** | `gpt-5.4-pro`, `claude-opus-4-6` | $5.00-30.00 | 200K-1M |
| **Long context (1M+)** | `gemini-2.5-flash`, `gpt-5.4` | $0.30-2.50 | 1M+ |

## Model Selection Decision Tree

```
Is cost the primary concern?
├── Yes → gpt-5-nano ($0.05) or gemini-2.5-flash-lite ($0.10, 1M context)
│
├── Need long context (>400K)?
│   ├── Budget → gemini-2.5-flash (1M, $0.30)
│   └── Quality → gpt-5.4 (1.05M, $2.50)
│
├── Need maximum intelligence?
│   ├── OpenAI → gpt-5.4-pro ($30, xhigh reasoning)
│   └── Anthropic → claude-opus-4-6 ($5)
│
├── Code/agentic tasks?
│   └── gpt-5 ($1.25) or claude-sonnet-4-6 ($3)
│
└── Balanced quality/cost?
    └── gpt-5-mini ($0.25) or gemini-3-flash-preview ($0.50)
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
- `openai/gpt-5.4` (not just `gpt-5.4`)
- `openai/gpt-5-nano` (cheapest)
- `anthropic/claude-opus-4-6` (latest Claude)
- `google-ai-studio/gemini-3.1-pro-preview` (latest Gemini)
- `google-ai-studio/gemini-2.5-flash` (stable budget)

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
- **GPT-5.4:** 2x input & 1.5x output pricing for prompts >272K tokens
- **Migration:** gpt-5.2 → gpt-5.4, o3 → gpt-5.2 (medium reasoning), o4-mini → gpt-5-mini

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
