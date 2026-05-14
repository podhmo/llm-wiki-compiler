/**
 * Shared LLM helper bridging internal call sites to the injected LLMAdapter.
 *
 * Provides callClaude() which accepts an LLMAdapter instance and forwards
 * calls to the appropriate method (complete / stream / toolCall), falling
 * back to complete when the optional methods are not implemented.
 * Retry logic with exponential backoff is preserved.
 */

import { RETRY_COUNT, RETRY_BASE_MS, RETRY_MULTIPLIER } from "./constants.js";
import type { LLMAdapter, ToolDefinition } from "../types/llm-adapter.js";

/** A single message in an LLM conversation (used internally by the pipeline). */
interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

/** Options accepted by callClaude() — internal to the pipeline. */
interface CallClaudeOptions {
  system: string;
  messages: LLMMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  stream?: boolean;
  onToken?: (text: string) => void;
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a messages array to a single prompt string for the LLMAdapter.
 * Preserves multi-turn context by labelling each message role.
 */
function messagesToPrompt(messages: LLMMessage[]): string {
  if (messages.length === 1) return messages[0].content;
  return messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
}

/**
 * Dispatch a single LLM call to the appropriate adapter method.
 * Uses stream → toolCall → complete precedence.
 */
async function dispatchLLMCall(
  llm: LLMAdapter,
  options: CallClaudeOptions,
): Promise<string> {
  const { system, messages, tools, maxTokens = 4096, stream = false, onToken } = options;
  const prompt = messagesToPrompt(messages);

  if (stream && onToken) {
    const fn = llm.stream ?? llm.complete;
    return fn.call(llm, { system, prompt, maxTokens, onToken });
  }

  if (tools && tools.length > 0) {
    const fn = llm.toolCall ?? llm.complete;
    return fn.call(llm, { system, prompt, tools, maxTokens });
  }

  return llm.complete({ system, prompt, maxTokens });
}

/**
 * Invoke the LLM adapter with retry logic.
 * Routes to stream / toolCall / complete depending on options and adapter
 * capabilities, falling back to complete when optional methods are absent.
 */
export async function callClaude(llm: LLMAdapter, options: CallClaudeOptions): Promise<string> {
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await dispatchLLMCall(llm, options);
    } catch (error) {
      if (attempt === RETRY_COUNT) throw error;
      const delayMs = RETRY_BASE_MS * Math.pow(RETRY_MULTIPLIER, attempt);
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ API call failed (attempt ${attempt + 1}/${RETRY_COUNT + 1}): ${errMsg}`);
      console.warn(`  Retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }

  throw new Error("Unreachable");
}
