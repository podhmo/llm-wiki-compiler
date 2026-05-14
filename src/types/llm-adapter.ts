/**
 * LLMAdapter interface and related types.
 *
 * Defines the injection point for user-supplied LLM calls. Instead of
 * bundling AI SDK implementations, llm-wiki-compiler accepts a user-provided
 * adapter that wraps any LLM backend (OpenAI, Anthropic, Ollama, etc.).
 *
 * Only `complete` is required. `stream` and `toolCall` are optional; when
 * absent the library falls back to `complete` for all calls.
 */

/** A tool that can be passed to the LLM for structured output. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** User-supplied adapter that the wiki compiler uses for all LLM calls. */
export interface LLMAdapter {
  /** Generate a text completion from the given system prompt and user message. */
  complete(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string>;

  /**
   * Stream a completion token-by-token.
   * When absent, `complete` is used instead.
   */
  stream?(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
    onToken: (text: string) => void;
  }): Promise<string>;

  /**
   * Run a structured tool-call completion.
   * When absent, `complete` is used instead.
   */
  toolCall?(options: {
    system: string;
    prompt: string;
    tools: ToolDefinition[];
    maxTokens?: number;
  }): Promise<string>;
}

/** Options passed to createWikiCompiler(). */
export interface WikiCompilerOptions {
  /** The LLM adapter that handles all AI completions. */
  llm: LLMAdapter;
  /** Project root directory (defaults to process.cwd()). */
  root?: string;
}
