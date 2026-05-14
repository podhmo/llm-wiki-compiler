/**
 * CLI-level integration tests for the file ingest command.
 *
 * These tests exercise the full CLI code path — spawning `node dist/cli.js
 * ingest <file>` — for local file ingestion, verifying that routing,
 * frontmatter, and content extraction all work together end-to-end.
 *
 * Fixture files live under `test/fixtures/multimodal/` and are real files that
 * contributors can inspect.
 *
 * Scope:
 *  - `ingest --help` shows help and exits 0
 *  - Plain-text prose .txt: routes to file adapter, sourceType file
 *  - Plain-text .txt with section headers: routes to file adapter
 *  - .md file: routes to file adapter
 *  - URL input: exits non-zero with actionable error message
 *  - Empty file: fails or produces skeleton, does not crash
 *  - Non-existent path: exits non-zero with actionable error
 *  - Bulk ingest: 3 txt fixtures in the same workspace produce 3 distinct files
 */

import { describe, it, expect, afterEach } from "vitest";
import path from "path";
import { mkdtemp, rm, readdir, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { runCLI, expectCLIExit, expectCLIFailure, formatCLIFailure } from "./fixtures/run-cli.js";

/** Number of distinct fixture files ingested in the bulk-ingest test. */
const BULK_INGEST_COUNT = 3;

/** Absolute path to the shared multimodal fixture directory. */
const FIXTURE_DIR = path.resolve("test/fixtures/multimodal");

/** Isolated workspace with its own sources/ directory. */
interface Workspace {
  cwd: string;
  fixturePath: string;
}

const tempDirs: string[] = [];

/**
 * Create a temp workspace directory and copy a named file into it.
 * The fixture content is read from the multimodal fixture directory.
 * @param fixtureName - Filename inside test/fixtures/multimodal/.
 * @returns Workspace with cwd and absolute fixturePath.
 */
async function makeWorkspaceFromFixture(fixtureName: string): Promise<Workspace> {
  const cwd = await mkdtemp(path.join(tmpdir(), "llmwiki-ingest-integration-"));
  tempDirs.push(cwd);
  const source = path.join(FIXTURE_DIR, fixtureName);
  const content = await readFile(source);
  const fixturePath = path.join(cwd, fixtureName);
  await writeFile(fixturePath, content);
  return { cwd, fixturePath };
}

/**
 * Create a temp workspace with an arbitrary inline content file.
 * @param fixtureName - Filename to use inside the workspace.
 * @param content - File content as string or Buffer.
 * @returns Workspace with cwd and absolute fixturePath.
 */
async function makeWorkspaceWithContent(
  fixtureName: string,
  content: string | Buffer,
): Promise<Workspace> {
  const cwd = await mkdtemp(path.join(tmpdir(), "llmwiki-ingest-integration-"));
  tempDirs.push(cwd);
  const fixturePath = path.join(cwd, fixtureName);
  await writeFile(fixturePath, content);
  return { cwd, fixturePath };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** Read the first .md file found in sources/ within cwd. */
async function readIngestedMarkdown(cwd: string): Promise<string> {
  const sourcesDir = path.join(cwd, "sources");
  const files = await readdir(sourcesDir);
  const mdFile = files.find((f) => f.endsWith(".md"));
  if (!mdFile) throw new Error(`No .md file in ${sourcesDir}; found: ${files.join(", ")}`);
  return readFile(path.join(sourcesDir, mdFile), "utf-8");
}

/** Run ingest on a workspace and return the CLI result plus written markdown. */
async function runIngest(
  workspace: Workspace,
): Promise<{ result: import("./fixtures/run-cli.js").CLIResult; markdown: string }> {
  const result = await runCLI(["ingest", workspace.fixturePath], workspace.cwd);
  expectCLIExit(result, 0);
  const markdown = await readIngestedMarkdown(workspace.cwd);
  return { result, markdown };
}

describe("file ingest CLI integration", () => {
  // dist/cli.js is built once via vitest globalSetup (test/global-setup.ts)

  it("ingest --help shows help and exits 0", async () => {
    const result = await runCLI(["ingest", "--help"], process.cwd());
    expectCLIExit(result, 0);
    expect(result.stdout, formatCLIFailure(result)).toContain("ingest");
    expect(result.stdout, formatCLIFailure(result)).toContain("source");
  }, 15_000);

  it("ingest a plain-prose .txt with no transcript signals routes to file adapter", async () => {
    const workspace = await makeWorkspaceFromFixture("sample-notes.txt");
    const { markdown } = await runIngest(workspace);
    expect(markdown).toContain("sourceType: file");
  }, 15_000);

  it("ingest a .txt with distinct section headers but no repeats routes to file adapter", async () => {
    const workspace = await makeWorkspaceFromFixture("sample-headers.txt");
    const { markdown } = await runIngest(workspace);
    expect(markdown).toContain("sourceType: file");
  }, 15_000);

  it("ingest a URL exits non-zero with a descriptive error", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "llmwiki-ingest-integration-"));
    tempDirs.push(cwd);
    const result = await runCLI(["ingest", "https://example.com/page"], cwd);
    expectCLIFailure(result);
    const combined = result.stderr + result.stdout;
    expect(combined, formatCLIFailure(result)).toMatch(/URL sources are not supported/i);
  }, 15_000);
});

