/**
 * AI Models Reference - March 2026
 *
 * This file contains model definitions, pricing, and Cloudflare AI Gateway configuration.
 * Use as a reference or import directly into your scripts.
 *
 * Official documentation sources:
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 * - OpenAI: https://platform.openai.com/docs/models
 * - Google: https://ai.google.dev/gemini-api/docs/models
 * - xAI: https://docs.x.ai/docs/models
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/models
 */

// =============================================================================
// Types
// =============================================================================

export interface ModelConfig {
  /** Model ID to use in API calls */
  id: string;
  /** Cloudflare AI Gateway provider name */
  gatewayProvider: string;
  /** Full gateway model string: {provider}/{model} */
  gatewayModel: string;
  /** Input price per million tokens (USD) */
  inputPricePerMTok: number;
  /** Output price per million tokens (USD) */
  outputPricePerMTok: number;
  /** Context window size in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutput: number;
  /** Best use cases */
  useCase: string[];
  /** Important notes or limitations */
  notes?: string;
}

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

// =============================================================================
// OpenAI Models
// =============================================================================

export const OPENAI_MODELS = {
  GPT_5_NANO: {
    id: "gpt-5-nano",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5-nano",
    inputPricePerMTok: 0.10,
    outputPricePerMTok: 0.40,
    contextWindow: 128_000,
    maxOutput: 16_384,
    useCase: ["hooks", "scripts", "classification", "extraction"],
    notes: "Cheapest OpenAI model. Supports reasoning (~220ms latency).",
  },
  GPT_5_1: {
    id: "gpt-5.1",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.1",
    inputPricePerMTok: 0.30,
    outputPricePerMTok: 1.20,
    contextWindow: 200_000,
    maxOutput: 32_000,
    useCase: ["balanced", "general", "chat"],
    notes: "Balanced model. No variants (mini/nano/turbo don't exist). ~1700ms latency.",
  },
  GPT_5_2_CHAT: {
    id: "gpt-5.2-chat-latest",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.2-chat-latest",
    inputPricePerMTok: 0.50,
    outputPricePerMTok: 2.00,
    contextWindow: 400_000,
    maxOutput: 16_384,
    useCase: ["low-latency", "chat", "general"],
    notes: "Fast responses (~260ms). NOTE: 'gpt-5.2-instant' does NOT exist - use this ID.",
  },
  GPT_5_2_THINKING: {
    id: "gpt-5.2-thinking",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.2-thinking",
    inputPricePerMTok: 1.75,
    outputPricePerMTok: 14.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["complex-reasoning", "analysis", "research"],
    notes: "Deep reasoning. Use max_completion_tokens (not max_tokens).",
  },
  GPT_5_2_PRO: {
    id: "gpt-5.2-pro",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.2-pro",
    inputPricePerMTok: 5.00,
    outputPricePerMTok: 30.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["maximum-intelligence", "high-stakes", "research"],
    notes: "Supports xhigh reasoning_effort. Responses API only.",
  },
  GPT_5_2_CODEX: {
    id: "gpt-5.2-codex",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.2-codex",
    inputPricePerMTok: 2.00,
    outputPricePerMTok: 10.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["coding", "agentic-tasks", "code-review"],
    notes: "Optimized for agentic coding workflows.",
  },
} as const satisfies Record<string, ModelConfig>;

// =============================================================================
// Anthropic Models
// =============================================================================

