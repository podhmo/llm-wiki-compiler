/**
 * Public library entry point for llm-wiki-compiler.
 *
 * Re-exports the command-builder factory (`createWikiCompiler`), the
 * `LLMAdapter` / `WikiCompilerOptions` interfaces users must implement,
 * and the result types returned by compile and query operations.
 *
 * CLI users interact via `llmwiki` commands; programmatic consumers
 * import from this module:
 *
 * @example
 * ```typescript
 * import { createWikiCompiler, type LLMAdapter } from "llm-wiki-compiler";
 *
 * const llm: LLMAdapter = {
 *   complete: async ({ system, prompt }) => callMyModel(system, prompt),
 * };
 *
 * const wiki = createWikiCompiler({ llm });
 * await wiki.compile();
 * const result = await wiki.query("What is X?");
 * ```
 */

export { createWikiCompiler } from "./wiki-compiler.js";
export type { WikiCompiler } from "./wiki-compiler.js";
export type { LLMAdapter, WikiCompilerOptions, ToolDefinition } from "./types/llm-adapter.js";
export type { CompileOptions, CompileResult, QueryResult } from "./utils/types.js";
export type { GenerateAnswerOptions } from "./commands/query.js";
