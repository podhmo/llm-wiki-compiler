/**
 * Commander action for `llmwiki ingest <source>`.
 *
 * Accepts a local file path (.md or .txt), delegates to the file ingestion
 * module, and saves the result as a markdown file with YAML frontmatter in
 * the sources/ directory.
 *
 * URL sources are not supported; pass a local file path instead.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { buildFrontmatter, parseFrontmatter, slugify } from "../utils/markdown.js";
import { MAX_SOURCE_CHARS, MIN_SOURCE_CHARS, SOURCES_DIR } from "../utils/constants.js";
import * as output from "../utils/output.js";
import ingestFile from "../ingest/file.js";
import type { IngestResult, SourceType } from "../utils/types.js";

/** Check whether a source string looks like a URL. */
function isUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

/** Truncate result including whether truncation occurred and original length. */
interface TruncateResult {
  content: string;
  truncated: boolean;
  originalChars: number;
}

/** Truncate content if it exceeds the character limit, logging a warning. */
export function enforceCharLimit(content: string): TruncateResult {
  if (content.length <= MAX_SOURCE_CHARS) {
    return { content, truncated: false, originalChars: content.length };
  }

  output.status(
    "!",
    output.warn(
      `Content truncated from ${content.length.toLocaleString()} to ${MAX_SOURCE_CHARS.toLocaleString()} characters.`
    )
  );
  return {
    content: content.slice(0, MAX_SOURCE_CHARS),
    truncated: true,
    originalChars: content.length,
  };
}

/** Reject empty content and warn when content is trivially short. */
function enforceMinContent(content: string): void {
  const length = content.trim().length;

  if (length === 0) {
    throw new Error(
      "No readable content could be extracted from the source."
    );
  }

  if (length < MIN_SOURCE_CHARS) {
    output.status(
      "!",
      output.warn(
        `Content seems very short (${length} chars, minimum recommended is ${MIN_SOURCE_CHARS}).`
      )
    );
  }
}

/**
 * Determine the source type for a given source string.
 *
 * Only local file paths are supported. Throws a descriptive error when a
 * URL is provided so callers get an actionable message instead of a
 * cryptic read failure.
 *
 * @param source - A local file path.
 * @returns The detected SourceType ("file").
 * @throws When source is a URL.
 */
export async function detectSourceType(source: string): Promise<SourceType> {
  if (isUrl(source)) {
    throw new Error(
      `URL sources are not supported. Download the content locally and ingest the file directly: ${source}`
    );
  }
  return "file";
}

/** Build the full markdown document with frontmatter. */
export function buildDocument(
  title: string,
  source: string,
  result: TruncateResult,
  sourceType?: SourceType,
): string {
  const meta: Record<string, unknown> = {
    title,
    source,
    ingestedAt: new Date().toISOString(),
  };
  if (sourceType !== undefined) {
    meta.sourceType = sourceType;
  }
  if (result.truncated) {
    meta.truncated = true;
    meta.originalChars = result.originalChars;
  }
  const frontmatter = buildFrontmatter(meta);

  return `${frontmatter}\n\n${result.content}\n`;
}

/** Length of the hex hash suffix appended to disambiguate basename collisions. */
const COLLISION_HASH_LEN = 8;

/**
 * Compute a short, stable hex hash of a source identifier. Stability
 * matters — re-ingesting the same source must always produce the same
 * hash so existing files are overwritten cleanly.
 */
function shortHashOfSource(source: string): string {
  return createHash("sha256").update(source).digest("hex").slice(0, COLLISION_HASH_LEN);
}

/**
 * Resolve the destination filename for a slug + source identity.
 * Handles collision avoidance for distinct sources that share a basename.
 */
async function resolveCollisionFreeFilename(slug: string, source: string): Promise<string> {
  const candidate = `${slug}.md`;
  const candidatePath = path.join(SOURCES_DIR, candidate);
  let existing: string;
  try {
    existing = await readFile(candidatePath, "utf-8");
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "ENOENT") return candidate;
    throw err;
  }
  const { meta } = parseFrontmatter(existing);
  if (typeof meta.source === "string" && meta.source === source) {
    return candidate;
  }
  return `${slug}-${shortHashOfSource(source)}.md`;
}

/**
 * Write a markdown document into `sources/` under a slug derived from
 * the title, applying the empty-slug guard and basename-collision
 * disambiguation. Returns the resolved destination path.
 */
async function saveSource(title: string, document: string, source: string): Promise<string> {
  const slug = slugify(title);
  if (!slug) {
    throw new Error(
      `Could not derive a filename from title "${title}". ` +
        `The title contains no letter or number characters. ` +
        `Rename the source file to one with at least one letter or digit.`,
    );
  }
  await mkdir(SOURCES_DIR, { recursive: true });
  const filename = await resolveCollisionFreeFilename(slug, source);
  const destPath = path.join(SOURCES_DIR, filename);
  await writeFile(destPath, document, "utf-8");
  return destPath;
}

/**
 * Programmatic ingest entry point. Identical fetch + write logic to the CLI
 * command but returns a structured IngestResult instead of writing to stdout.
 *
 * @param source - A local file path (.md or .txt).
 * @returns Saved filename, character count, truncation flag, source URI, and detected source type.
 */
async function ingestSource(source: string): Promise<IngestResult> {
  const sourceType = await detectSourceType(source);
  output.status("*", output.info(`Ingesting [${sourceType}]: ${source}`));

  const { title, content } = await ingestFile(source);

  const result = enforceCharLimit(content);
  enforceMinContent(result.content);
  const document = buildDocument(title, source, result, sourceType);
  const savedPath = await saveSource(title, document, source);

  return {
    filename: path.basename(savedPath),
    charCount: result.content.length,
    truncated: result.truncated,
    source,
    sourceType,
  };
}

/**
 * Ingest a local file and save it to the sources/ directory.
 * @param source - A local file path (.md or .txt).
 */
export default async function ingest(source: string): Promise<void> {
  const result = await ingestSource(source);
  const savedPath = path.join(SOURCES_DIR, result.filename);

  output.status(
    "+",
    output.success(`Saved ${output.bold(result.filename)} → ${output.source(savedPath)}`)
  );
  output.status("→", output.dim("Next: llmwiki compile"));
}
