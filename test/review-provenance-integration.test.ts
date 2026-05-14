/**
 * Programmatic integration test: `compile --review` runs provenance lint
 * against the generated candidate body and persists the findings on the
 * candidate JSON record.
 *
 * Tests use a mock LLMAdapter so no network calls are made.
 */

import { describe, it, expect } from "vitest";
import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { compileAndReport } from "../src/compiler/index.js";
import type { LLMAdapter } from "../src/types/llm-adapter.js";
import { useTempRoot } from "./fixtures/temp-root.js";

const CONCEPT = "Provenance Lint Test";
const SOURCE_FILE = "source.md";

const root = useTempRoot(["sources"]);

/** Minimal extraction response for CONCEPT. */
function buildExtractionResponse(): string {
  return JSON.stringify({
    concepts: [
      {
        concept: CONCEPT,
        summary: "Concept used to test review-mode provenance lint.",
        is_new: true,
        tags: ["test"],
        confidence: 0.9,
      },
    ],
  });
}

/** Build a mock LLMAdapter that returns the given page body for completions. */
function buildAdapter(stubBody: string): LLMAdapter {
  return {
    async complete(): Promise<string> {
      return stubBody;
    },
    async toolCall(): Promise<string> {
      return buildExtractionResponse();
    },
  };
}

/** Read the single candidate JSON from .llmwiki/candidates/. */
async function readOnlyCandidate(rootDir: string): Promise<{
  body: string;
  schemaViolations?: unknown[];
  provenanceViolations?: unknown[];
}> {
  const dir = path.join(rootDir, ".llmwiki", "candidates");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(await readFile(path.join(dir, files[0]), "utf-8"));
}

/** Write a source file and run compile --review with the given stub body. */
async function compileReviewWithStubbedBody(stubBody: string): Promise<{
  body: string;
  schemaViolations?: unknown[];
  provenanceViolations?: unknown[];
}> {
  await writeFile(
    path.join(root.dir, "sources", SOURCE_FILE),
    "# Source\n\nA short source for the review test.\n",
  );
  const llm = buildAdapter(stubBody);
  await compileAndReport(root.dir, { review: true }, llm);
  return readOnlyCandidate(root.dir);
}

describe("compile --review provenance lint integration", () => {
  it("attaches provenanceViolations when the candidate body has malformed claim citations", async () => {
    const candidate = await compileReviewWithStubbedBody(
      "First paragraph drawing from the source. ^[source.md:abc]\n\n" +
        "Second paragraph with a hash-form malformed span. ^[source.md#X]\n",
    );
    expect(candidate.provenanceViolations).toBeDefined();
    expect(candidate.provenanceViolations!.length).toBeGreaterThanOrEqual(2);
    const firstRule = (candidate.provenanceViolations![0] as { rule?: unknown }).rule;
    expect(firstRule).toBe("malformed-claim-citation");
  });

  it("attaches provenanceViolations when the candidate body cites a missing source file", async () => {
    const candidate = await compileReviewWithStubbedBody(
      "Body with an inline citation to a non-existent source. ^[does-not-exist.md]\n",
    );
    expect(candidate.provenanceViolations).toBeDefined();
    const rules = (candidate.provenanceViolations as Array<{ rule: string }>).map((v) => v.rule);
    expect(rules).toContain("broken-citation");
  });

  it("omits provenanceViolations when the candidate body has clean citations", async () => {
    const cleanBody = "Body without any citation markers — clean.\n";
    const candidate = await compileReviewWithStubbedBody(cleanBody);
    expect(candidate.provenanceViolations).toBeUndefined();
    expect(candidate.body).toContain("Body without any citation markers");
  });
});
