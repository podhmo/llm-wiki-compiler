/**
 * Compile-path tests for claim-level provenance markers flowing end-to-end
 * through compileAndReport().
 *
 * These tests verify that `^[source.md:42-58]` and `^[source.md#L42-L58]`
 * markers written by the LLM stub are faithfully preserved in the wiki page
 * body written to disk, and that both colon and hash forms survive unaltered.
 *
 * Strategy: stub LLMAdapter so no real API calls are made.
 *   - toolCall() returns minimal extraction JSON marking the concept as new.
 *   - complete() returns a page body that includes claim-level citation markers.
 * The compiled output is then read back and inspected for marker presence.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import path from "path";
import { compileAndReport } from "../src/compiler/index.js";
import { parseFrontmatter, extractClaimCitations } from "../src/utils/markdown.js";
import type { LLMAdapter } from "../src/types/llm-adapter.js";
import { useCompileProject } from "./fixtures/compile-project.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal extraction response declaring one new concept. */
function buildExtractionResponse(): string {
  return JSON.stringify({
    concepts: [
      {
        concept: "Claim Topic",
        summary: "A topic compiled with claim-level citations.",
        is_new: true,
        confidence: 0.9,
        provenance_state: "extracted",
        contradicted_by: [],
      },
    ],
  });
}

/** Create a mock LLMAdapter that returns the given page body for completions. */
function buildMockAdapter(pageBody: string): LLMAdapter {
  return {
    async complete(): Promise<string> {
      return pageBody;
    },
    async toolCall(): Promise<string> {
      return buildExtractionResponse();
    },
  };
}

/**
 * Stub the LLM adapter, run compile, and return the rendered page body.
 * Reduces per-test boilerplate for the compile+read pattern.
 */
async function compileAndReadBody(root: string, stubBody: string): Promise<string> {
  const llm = buildMockAdapter(stubBody);
  await compileAndReport(root, {}, llm);

  const pagePath = path.join(root, "wiki", "concepts", "claim-topic.md");
  const content = await readFile(pagePath, "utf-8");
  const { body } = parseFrontmatter(content);
  return body;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("compile-path claim-level marker preservation", () => {
  const ctx = useCompileProject({
    dirSuffix: "claim-markers",
    sourceFile: "source.md",
    sourceContent:
      "# Source\n\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\n",
  });

  it("preserves colon-form claim marker in the compiled page body", async () => {
    const stubBody =
      "A claim with colon range. ^[source.md:2-5]\n\nAnother claim. ^[source.md:7-9]";

    const body = await compileAndReadBody(ctx.dir, stubBody);

    expect(body).toContain("^[source.md:2-5]");
    expect(body).toContain("^[source.md:7-9]");
  });

  it("preserves hash-form claim marker in the compiled page body", async () => {
    const body = await compileAndReadBody(ctx.dir, "A claim with hash range. ^[source.md#L3-L6]");

    expect(body).toContain("^[source.md#L3-L6]");
  });

  it("claim markers on disk parse to correct SourceSpan via extractClaimCitations", async () => {
    const body = await compileAndReadBody(ctx.dir, "Parsed claim. ^[source.md:3-7]");
    const citations = extractClaimCitations(body);

    expect(citations).toHaveLength(1);
    expect(citations[0].spans).toEqual([
      { file: "source.md", lines: { start: 3, end: 7 } },
    ]);
  });
});
