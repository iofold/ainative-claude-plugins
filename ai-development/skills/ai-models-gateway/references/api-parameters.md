# API Parameters Reference

Detailed parameter documentation for each AI provider. This covers the nuances, constraints, and correct parameter names for each provider's API.

## OpenAI Parameters

### Token Limits

| Parameter | When to Use | Notes |
|-----------|-------------|-------|
| `max_completion_tokens` | Reasoning models (o-series, GPT-5.2) | **Required** for thinking models |
| `max_tokens` | Legacy/non-reasoning models | Deprecated for reasoning models |

**Important:** Using `max_tokens` with reasoning models will fail. Always use `max_completion_tokens` which includes both reasoning tokens and visible output.

### Reasoning Control

```typescript
// Reasoning effort levels
reasoning_effort: "low" | "medium" | "high" | "xhigh"

// xhigh only available on GPT-5.2 Pro
// Temperature NOT supported with reasoning models
```

| Level | Use Case | Latency |
|-------|----------|---------|
| `low` | Simple tasks, speed priority | Fast |
| `medium` | Balanced reasoning | Moderate |
| `high` | Complex analysis | Slower |
| `xhigh` | Maximum depth (Pro only) | Slowest |

### Structured Output

```typescript
response_format: {
  type: "json_schema",
  json_schema: {
    name: "response_name",
    strict: true,  // Recommended for reliability
    schema: {
      type: "object",
      properties: { ... },
      required: [...],
      additionalProperties: false  // Required for strict mode
    }
  }
}
```

### Tool Calling

```typescript
tools: [{
  type: "function",
  function: {
    name: "function_name",
    description: "What this function does",
    strict: true,  // Enforces schema compliance
    parameters: { ... }
  }
}],
tool_choice: "auto" | "required" | { type: "function", function: { name: "..." } }
```

---

## Anthropic Parameters

### Token Limits

| Parameter | Required | Max Value | Notes |
|-----------|----------|-----------|-------|
| `max_tokens` | **Yes** | 64,000 (4.5 series) | Always required in Messages API |
| | | 128,000 (Sonnet 3.7 with beta) | Requires beta header |

### Extended Thinking

```typescript
// Enable extended thinking
thinking: {
  type: "enabled",
  budget_tokens: 8192  // min 1,024, max 128,000
}

// Opus 4.5 alternative: effort parameter
thinking: {
  type: "enabled",
  effort: "low" | "medium" | "high"
}
```

**Constraints when thinking is enabled:**
- `temperature` is disabled (fixed internally)
- `top_k` is disabled
- `top_p` can only be 0.95-1.0

### Temperature/Top-P Constraint

**Claude 4.5 and Haiku 4.5 cannot use both `temperature` AND `top_p` together.** Pick one:

```typescript
// Option 1: Use temperature only
{ temperature: 0.7 }

// Option 2: Use top_p only
{ top_p: 0.9 }

// INVALID - will error:
{ temperature: 0.7, top_p: 0.9 }
```

### Beta Headers

| Header | Feature | Value |
|--------|---------|-------|
| `anthropic-beta` | 1M context | `context-1m-2025-08-07` |
| `anthropic-beta` | Interleaved thinking | `interleaved-thinking-2025-05-14` |
| `anthropic-beta` | 128K output | `output-128k-2025-02-19` |

Multiple betas: `anthropic-beta: context-1m-2025-08-07,interleaved-thinking-2025-05-14`

### Prompt Caching

```typescript
messages: [{
  role: "user",
  content: [{
    type: "text",
    text: "Long system context here...",
    cache_control: { type: "ephemeral" }  // 90% cost savings
  }]
}]
```

---

## Google Gemini Parameters

### Token Limits

```typescript
generationConfig: {
  maxOutputTokens: 8192,  // Note: camelCase
  temperature: 1.0,       // Default, don't set lower
  topP: 0.95,
  topK: 64
}
```

### Thinking Control (Gemini 3)

**Gemini 3 uses `thinking_level`, NOT `thinking_budget`:**

