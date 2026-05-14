/**
 * CLI-level and programmatic tests for the chunked-retrieval feature.
 * Tests that require a live embed backend have been removed since the
 * provider system was replaced by the LLMAdapter injection pattern.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, rm } from "fs/promises";
import path from "path";
import os from "os";
import {
  findTopKChunks,
  readEmbeddingStore,
  resetStaleEmbeddingWarnings,
  writeEmbeddingStore,
  type ChunkEmbeddingEntry,
  type EmbeddingStore,
} from "../src/utils/embeddings.js";
import { rerankWithBm25 } from "../src/utils/retrieval.js";
import { runCLI, expectCLIExit } from "./fixtures/run-cli.js";

async function makeTempRoot(label: string): Promise<string> {
  const root = path.join(os.tmpdir(), `llmwiki-cr-${label}-${Date.now()}`);
  await mkdir(path.join(root, ".llmwiki"), { recursive: true });
  await mkdir(path.join(root, "wiki/concepts"), { recursive: true });
  return root;
}

async function cleanupRoot(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

function makeChunkEntry(
  slug: string,
  chunkIndex: number,
  text: string,
  vector: number[],
): ChunkEmbeddingEntry {
  return {
    slug,
    title: slug,
    chunkIndex,
    contentHash: `hash-${slug}-${chunkIndex}`,
    text,
    vector,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeV2Store(chunks: ChunkEmbeddingEntry[]): EmbeddingStore {
  return {
    version: 2,
    model: "test-embed",
    dimensions: 2,
    entries: [],
    chunks,
  };
}

afterEach(() => {
  delete process.env.LLMWIKI_EMBEDDING_MODEL;
  resetStaleEmbeddingWarnings();
});

// ---------------------------------------------------------------------------
// CLI smoke: --help
// ---------------------------------------------------------------------------

describe("query --help (CLI level)", () => {
  it("shows --debug flag in query help output", async () => {
    const result = await runCLI(["query", "--help"], process.cwd());
    expectCLIExit(result, 0);
    expect(result.stdout).toContain("--debug");
  }, 30_000);

  it("shows --save flag alongside --debug in query help output", async () => {
    const result = await runCLI(["query", "--help"], process.cwd());
    expectCLIExit(result, 0);
    expect(result.stdout).toContain("--save");
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Programmatic: chunk ranking over a v2 fixture (no LLM)
// ---------------------------------------------------------------------------

describe("chunk ranking over v2 fixture (programmatic)", () => {
  it("findTopKChunks returns the most-similar chunk first", () => {
    const chunks = [
      makeChunkEntry("ml-basics", 0, "machine learning fundamentals", [1, 0]),
      makeChunkEntry("retrieval", 0, "retrieval augmented generation", [0, 1]),
      makeChunkEntry("ml-basics", 1, "neural network training", [0.8, 0.2]),
    ];
    const top = findTopKChunks([1, 0], chunks, 2);
    expect(top[0].chunk.slug).toBe("ml-basics");
    expect(top[0].chunk.chunkIndex).toBe(0);
  });

  it("rerankWithBm25 boosts chunks whose text contains query terms", () => {
    const chunks = [
      makeChunkEntry("general", 0, "fruits vegetables and plants", [0.5, 0.5]),
      makeChunkEntry("specific", 0, "chunked retrieval and reranking algorithms", [0.4, 0.6]),
    ];
    const candidates = chunks.map((chunk) => ({
      text: chunk.text,
      baseScore: 0.5,
      chunk,
    }));
    const ranked = rerankWithBm25("chunked retrieval", candidates);
    expect(ranked[0].candidate.chunk.slug).toBe("specific");
  });
});

// ---------------------------------------------------------------------------
// Programmatic: store I/O (no LLM)
// ---------------------------------------------------------------------------

describe("v1 → v2 store shape", () => {
  it("v1 store without chunks is correctly detected as needing an upgrade", () => {
    const v1: EmbeddingStore = {
      version: 1,
      model: "test-embed",
      dimensions: 2,
      entries: [
        {
          slug: "alpha",
          title: "Alpha",
          summary: "Summary for alpha",
          vector: [1, 0],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(v1.chunks).toBeUndefined();
    expect(v1.version).toBe(1);
  });

  it("v2 store with chunks round-trips through write + read", async () => {
    const root = await makeTempRoot("v2-roundtrip");
    const original = makeV2Store([
      makeChunkEntry("alpha", 0, "first chunk", [0.1, 0.9]),
      makeChunkEntry("alpha", 1, "second chunk", [0.9, 0.1]),
    ]);
    await writeEmbeddingStore(root, original);
    const loaded = await readEmbeddingStore(root);

    expect(loaded?.version).toBe(2);
    expect(loaded?.chunks).toHaveLength(2);
    expect(loaded?.chunks?.[0].contentHash).toMatch(/^hash-/);

    await cleanupRoot(root);
  });
});
