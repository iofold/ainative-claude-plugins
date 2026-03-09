#!/usr/bin/env bun
/**
 * OpenAI Helper - Lightweight LLM utility for hooks and scripts
 *
 * Usage as module:
 *   import { chat, chatStructured, summarize } from './lib/openai-helper.ts'
 *   const result = await chat("Hello!")
 *   const data = await chatStructured<MyType>("Extract info", schema)
 *
 * Usage as CLI:
 *   bun openai-helper.ts "Your prompt"
 *   bun openai-helper.ts --file input.txt "Summarize this"
 *   bun openai-helper.ts --json '{"type":"object",...}' "Extract data"
 *   echo "prompt" | bun openai-helper.ts --stdin
 *
 * Environment:
 *   OPENAI_API_KEY - Required
 *   OPENAI_MODEL   - Default model (default: gpt-5-nano)
 */

// Dependencies with pinned versions (Bun auto-install - no node_modules needed)
import OpenAI from "openai@^6.15.0";
import { config } from "dotenv@^17.2.0";

// Node.js built-ins (no version needed)
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env") });
config({ path: join(__dirname, ".env") });

// ============================================================================
// Types
// ============================================================================

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  /** Reasoning effort for thinking models: "low" | "medium" | "high" | "xhigh" (default: "low"). xhigh only for GPT-5.2 Pro. */
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
}

export interface StructuredOptions<T> extends ChatOptions {
  schema: JsonSchema;
  schemaName?: string;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  additionalProperties?: boolean;
  [key: string]: any;
}

export interface ChatResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StructuredResult<T> {
  data: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Client Initialization
// ============================================================================

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY not set. Add it to your .env file."
      );
    }
    const baseURL = process.env.OPENAI_BASE_URL || undefined;
    _client = new OpenAI({ apiKey, baseURL });
  }
  return _client;
}

function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || "gpt-5-nano";
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Simple chat completion
 */
