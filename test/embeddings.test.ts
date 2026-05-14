/**
 * Tests for cosine-similarity, top-K ranking, and embedding store I/O.
 * Avoids real network calls — we test the pure helpers and JSON roundtrips.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import {
  cosineSimilarity,
  findTopK,
  findRelevantPages,
  readEmbeddingStore,
  resetStaleEmbeddingWarnings,
  resolveEmbeddingModel,
  writeEmbeddingStore,
  type EmbeddingStore,
  type EmbeddingEntry,
} from "../src/utils/embeddings.js";
import { EMBEDDING_MODELS } from "../src/utils/constants.js";

const STORE_PATH = ".llmwiki/embeddings.json";

function makeEntry(slug: string, vector: number[]): EmbeddingEntry {
  return {
    slug,
    title: slug,
    summary: `Summary for ${slug}`,
    vector,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeStore(entries: EmbeddingEntry[]): EmbeddingStore {
  return {
    version: 1,
    model: "test-model",
    dimensions: entries[0]?.vector.length ?? 0,
    entries,
  };
}

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "llmwiki-embed-"));
  await mkdir(path.join(root, ".llmwiki"), { recursive: true });
  return root;
}

afterEach(() => {
  delete process.env.LLMWIKI_EMBEDDING_MODEL;
  resetStaleEmbeddingWarnings();
  vi.restoreAllMocks();
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  it("returns 0 (not NaN) when the first vector is zero-magnitude", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("returns 0 (not NaN) when the second vector is zero-magnitude", () => {
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it("returns 0 when vectors differ in length", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("findTopK", () => {
  const store = makeStore([
    makeEntry("a", [1, 0, 0]),
    makeEntry("b", [0, 1, 0]),
    makeEntry("c", [1, 1, 0]),
    makeEntry("d", [-1, 0, 0]),
  ]);

  it("returns the k most similar entries in descending order", () => {
    const top = findTopK([1, 0, 0], store, 2);
    expect(top.map((e) => e.slug)).toEqual(["a", "c"]);
  });

  it("returns all entries when k exceeds the store size", () => {
    const top = findTopK([1, 0, 0], store, 99);
    expect(top).toHaveLength(store.entries.length);
    expect(top[0].slug).toBe("a");
  });

  it("returns an empty array when the store is empty", () => {
    const empty = makeStore([]);
    expect(findTopK([1, 0, 0], empty, 5)).toEqual([]);
  });
});

describe("embedding store persistence", () => {
  it("returns null when the store file does not exist", async () => {
    const root = await makeRoot();
    const store = await readEmbeddingStore(root);
    expect(store).toBeNull();
  });

  it("roundtrips a store through write + read", async () => {
    const root = await makeRoot();
    const original = makeStore([
      makeEntry("alpha", [0.1, 0.2, 0.3]),
      makeEntry("beta", [0.4, 0.5, 0.6]),
    ]);

    await writeEmbeddingStore(root, original);
    const loaded = await readEmbeddingStore(root);

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(original);
  });

  it("writes JSON that is human-readable (pretty-printed)", async () => {
    const root = await makeRoot();
    const original = makeStore([makeEntry("alpha", [0.1, 0.2])]);
    await writeEmbeddingStore(root, original);

    const { readFile } = await import("fs/promises");
    const raw = await readFile(path.join(root, STORE_PATH), "utf-8");
    // Pretty-printed JSON contains newlines between fields.
    expect(raw).toContain("\n");
    expect(JSON.parse(raw)).toEqual(original);
  });

  it("returns null for a missing store even when .llmwiki directory exists but file doesn't", async () => {
    const root = await makeRoot();
    // Create an unrelated file to confirm readEmbeddingStore checks the file, not the dir.
    await writeFile(path.join(root, ".llmwiki/other.json"), "{}");
    expect(await readEmbeddingStore(root)).toBeNull();
  });
});

describe("embedding model selection", () => {
  it("uses LLMWIKI_EMBEDDING_MODEL when explicitly set", () => {
    process.env.LLMWIKI_EMBEDDING_MODEL = "local-embed";
    expect(resolveEmbeddingModel()).toBe("local-embed");
  });

  it("falls back to anthropic embedding model when LLMWIKI_EMBEDDING_MODEL is unset", () => {
    delete process.env.LLMWIKI_EMBEDDING_MODEL;
    expect(resolveEmbeddingModel()).toBe(EMBEDDING_MODELS.anthropic);
  });

  it("ignores a mismatched store during semantic lookup", async () => {
    const root = await setupWithStaleStore();

    const result = await findRelevantPages(root, "alpha");

    expect(result).toEqual([]);
  });

  it("warns once when the stored model differs from the active model", async () => {
    const root = await setupWithStaleStore();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await findRelevantPages(root, "alpha");
    await findRelevantPages(root, "alpha");

    const warnings = log.mock.calls.filter(([line]) =>
      typeof line === "string" && line.includes("Falling back to full-index"),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0][0]).toContain('"new-model"');
  });
});

/** Set up a stale embedding store where the stored model differs from the active model. */
async function setupWithStaleStore(): Promise<string> {
  const root = await makeRoot();
  process.env.LLMWIKI_EMBEDDING_MODEL = "new-model";
  await writeEmbeddingStore(root, makeStore([makeEntry("alpha", [1, 0])]));
  return root;
}
