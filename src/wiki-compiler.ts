/**
 * createWikiCompiler factory — the command-builder pattern entry point.
 *
 * Accepts a user-supplied LLMAdapter and returns a `{ compile, query }`
 * object whose methods use that adapter for all LLM calls. This is the
 * primary library API: install llm-wiki-compiler, run `llmwiki init` to
 * generate a config template, implement your LLM adapter, then call
 * `createWikiCompiler({ llm })`.
 *
 * @example
 * ```typescript
 * import { createWikiCompiler } from "llm-wiki-compiler";
 *
 * const wiki = createWikiCompiler({
 *   llm: {
 *     complete: async ({ system, prompt }) => {
 *       // call your LLM here and return the response string
 *       throw new Error("TODO: implement LLM call");
 *     },
 *   },
 * });
 *
 * await wiki.compile();
 * await wiki.query("What is X?");
 * ```
 */

import { compile as _compile, compileAndReport as _compileAndReport } from "./compiler/index.js";
import { generateAnswer } from "./commands/query.js";
import type { LLMAdapter, WikiCompilerOptions } from "./types/llm-adapter.js";
import type { CompileOptions, CompileResult, QueryResult } from "./utils/types.js";
import type { GenerateAnswerOptions } from "./commands/query.js";

/** The object returned by createWikiCompiler(). */
export interface WikiCompiler {
  /**
   * Compile all new and changed sources into wiki pages.
   * Equivalent to running `llmwiki compile`.
   * @param root - Project root directory (defaults to process.cwd()).
   * @param options - Optional compile behaviour overrides.
   */
  compile(root?: string, options?: CompileOptions): Promise<void>;

  /**
   * Compile sources and return a structured result for programmatic use.
   * @param root - Project root directory (defaults to process.cwd()).
   * @param options - Optional compile behaviour overrides.
   */
  compileAndReport(root?: string, options?: CompileOptions): Promise<CompileResult>;

  /**
   * Answer a natural-language question using the wiki.
   * Equivalent to running `llmwiki query <question>`.
   * @param question - The question to answer.
   * @param root - Project root directory (defaults to process.cwd()).
   * @param options - Optional query behaviour overrides.
   */
  query(question: string, root?: string, options?: GenerateAnswerOptions): Promise<QueryResult>;
}

/**
 * Create a wiki compiler bound to the given LLM adapter.
 * Returns compile and query methods that use the injected adapter for all
 * LLM calls.
 *
 * @param options - Must include `llm: LLMAdapter`; `root` defaults to cwd.
 */
export function createWikiCompiler(options: WikiCompilerOptions): WikiCompiler {
  const { llm, root: defaultRoot } = options;
  const resolveRoot = (root?: string): string => root ?? defaultRoot ?? process.cwd();

  return {
    compile(root?: string, compileOptions?: CompileOptions): Promise<void> {
      return _compile(resolveRoot(root), compileOptions ?? {}, llm);
    },

    compileAndReport(root?: string, compileOptions?: CompileOptions): Promise<CompileResult> {
      return _compileAndReport(resolveRoot(root), compileOptions ?? {}, llm);
    },

    query(question: string, root?: string, queryOptions?: GenerateAnswerOptions): Promise<QueryResult> {
      return generateAnswer(resolveRoot(root), question, llm, queryOptions);
    },
  };
}

export type { LLMAdapter, WikiCompilerOptions } from "./types/llm-adapter.js";