export async function chat(
  prompt: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const client = getClient();
  const model = options.model || getDefaultModel();

  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const requestParams: any = {
    model,
    messages,
    // Default 4096 - includes reasoning tokens, so needs headroom
    max_completion_tokens: options.maxTokens || 4096,
  };

  // Add reasoning_effort only if explicitly set (some models don't support it)
  if (options.reasoningEffort) {
    requestParams.reasoning_effort = options.reasoningEffort;
  }

  const response = await client.chat.completions.create(requestParams);

  const choice = response.choices[0];
  return {
    content: choice?.message?.content || "",
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Chat with structured JSON output using response_format
 *
 * Note: For strict mode, schema must have additionalProperties: false
 * This function automatically ensures it's set.
 */
export async function chatStructured<T = unknown>(
  prompt: string,
  options: StructuredOptions<T>
): Promise<StructuredResult<T>> {
  const client = getClient();
  const model = options.model || getDefaultModel();

  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  // Ensure schema has additionalProperties: false for strict mode
  const schema = {
    ...options.schema,
    additionalProperties: false,
  };

  const requestParams: any = {
    model,
    messages,
    // Default 4096 - includes reasoning tokens, so needs headroom
    max_completion_tokens: options.maxTokens || 4096,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: options.schemaName || "response",
        strict: true,
        schema,
      },
    },
  };

  // Add reasoning_effort only if explicitly set (some models don't support it)
  if (options.reasoningEffort) {
    requestParams.reasoning_effort = options.reasoningEffort;
  }

  const response = await client.chat.completions.create(requestParams);

  const choice = response.choices[0];
  const content = choice?.message?.content || "{}";

  let data: T;
  try {
    data = JSON.parse(content) as T;
  } catch {
    throw new Error(`Failed to parse structured response: ${content}`);
  }

  return {
    data,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Simple summarization helper
 */
export async function summarize(
  text: string,
  options: ChatOptions & { style?: "brief" | "detailed" | "bullets" } = {}
): Promise<string> {
  const style = options.style || "brief";

  const stylePrompts: Record<string, string> = {
    brief:
      "Summarize the following in 1-2 sentences, focusing on the main action or outcome:",
    detailed:
      "Provide a comprehensive summary of the following, covering key points and context:",
    bullets:
      "Summarize the following as bullet points, one per key point or action:",
  };

  const result = await chat(`${stylePrompts[style]}\n\n${text}`, {
    ...options,
  });

  return result.content;
}

/**
 * Extract structured data from text
 */
export async function extract<T>(
  text: string,
  schema: JsonSchema,
  instruction?: string,
  options: ChatOptions = {}
): Promise<T> {
  const prompt = instruction
    ? `${instruction}\n\nText:\n${text}`
    : `Extract the relevant information from the following text:\n\n${text}`;

  const result = await chatStructured<T>(prompt, {
    ...options,
    schema,
    schemaName: "extraction",
  });

  return result.data;
}

// ============================================================================
// CLI Support
// ============================================================================

function printHelp(): void {
  console.log(`
OpenAI Helper - Lightweight LLM utility

USAGE:
  bun openai-helper.ts [options] "prompt"
  echo "prompt" | bun openai-helper.ts --stdin

OPTIONS:
  --model <name>        Model to use (default: gpt-5-nano)
  --max-tokens <n>      Max output tokens
  --system <prompt>     System prompt
  --file <path>         Include file content in prompt
  --json <schema>       Use structured output with JSON schema
  --reasoning <level>   Reasoning effort: low|medium|high|xhigh (default: low)
  --stdin               Read prompt from stdin
  --quiet               Only output the result
  -h, --help            Show this help

EXAMPLES:
  # Simple prompt
  bun openai-helper.ts "Explain recursion briefly"

  # With file
  bun openai-helper.ts --file code.ts "Review this code"

  # Structured output (schema must have "required" array)
  bun openai-helper.ts --json '{"type":"object","properties":{"sentiment":{"type":"string"}},"required":["sentiment"]}' "Analyze: I love this!"

  # Higher reasoning for complex tasks
  bun openai-helper.ts --reasoning medium "Solve this math problem..."

  # From stdin
  cat transcript.jsonl | bun openai-helper.ts --stdin "Summarize this conversation"
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  // Parse arguments
  let model: string | undefined;
  let maxTokens: number | undefined;
  let systemPrompt: string | undefined;
  let filePath: string | undefined;
  let jsonSchema: JsonSchema | undefined;
  let reasoningEffort: "low" | "medium" | "high" | "xhigh" | undefined;
  let useStdin = false;
  let quiet = false;
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--model":
        model = next;
        i++;
        break;
      case "--max-tokens":
        maxTokens = parseInt(next);
        i++;
        break;
      case "--system":
        systemPrompt = next;
        i++;
        break;
      case "--file":
        filePath = next;
        i++;
        break;
      case "--json":
        jsonSchema = JSON.parse(next);
        i++;
        break;
      case "--reasoning":
        reasoningEffort = next as "low" | "medium" | "high" | "xhigh";
        i++;
        break;
      case "--stdin":
        useStdin = true;
        break;
      case "--quiet":
        quiet = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          positional.push(arg);
        }
    }
  }

  // Build prompt
  let prompt = "";

  if (useStdin) {
    prompt = await Bun.stdin.text();
  }

  if (filePath) {
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const fileContent = readFileSync(filePath, "utf-8");
    prompt = prompt ? `${prompt}\n\n${fileContent}` : fileContent;
  }

  if (positional.length > 0) {
    const userPrompt = positional.join(" ");
    prompt = prompt ? `${userPrompt}\n\n${prompt}` : userPrompt;
  }

  if (!prompt.trim()) {
    console.error("No prompt provided. Use --help for usage.");
    process.exit(1);
  }

  // Execute
  try {
    if (jsonSchema) {
      const result = await chatStructured(prompt, {
        model,
        maxTokens,
        systemPrompt,
        reasoningEffort,
        schema: jsonSchema,
      });
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      const result = await chat(prompt, {
        model,
        maxTokens,
        systemPrompt,
        reasoningEffort,
      });

      if (quiet) {
        console.log(result.content);
      } else {
        console.log(result.content);
        if (result.usage) {
          console.error(
            `\n[tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out]`
          );
        }
      }
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.main) {
  main();
}