export const ANTHROPIC_MODELS = {
  CLAUDE_HAIKU_4_5: {
    id: "claude-haiku-4-5-20251001",
    gatewayProvider: "anthropic",
    gatewayModel: "anthropic/claude-haiku-4-5-20251001",
    inputPricePerMTok: 1.00,
    outputPricePerMTok: 5.00,
    contextWindow: 200_000,
    maxOutput: 64_000,
    useCase: ["fast", "affordable", "classification"],
    notes: "~2500ms latency. Cannot use both temperature AND top_p. Use max_tokens (not max_completion_tokens).",
  },
  CLAUDE_SONNET_4_5: {
    id: "claude-sonnet-4-5-20250929",
    gatewayProvider: "anthropic",
    gatewayModel: "anthropic/claude-sonnet-4-5-20250929",
    inputPricePerMTok: 3.00,
    outputPricePerMTok: 15.00,
    contextWindow: 200_000,
    maxOutput: 64_000,
    useCase: ["balanced", "coding", "analysis"],
    notes: "Previous gen. 1M context with header: context-1m-2025-08-07. Use max_tokens.",
  },
  CLAUDE_SONNET_4_6: {
    id: "claude-sonnet-4-6",
    gatewayProvider: "anthropic",
    gatewayModel: "anthropic/claude-sonnet-4-6",
    inputPricePerMTok: 3.00,
    outputPricePerMTok: 15.00,
    contextWindow: 200_000,
    maxOutput: 64_000,
    useCase: ["balanced", "coding", "analysis"],
    notes: "Latest Sonnet. Successor to Sonnet 4.5. Use max_tokens (not max_completion_tokens).",
  },
  CLAUDE_OPUS_4_5: {
    id: "claude-opus-4-5-20251101",
    gatewayProvider: "anthropic",
    gatewayModel: "anthropic/claude-opus-4-5-20251101",
    inputPricePerMTok: 5.00,
    outputPricePerMTok: 25.00,
    contextWindow: 200_000,
    maxOutput: 64_000,
    useCase: ["complex-reasoning", "research"],
    notes: "Previous gen. Supports effort param (low/medium/high) as alt to budget_tokens.",
  },
  CLAUDE_OPUS_4_6: {
    id: "claude-opus-4-6",
    gatewayProvider: "anthropic",
    gatewayModel: "anthropic/claude-opus-4-6",
    inputPricePerMTok: 5.00,
    outputPricePerMTok: 25.00,
    contextWindow: 200_000,
    maxOutput: 64_000,
    useCase: ["maximum-intelligence", "research", "complex-reasoning"],
    notes: "Latest and most capable Claude model. Use max_tokens (not max_completion_tokens).",
  },
} as const satisfies Record<string, ModelConfig>;

// =============================================================================
// Google Models
// =============================================================================

export const GOOGLE_MODELS = {
  GEMINI_3_FLASH_PREVIEW: {
    id: "gemini-3-flash-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3-flash-preview",
    inputPricePerMTok: 0.20,
    outputPricePerMTok: 0.80,
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    useCase: ["fast", "pro-level", "multimodal"],
    notes: "~4100ms latency. Preview. Token counts include thinking tokens. Use thinking_level (not thinking_budget).",
  },
  GEMINI_3_PRO_PREVIEW: {
    id: "gemini-3-pro-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3-pro-preview",
    inputPricePerMTok: 1.50,
    outputPricePerMTok: 12.00,
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    useCase: ["complex-reasoning", "latest-features", "multimodal"],
    notes: "~7000ms latency. Preview. Token counts include thinking. Pass thought_signatures for multi-turn agents.",
  },
  GEMINI_2_5_FLASH: {
    id: "gemini-2.5-flash",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-flash",
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.60,
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    useCase: ["budget", "long-context", "batch"],
    notes: "~3000ms latency. Production. Cheapest 1M context model.",
  },
  GEMINI_2_5_PRO: {
    id: "gemini-2.5-pro",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-pro",
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10.00,
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    useCase: ["production", "quality", "long-context"],
    notes: "~4000ms latency. Production. 2x input price for >200K tokens.",
  },
} as const satisfies Record<string, ModelConfig>;

// =============================================================================
// xAI Models
// =============================================================================

export const XAI_MODELS = {
  GROK_4_1_FAST: {
    id: "grok-4.1-fast",
    gatewayProvider: "xai",
    gatewayModel: "xai/grok-4.1-fast",
    inputPricePerMTok: 0.20,
    outputPricePerMTok: 0.50,
    contextWindow: 2_000_000,
    maxOutput: 128_000,
    useCase: ["long-context", "budget", "fast"],
    notes: "Largest context window (2M). OpenAI-compatible API.",
  },
  GROK_4: {
    id: "grok-4",
    gatewayProvider: "xai",
    gatewayModel: "xai/grok-4",
    inputPricePerMTok: 3.00,
    outputPricePerMTok: 15.00,
    contextWindow: 256_000,
    maxOutput: 128_000,
    useCase: ["full-capability", "reasoning", "analysis"],
    notes: "Built-in web/X search, code execution ($5/1K calls).",
  },
} as const satisfies Record<string, ModelConfig>;

