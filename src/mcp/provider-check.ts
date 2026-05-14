/**
 * Per-tool provider validation for the MCP server.
 *
 * The provider system has been replaced by the LLMAdapter injection pattern.
 * This stub is retained for compatibility until the MCP server is removed.
 */

/**
 * Throw if no LLM adapter is available. Since the provider system has been
 * removed, all LLM-dependent MCP tools now require createWikiCompiler().
 */
export function ensureProviderAvailable(): void {
  throw new Error(
    "LLM adapter not configured. Use createWikiCompiler({ llm }) to provide an adapter.",
  );
}
