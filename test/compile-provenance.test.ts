/**
 * Compile-path tests for provenance metadata (confidence, contradictions,
 * and provenanceState) flowing end-to-end through compileAndReport().
 *
 * These tests verify that metadata the LLM returns during concept extraction
 * is faithfully written into the wiki page frontmatter and that contradiction
 * warnings are emitted at compile time.
 *
 * Strategy: use a mock LLMAdapter so no real API calls are made.
 *   - toolCall() returns extraction JSON with the desired provenance fields.
 *   - complete() returns a minimal wiki-page body.
 * The compiled output is then read back and parsed to assert on frontmatter.
 */

import { describe, it, expect, vi } from "vitest";
import { readFile } from "fs/promises";
import path from "path";
import { compileAndReport } from "../src/compiler/index.js";
import { parseFrontmatter, parseProvenanceMetadata } from "../src/utils/markdown.js";
import type { LLMAdapter } from "../src/types/llm-adapter.js";
import { useCompileProject } from "./fixtures/compile-project.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extraction tool JSON that instructs the compiler to produce provenance metadata. */
function buildExtractionResponse(): string {
  return JSON.stringify({
    concepts: [
      {
        concept: "Sample Topic",
        summary: "A topic with stubbed provenance metadata.",
        is_new: true,
        confidence: 0.3,
        provenance_state: "inferred",
        contradicted_by: [{ slug: "other", reason: "conflicting evidence" }],
      },
    ],
  });
}

/** Minimal wiki page body returned by the page-generation stub. */
const STUB_PAGE_BODY = "The sample topic is described here. ^[sample.md]";

/** Build a mock LLMAdapter for provenance compile tests. */
function buildMockAdapter(): LLMAdapter {
  return {
    async complete(): Promise<string> {
      return STUB_PAGE_BODY;
    },
    async toolCall(): Promise<string> {
      return buildExtractionResponse();
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("compile-path provenance metadata", () => {
  const ctx = useCompileProject({ dirSuffix: "prov-meta" });

  it("writes confidence, provenanceState, and contradictedBy into frontmatter", async () => {
    const llm = buildMockAdapter();
    await compileAndReport(ctx.dir, {}, llm);

    const pagePath = path.join(ctx.dir, "wiki", "concepts", "sample-topic.md");
    const content = await readFile(pagePath, "utf-8");
    const { meta } = parseFrontmatter(content);
    const provenance = parseProvenanceMetadata(meta);

    expect(provenance.confidence).toBe(0.3);
    expect(provenance.provenanceState).toBe("inferred");
    expect(provenance.contradictedBy).toEqual([
      { slug: "other", reason: "conflicting evidence" },
    ]);
  });

  it("emits a contradiction warning to console during compilation", async () => {
    const llm = buildMockAdapter();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await compileAndReport(ctx.dir, {}, llm);

    // reportContradictionWarnings calls output.status("!", output.warn(...))
    // which maps to console.log("! <yellow>Contradiction reported on...<reset>")
    const warningLines = logSpy.mock.calls
      .map(([line]) => (typeof line === "string" ? line : ""))
      .filter((line) => line.includes("Contradiction reported on"));

    expect(warningLines).toHaveLength(1);
    expect(warningLines[0]).toContain("Sample Topic");
    expect(warningLines[0]).toContain("other");
  });
});