// =============================================================================
// DeepSeek Models
// =============================================================================

export const DEEPSEEK_MODELS = {
  DEEPSEEK_CHAT: {
    id: "deepseek-chat",
    gatewayProvider: "deepseek",
    gatewayModel: "deepseek/deepseek-chat",
    inputPricePerMTok: 0.07, // cache hit
    outputPricePerMTok: 1.68,
    contextWindow: 64_000,
    maxOutput: 8_192,
    useCase: ["budget", "batch", "simple-tasks"],
    notes: "MIT licensed. Cache miss: $0.56/MTok input. Self-host for free.",
  },
  DEEPSEEK_REASONER: {
    id: "deepseek-reasoner",
    gatewayProvider: "deepseek",
    gatewayModel: "deepseek/deepseek-reasoner",
    inputPricePerMTok: 0.56,
    outputPricePerMTok: 1.68,
    contextWindow: 64_000,
    maxOutput: 8_192,
    useCase: ["reasoning", "chain-of-thought", "analysis"],
    notes: "R1 model. Visible chain-of-thought reasoning.",
  },
} as const satisfies Record<string, ModelConfig>;

// =============================================================================
// All Models (flat export)
// =============================================================================

export const ALL_MODELS = {
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...XAI_MODELS,
  ...DEEPSEEK_MODELS,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/** Get model by use case */
export function getModelForUseCase(
  useCase: string
): ModelConfig | undefined {
  return Object.values(ALL_MODELS).find((m) =>
    m.useCase.includes(useCase)
  );
}

/** Get cheapest model for a minimum context window */
export function getCheapestModel(
  minContext: number = 0
): ModelConfig | undefined {
  return Object.values(ALL_MODELS)
    .filter((m) => m.contextWindow >= minContext)
    .sort((a, b) => a.inputPricePerMTok - b.inputPricePerMTok)[0];
}

/** Get all models sorted by input price */
export function getModelsByPrice(): ModelConfig[] {
  return Object.values(ALL_MODELS).sort(
    (a, b) => a.inputPricePerMTok - b.inputPricePerMTok
  );
}

/** Calculate cost for a request */
export function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMTok;
  return inputCost + outputCost;
}

// =============================================================================
// Quick Reference (for copy-paste)
// =============================================================================

/**
 * Cloudflare AI Gateway model strings (copy-paste ready):
 *
 * IMPORTANT: For Cloudflare AI Gateway /compat endpoint, you MUST use the
 * provider prefix (e.g., "openai/gpt-5-nano" not just "gpt-5-nano").
 * Without the prefix, you'll get "400 Bad format" errors.
 *
 * OpenAI:
 *   openai/gpt-5-nano           (~220ms, cheapest, has reasoning)
 *   openai/gpt-5.1              (~1700ms, balanced - NO variants exist)
 *   openai/gpt-5.2-chat-latest  (~260ms, fast - "gpt-5.2-instant" does NOT exist!)
 *   openai/gpt-5.2-thinking
 *   openai/gpt-5.2-pro
 *   openai/gpt-5.2-codex
 *
 * Anthropic (use max_tokens, not max_completion_tokens):
 *   anthropic/claude-haiku-4-5-20251001   (~2500ms)
 *   anthropic/claude-sonnet-4-6           (latest Sonnet)
 *   anthropic/claude-opus-4-6             (latest Opus - most capable)
 *   anthropic/claude-sonnet-4-5-20250929  (previous gen)
 *   anthropic/claude-opus-4-5-20251101    (previous gen)
 *
 * Google (token counts include thinking tokens):
 *   google-ai-studio/gemini-3-flash-preview  (~4100ms)
 *   google-ai-studio/gemini-3-pro-preview    (~7000ms)
 *   google-ai-studio/gemini-2.5-flash        (~3000ms)
 *   google-ai-studio/gemini-2.5-pro          (~4000ms)
 *
 * xAI:
 *   xai/grok-4.1-fast
 *   xai/grok-4
 *
 * DeepSeek:
 *   deepseek/deepseek-chat
 *   deepseek/deepseek-reasoner
 *
 * Updated: 2026-03-09
 */
