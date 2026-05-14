/**
 * Tests for the file ingest pipeline.
 *
 * Covers:
 *   - source-type detection routes local files to "file"
 *   - source-type detection throws a descriptive error for URLs
 *   - frontmatter records sourceType for file type
 *   - legacy callers without sourceType are supported
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import path from "path";
import os from "os";
import { detectSourceType, buildDocument, enforceCharLimit } from "../src/commands/ingest.js";
import { parseFrontmatter } from "../src/utils/markdown.js";

const tempDirsToCleanup: string[] = [];

async function makeTempFile(name: string, contents: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "llmwiki-ingest-"));
  tempDirsToCleanup.push(dir);
  const filePath = path.join(dir, name);
  await writeFile(filePath, contents, "utf-8");
  return filePath;
}

afterEach(async () => {
  while (tempDirsToCleanup.length > 0) {
    const dir = tempDirsToCleanup.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("detectSourceType", () => {
  it("routes .md to file", async () => {
    expect(await detectSourceType("/tmp/notes.md")).toBe("file");
  });

  it("routes .txt to file", async () => {
    const filePath = await makeTempFile("chat.txt", "Alice: Hi.\nBob: Hello.\nAlice: How are you?");
    expect(await detectSourceType(filePath)).toBe("file");
  });

  it("routes any local file path to file regardless of extension", async () => {
    expect(await detectSourceType("/tmp/report.pdf")).toBe("file");
    expect(await detectSourceType("/tmp/photo.png")).toBe("file");
  });

  it("throws a descriptive error for http URLs", async () => {
    await expect(detectSourceType("http://example.com/post")).rejects.toThrow(
      /URL sources are not supported/,
    );
  });

  it("throws a descriptive error for https URLs", async () => {
    await expect(detectSourceType("https://example.com/article")).rejects.toThrow(
      /URL sources are not supported/,
    );
  });
});

describe("buildDocument frontmatter sourceType", () => {
  it("records sourceType file in frontmatter", () => {
    const result = enforceCharLimit("hello world");
    const doc = buildDocument("Title", "src", result, "file");
    const { meta } = parseFrontmatter(doc);
    expect(meta.sourceType).toBe("file");
  });

  it("omits sourceType when not provided (legacy callers preserved)", () => {
    const result = enforceCharLimit("hello world");
    const doc = buildDocument("Title", "src", result);
    const { meta } = parseFrontmatter(doc);
    expect(meta.sourceType).toBeUndefined();
    expect(meta.title).toBe("Title");
  });
});
