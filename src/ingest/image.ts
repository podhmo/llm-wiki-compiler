/**
 * Image ingestion module — stub after provider removal.
 *
 * Image ingest via LLM vision required the Anthropic SDK which has been
 * removed as a dependency. This stub throws a clear error. Image ingest
 * will be fully deleted in a subsequent cleanup issue.
 */

import type { IngestedSource } from "./shared.js";

/**
 * Stub: image ingest is no longer supported after provider removal.
 * @throws Always — image ingest requires an LLM with vision support.
 */
export default async function ingestImage(_filePath: string): Promise<IngestedSource> {
  throw new Error(
    "Image ingest is not supported after the LLM provider system was removed. " +
    "Use a text-based ingest method instead.",
  );
}