```typescript
// Gemini 3 Pro - minimum is "low" (cannot disable)
thinking_level: "low" | "high"

// Gemini 3 Flash - has more options
thinking_level: "minimal" | "low" | "medium" | "high"

// Gemini 2.5 (legacy) - uses token count
thinking_budget: 8192  // or -1 for dynamic, 0 to disable
```

**Do NOT mix parameters:** Using both `thinking_budget` and `thinking_level` causes a 400 error.

### Vision Parameters

```typescript
// Control image processing quality
media_resolution: "low" | "medium" | "high" | "ultra_high"
```

| Resolution | Use Case | Token Impact |
|------------|----------|--------------|
| `low` | Quick analysis | Lowest |
| `medium` | General use | Moderate |
| `high` | Detail reading (recommended) | Higher |
| `ultra_high` | Maximum detail | Highest |

### Multi-Turn Reasoning (Thought Signatures)

For agentic workflows, pass `thought_signatures` back to maintain reasoning chains:

```typescript
// Response includes:
{
  thought_signatures: "encrypted_string_here",
  // ... other fields
}

// Next request must include:
{
  thought_signatures: "encrypted_string_here",  // Pass it back
  // ... other fields
}
```

### Grounding with Google Search

```typescript
tools: [{
  google_search: {}  // New parameter name
}]

// Old parameter (deprecated):
// google_search_retrieval: {}
```

**Billing change (Jan 5, 2026):** Per-search-query instead of per-prompt.

---

## xAI Grok Parameters

### OpenAI Compatibility

Grok uses OpenAI-compatible API. Just change:

```typescript
const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1"  // or via Cloudflare Gateway
});
```

### Built-in Tools

```typescript
// Enable web search
tools: [{ type: "web_search" }]

// Enable X (Twitter) search
tools: [{ type: "x_search" }]

// Enable code execution
tools: [{ type: "code_execution" }]

// Pricing: $5 per 1,000 tool calls each
```

### Reasoning Control

```typescript
// Enable/disable reasoning
reasoning: true | false
```

---

## DeepSeek Parameters

### OpenAI Compatibility

DeepSeek uses OpenAI-compatible API:

```typescript
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});
```

### Cache-Based Pricing

| Scenario | Input Price/MTok |
|----------|------------------|
| Cache hit | $0.07 |
| Cache miss | $0.56 |

First request to a new prompt is cache miss. Subsequent identical prompts get cache hits.

### R1 Reasoner

The `deepseek-reasoner` model shows visible chain-of-thought:

```typescript
// Response includes reasoning in content
{
  choices: [{
    message: {
      content: "<think>Step 1: ...</think>\n\nFinal answer: ..."
    }
  }]
}
```

---

## Parameter Quick Reference

### Max Tokens Parameter Names

| Provider | Parameter | Notes |
|----------|-----------|-------|
| OpenAI (reasoning) | `max_completion_tokens` | Required |
| OpenAI (legacy) | `max_tokens` | Deprecated for reasoning |
| Anthropic | `max_tokens` | Always required |
| Google | `generationConfig.maxOutputTokens` | camelCase |
| xAI | `max_tokens` | OpenAI-compatible |
| DeepSeek | `max_tokens` | OpenAI-compatible |

### Reasoning/Thinking Parameters

| Provider | Parameter | Values |
|----------|-----------|--------|
| OpenAI | `reasoning_effort` | low, medium, high, xhigh |
| Anthropic | `thinking.budget_tokens` | 1024-128000 |
| Anthropic (Opus 4.5) | `thinking.effort` | low, medium, high |
| Google (Gemini 3) | `thinking_level` | minimal, low, medium, high |
| Google (Gemini 2.5) | `thinking_budget` | integer or -1 |
| xAI | `reasoning` | true, false |

### Temperature Constraints

| Provider | Constraint |
|----------|------------|
| OpenAI reasoning models | Temperature NOT supported |
| Anthropic extended thinking | Temperature disabled |
| Anthropic 4.5/Haiku | Cannot use temp + top_p together |
| Google Gemini 3 | Keep at 1.0 (avoid low values) |
