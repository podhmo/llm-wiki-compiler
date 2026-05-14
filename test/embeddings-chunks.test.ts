/**
 * Tests covering chunk-level retrieval and backwards compatibility with v1 stores.
 * Embed-dependent tests (updateEmbeddings) are not included since the embed
 * backend was removed with the provider system.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import {
  findRelevantChunks,
  findTopKChunks,
  readEmbeddingStore,
  resetStaleEmbeddingWarnings,
  writeEmbeddingStore,
  type ChunkEmbeddingEntry,
  type EmbeddingStore,
} from "../src/utils/embeddings.js";

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "llmwiki-chunks-"));
  await mkdir(path.join(root, ".llmwiki"), { recursive: true });
  return root;
}

afterEach(() => {
  delete process.env.LLMWIKI_EMBEDDING_MODEL;
  resetStaleEmbeddingWarnings();
});

describe("findTopKChunks", () => {
  const chunk = (slug: string, idx: number, vector: number[]): ChunkEmbeddingEntry => ({
    slug,
    title: slug,
    chunkIndex: idx,
    contentHash: "hash",
    text: `${slug}-${idx}`,
    vector,
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  it("ranks chunks by cosine similarity descending", () => {
    const chunks = [
      chunk("a", 0, [1, 0]),
      chunk("a", 1, [0, 1]),
      chunk("b", 0, [0.9, 0.1]),
    ];
    const top = findTopKChunks([1, 0], chunks, 2);
    expect(top.map((c) => c.chunk.slug)).toEqual(["a", "b"]);
  });

  it("returns at most k chunks", () => {
    const chunks = [chunk("a", 0, [1, 0]), chunk("b", 0, [0.8, 0])];
    expect(findTopKChunks([1, 0], chunks, 1)).toHaveLength(1);
  });
});

describe("findRelevantChunks — no-embed paths", () => {
  it("returns [] when the store has no chunks", async () => {
    const root = await makeRoot();
    process.env.LLMWIKI_EMBEDDING_MODEL = "test-embed";
    await writeEmbeddingStore(root, {
      version: 2,
      model: "test-embed",
      dimensions: 2,
      entries: [],
      chunks: [],
    });
    expect(await findRelevantChunks(root, "anything", 5)).toEqual([]);
  });

  it("falls back when the stored model is stale", async () => {
    const root = await makeRoot();
    process.env.LLMWIKI_EMBEDDING_MODEL = "test-embed";
    await writeEmbeddingStore(root, {
      version: 2,
      model: "old-model",
      dimensions: 2,
      entries: [],
      chunks: [
        {
          slug: "a", title: "a", chunkIndex: 0, contentHash: "h1",
          text: "alpha", vector: [1, 0], updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const top = await findRelevantChunks(root, "alpha", 5);
    expect(top).toEqual([]);
  });
});

describe("backwards compatibility", () => {
  it("v1 store still loads correctly for findRelevantPages flow", async () => {
    const root = await makeRoot();
    const v1Store: EmbeddingStore = {
      version: 1,
      model: "test-embed",
      dimensions: 2,
      entries: [
        {
          slug: "alpha", title: "Alpha", summary: "Sum",
          vector: [1, 0], updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    await writeEmbeddingStore(root, v1Store);
    const loaded = await readEmbeddingStore(root);
    expect(loaded?.version).toBe(1);
    expect(loaded?.chunks).toBeUndefined();
    expect(loaded?.entries).toHaveLength(1);
  });
});