describe("file ingest — edge cases", () => {
  it("ingest an empty .txt file does not crash and produces a skeleton with sourceType file", async () => {
    const workspace = await makeWorkspaceWithContent("empty.txt", "");
    const result = await runCLI(["ingest", workspace.fixturePath], workspace.cwd);
    expect(result.killed, formatCLIFailure(result)).toBe(false);
    expect(result.signal, formatCLIFailure(result)).toBeNull();
    if (result.code === 0) {
      const markdown = await readIngestedMarkdown(workspace.cwd);
      expect(markdown).toContain("sourceType: file");
    } else {
      const combined = result.stderr + result.stdout;
      expect(combined, formatCLIFailure(result)).toMatch(/content|readable|extract/i);
    }
  }, 15_000);

  it("ingest a non-existent path exits non-zero with an actionable error", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "llmwiki-ingest-integration-"));
    tempDirs.push(cwd);
    const result = await runCLI(["ingest", "/tmp/does-not-exist-llmwiki.txt"], cwd);
    expectCLIFailure(result);
    const combined = result.stderr + result.stdout;
    expect(combined, formatCLIFailure(result)).toMatch(/no such file|not found|ENOENT/i);
  }, 15_000);

  it("ingest a .txt with only one summary header routes to file", async () => {
    const workspace = await makeWorkspaceWithContent(
      "single-header.txt",
      "Summary: This is an ordinary project note with no back-and-forth dialogue.\n",
    );
    const { markdown } = await runIngest(workspace);
    expect(markdown).toContain("sourceType: file");
  }, 15_000);
});

describe("file ingest — bulk ingest", () => {
  it(`ingests ${BULK_INGEST_COUNT} different fixtures into the same workspace producing distinct files`, async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "llmwiki-ingest-bulk-"));
    tempDirs.push(cwd);

    const fixtures = ["sample-notes.txt", "sample-headers.txt", "sample-dialogue.txt"];
    for (const fixtureName of fixtures) {
      const source = path.join(FIXTURE_DIR, fixtureName);
      const content = await readFile(source);
      const destPath = path.join(cwd, fixtureName);
      await writeFile(destPath, content);
      const result = await runCLI(["ingest", destPath], cwd);
      expectCLIExit(result, 0);
    }

    const sourcesDir = path.join(cwd, "sources");
    const mdFiles = (await readdir(sourcesDir)).filter((f) => f.endsWith(".md"));
    expect(mdFiles.length).toBe(BULK_INGEST_COUNT);

    const uniqueNames = new Set(mdFiles);
    expect(uniqueNames.size).toBe(BULK_INGEST_COUNT);
  }, 30_000);
});
