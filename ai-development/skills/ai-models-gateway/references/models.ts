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
  // --- GPT-5.4 family (latest flagship, March 2026) ---
  GPT_5_4: {
    id: "gpt-5.4",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.4",
    inputPricePerMTok: 2.50,
    outputPricePerMTok: 15.00,
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    useCase: ["flagship", "professional", "complex-reasoning"],
    notes: "Latest flagship. 1.05M context. reasoning_effort: none(default)/low/medium/high/xhigh. 2x input & 1.5x output for >272K tokens. Snapshot: gpt-5.4-2026-03-05.",
  },
  GPT_5_4_PRO: {
    id: "gpt-5.4-pro",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.4-pro",
    inputPricePerMTok: 30.00,
    outputPricePerMTok: 180.00,
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    useCase: ["maximum-intelligence", "high-stakes", "research"],
    notes: "Smartest OpenAI model. reasoning_effort: medium/high/xhigh. Responses API only. 2x input & 1.5x output for >272K tokens. Snapshot: gpt-5.4-pro-2026-03-05.",
  },

  // --- GPT-5 family ---
  GPT_5: {
    id: "gpt-5",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5",
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["coding", "agentic-tasks", "reasoning"],
    notes: "Reasoning model for coding/agentic tasks. reasoning_effort: minimal/low/medium/high. Snapshot: gpt-5-2025-08-07.",
  },
  GPT_5_PRO: {
    id: "gpt-5-pro",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5-pro",
    inputPricePerMTok: 15.00,
    outputPricePerMTok: 120.00,
    contextWindow: 400_000,
    maxOutput: 272_000,
    useCase: ["maximum-intelligence", "research", "complex-reasoning"],
    notes: "Highest reasoning. 272K max output. Responses API only. Snapshot: gpt-5-pro-2025-10-06.",
  },
  GPT_5_MINI: {
    id: "gpt-5-mini",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5-mini",
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 2.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["balanced", "cost-efficient", "well-defined-tasks"],
    notes: "Cost-efficient GPT-5 for well-defined tasks. Snapshot: gpt-5-mini-2025-08-07.",
  },
  GPT_5_NANO: {
    id: "gpt-5-nano",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5-nano",
    inputPricePerMTok: 0.05,
    outputPricePerMTok: 0.40,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["hooks", "scripts", "classification", "extraction"],
    notes: "Cheapest & fastest OpenAI model. Supports reasoning. Snapshot: gpt-5-nano-2025-08-07.",
  },

  // --- Previous generation (still available) ---
  GPT_5_2: {
    id: "gpt-5.2",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.2",
    inputPricePerMTok: 1.75,
    outputPricePerMTok: 14.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["complex-reasoning", "analysis"],
    notes: "Previous frontier. reasoning_effort: none(default)/low/medium/high/xhigh. Replaced by gpt-5.4. Snapshot: gpt-5.2-2025-12-11.",
  },
  GPT_5_1: {
    id: "gpt-5.1",
    gatewayProvider: "openai",
    gatewayModel: "openai/gpt-5.1",
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10.00,
    contextWindow: 400_000,
    maxOutput: 128_000,
    useCase: ["coding", "agentic-tasks"],
    notes: "Coding/agentic flagship. reasoning_effort: none(default)/low/medium/high. Snapshot: gpt-5.1-2025-11-13.",
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
  // --- Gemini 3.1 series (latest, March 2026) ---
  GEMINI_3_1_PRO_PREVIEW: {
    id: "gemini-3.1-pro-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3.1-pro-preview",
    inputPricePerMTok: 2.00,
    outputPricePerMTok: 12.00,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["complex-reasoning", "agentic", "multimodal"],
    notes: "Latest Pro. Thinking supported. 2x input & 1.5x output for >200K tokens. Cutoff: Jan 2025.",
  },
  GEMINI_3_1_FLASH_LITE_PREVIEW: {
    id: "gemini-3.1-flash-lite-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3.1-flash-lite-preview",
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 1.50,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["budget", "high-frequency", "lightweight"],
    notes: "Most cost-efficient Gemini. Thinking supported. March 2026.",
  },

  // --- Gemini 3.0 series ---
  GEMINI_3_FLASH_PREVIEW: {
    id: "gemini-3-flash-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3-flash-preview",
    inputPricePerMTok: 0.50,
    outputPricePerMTok: 3.00,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["fast", "pro-level", "multimodal"],
    notes: "Pro-level intelligence at Flash speed/price. Thinking supported. Free tier for <=200K tokens.",
  },
  GEMINI_3_PRO_PREVIEW: {
    id: "gemini-3-pro-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3-pro-preview",
    inputPricePerMTok: 2.00,
    outputPricePerMTok: 12.00,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["complex-reasoning", "multimodal"],
    notes: "DEPRECATED - use gemini-3.1-pro-preview instead. 2x input & 1.5x output for >200K tokens.",
  },

  // --- Gemini 2.5 series (stable/production) ---
  GEMINI_2_5_PRO: {
    id: "gemini-2.5-pro",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-pro",
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10.00,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["production", "quality", "long-context"],
    notes: "Stable. 2x input & 1.5x output for >200K tokens.",
  },
  GEMINI_2_5_FLASH: {
    id: "gemini-2.5-flash",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-flash",
    inputPricePerMTok: 0.30,
    outputPricePerMTok: 2.50,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["balanced", "long-context", "batch"],
    notes: "Stable. Free tier for <=200K tokens. Thinking supported.",
  },
  GEMINI_2_5_FLASH_LITE: {
    id: "gemini-2.5-flash-lite",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-flash-lite",
    inputPricePerMTok: 0.10,
    outputPricePerMTok: 0.40,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    useCase: ["budget", "batch", "high-frequency"],
    notes: "Cheapest Gemini. Stable. Free tier for <=200K tokens.",
  },


  // --- Gemini Image Models (Nano Banana family) ---
  // These are image generation models, not text models. Use with Gemini image generation API.
  // Nano Banana       (Aug 2025): gemini-2.5-flash-image        (based on Gemini 2.5 Flash)
  // Nano Banana Pro   (Nov 2025): gemini-3-pro-image-preview    (based on Gemini 3 Pro)
  // Nano Banana 2     (Feb 2026): gemini-3.1-flash-image-preview (based on Gemini 3.1 Flash)
  GEMINI_3_1_FLASH_IMAGE_PREVIEW: {
    id: "gemini-3.1-flash-image-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3.1-flash-image-preview",
    inputPricePerMTok: 0.50,
    outputPricePerMTok: 3.00,
    contextWindow: 1_048_576,
    maxOutput: 32_768,
    useCase: ["image-generation", "image-editing", "fast-images"],
    notes: "Nano Banana 2 (Feb 2026). Fast + high quality image gen. Based on Gemini 3.1 Flash. Best default for image generation.",
  },
  GEMINI_3_PRO_IMAGE_PREVIEW: {
    id: "gemini-3-pro-image-preview",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-3-pro-image-preview",
    inputPricePerMTok: 2.00,
    outputPricePerMTok: 12.00,
    contextWindow: 1_048_576,
    maxOutput: 32_768,
    useCase: ["image-generation", "image-editing", "high-fidelity"],
    notes: "Nano Banana Pro (Nov 2025). Maximum image fidelity at higher cost. Based on Gemini 3 Pro.",
  },
  GEMINI_2_5_FLASH_IMAGE: {
    id: "gemini-2.5-flash-image",
    gatewayProvider: "google-ai-studio",
    gatewayModel: "google-ai-studio/gemini-2.5-flash-image",
    inputPricePerMTok: 0.30,
    outputPricePerMTok: 2.50,
    contextWindow: 1_048_576,
    maxOutput: 32_768,
    useCase: ["image-generation", "budget-images"],
    notes: "Nano Banana original (Aug 2025). Legacy. Based on Gemini 2.5 Flash.",
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
 * OpenAI (use max_completion_tokens, not max_tokens):
 *   openai/gpt-5.4              (latest flagship, 1.05M context, $2.50/$15)
 *   openai/gpt-5.4-pro          (smartest OpenAI, $30/$180, Responses API only)
 *   openai/gpt-5                (coding/agentic, $1.25/$10)
 *   openai/gpt-5-pro            (deep reasoning, 272K output, $15/$120)
 *   openai/gpt-5-mini           (cost-efficient, $0.25/$2)
 *   openai/gpt-5-nano           (cheapest, $0.05/$0.40)
 *   openai/gpt-5.2              (previous frontier, $1.75/$14)
 *   openai/gpt-5.1              (previous coding flagship, $1.25/$10)
 *
 * Anthropic (use max_tokens, not max_completion_tokens):
 *   anthropic/claude-opus-4-6             (latest, most capable)
 *   anthropic/claude-sonnet-4-6           (latest Sonnet)
 *   anthropic/claude-haiku-4-5-20251001   (fast/cheap)
 *   anthropic/claude-sonnet-4-5-20250929  (previous gen)
 *   anthropic/claude-opus-4-5-20251101    (previous gen)
 *
 * Google (token counts include thinking tokens, use thinking_level):
 *   google-ai-studio/gemini-3.1-pro-preview       (latest Pro, $2/$12)
 *   google-ai-studio/gemini-3.1-flash-lite-preview (cheapest 3.1, $0.25/$1.50)
 *   google-ai-studio/gemini-3-flash-preview        (pro-level Flash, $0.50/$3)
 *   google-ai-studio/gemini-2.5-pro                (stable, $1.25/$10)
 *   google-ai-studio/gemini-2.5-flash              (stable, $0.30/$2.50)
 *   google-ai-studio/gemini-2.5-flash-lite         (cheapest, $0.10/$0.40)
 *
 * Google Image Models (Nano Banana family - use with image generation API):
 *   google-ai-studio/gemini-3.1-flash-image-preview  (Nano Banana 2, Feb 2026, best default)
 *   google-ai-studio/gemini-3-pro-image-preview      (Nano Banana Pro, Nov 2025, max fidelity)
 *   google-ai-studio/gemini-2.5-flash-image          (Nano Banana original, Aug 2025, legacy)
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
