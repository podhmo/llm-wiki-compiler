/**
 * Commander action for `llmwiki query <question>`.
 * Two-step LLM-powered wiki query that first selects relevant pages from the
 * wiki index, then streams an answer grounded in those pages. Optionally saves
 * the response as a new page in wiki/queries/.
 *
 * Step 1 - Page Selection: Reads wiki/index.md and asks Claude (via tool_use)
 * to pick the most relevant concept pages for the question.
 *
 * Step 2 - Answer Generation: Loads the selected pages in full and streams
 * a cited answer to the terminal.
 */

import { existsSync } from "fs";
import path from "path";
import { callClaude } from "../utils/llm.js";
import type { ToolDefinition } from "../types/llm-adapter.js";
import type { LLMAdapter } from "../types/llm-adapter.js";
import { atomicWrite, safeReadFile, slugify, buildFrontmatter, parseFrontmatter } from "../utils/markdown.js";
import { generateIndex } from "../compiler/indexgen.js";
import * as output from "../utils/output.js";
import {
  QUERY_PAGE_LIMIT,
  INDEX_FILE,
  CONCEPTS_DIR,
  QUERIES_DIR,
} from "../utils/constants.js";
import type { ChunkCitation, QueryResult, RetrievalDebug } from "../utils/types.js";

/** Directories to search when loading selected pages, in priority order. */
const PAGE_DIRS = [CONCEPTS_DIR, QUERIES_DIR];

/** Tool schema for page selection (provider-agnostic). */
const PAGE_SELECTION_TOOL: ToolDefinition = {
  name: "select_pages",
  description: "Select the most relevant wiki pages to answer a question",
  input_schema: {
    type: "object" as const,
    properties: {
      pages: {
        type: "array",
        items: {
          type: "string",
          description: "Slug of a relevant wiki page (e.g. 'llm-knowledge-bases')",
        },
        maxItems: QUERY_PAGE_LIMIT,
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of why these pages were selected",
      },
    },
    required: ["pages", "reasoning"],
  },
};

interface PageSelectionResult {
  pages: string[];
  reasoning: string;
}

/**
 * Select the most relevant wiki pages for a question using Claude tool_use.
 * @param question - The user's natural language question.
 * @param indexContent - The full text of wiki/index.md.
 * @param llm - LLM adapter to use for the call.
 * @returns Parsed page slugs and reasoning from Claude.
 */
async function selectPages(
  question: string,
  indexContent: string,
  llm: LLMAdapter,
): Promise<PageSelectionResult> {
  const systemPrompt =
    "You are a knowledge base assistant. Given a question and a wiki index, select the most relevant pages.";

  const userMessage = `Question: ${question}\n\nWiki Index:\n${indexContent}`;

  const rawResult = await callClaude(llm, {
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: [PAGE_SELECTION_TOOL],
  });

  try {
    const parsed = JSON.parse(rawResult);
    return {
      pages: Array.isArray(parsed.pages) ? parsed.pages.filter((p: unknown) => typeof p === "string") : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided",
    };
  } catch {
    return { pages: [], reasoning: "Failed to parse page selection response" };
  }
}

/** Render a list of candidate pages in the same bullet format selectPages() consumes. */
function buildFilteredIndex(
  candidates: Array<{ slug: string; title: string; summary: string }>,
): string {
  return candidates
    .map((entry) => `- **${entry.slug}**: ${entry.title} — ${entry.summary}`)
    .join("\n");
}

interface SelectedPages {
  pages: string[];
  rawPages: string[];
  reasoning: string;
  /** Chunk citations driving the selection — empty when chunk store is absent. */
  chunks: ChunkCitation[];
  /** Debug snapshot of the retrieval pipeline (only populated in debug mode). */
  debug?: RetrievalDebug;
}

/**
 * Pick relevant pages by sending the full wiki index to the LLM for selection.
 * Previously supported chunk-level and page-level embedding pre-filters;
 * those were removed along with the embeddings subsystem (issue-011).
 */
async function selectRelevantPages(
  root: string,
  question: string,
  _debug: boolean,
  llm: LLMAdapter,
): Promise<SelectedPages> {
  const indexContent = await safeReadFile(path.join(root, INDEX_FILE));
  const { pages: rawPages, reasoning } = await selectPages(question, indexContent, llm);
  return { pages: rawPages.map((p) => slugify(p)), rawPages, reasoning, chunks: [] };
}

/**
 * Load the full content of each selected wiki page.
 * Skips pages that don't exist and warns the user.
 * @param root - Absolute path to the project root directory.
 * @param slugs - Array of page slugs to load from wiki/concepts/.
 * @returns Combined page contents with slug headers for context.
 */
export async function loadSelectedPages(root: string, slugs: string[]): Promise<string> {
  const sections: string[] = [];

  for (const slug of slugs) {
    let content = "";
    for (const dir of PAGE_DIRS) {
      const candidate = await safeReadFile(path.join(root, dir, `${slug}.md`));
      if (!candidate) continue;
      const { meta } = parseFrontmatter(candidate);
      if (meta.orphaned) continue;
      content = candidate;
      break;
    }

    if (!content) {
      output.status("?", output.warn(`Page not found: ${slug}.md — skipping`));
      continue;
    }

    sections.push(`--- Page: ${slug} ---\n${content}`);
  }

  return sections.join("\n\n");
}

/** Base system prompt for answer generation. */
const ANSWER_SYSTEM_PROMPT_BASE =
  "You are a knowledge assistant. Answer the question using ONLY the wiki content provided. " +
  "Cite specific pages using [[Page Title]] wikilinks. " +
  "If the wiki doesn't contain enough information, say so.";

/**
 * Build the answer-generation system prompt.
 * Previously appended an output-language directive; that feature was
 * removed with output-language.ts (issue-011).
 */
function buildAnswerSystemPrompt(): string {
  return ANSWER_SYSTEM_PROMPT_BASE;
}

/**
 * Call the LLM with the loaded wiki pages as grounding context. When chunk
 * citations are available, they are attached as a "Most relevant excerpts"
 * section so the model can prioritise the precise paragraphs that drove
 * page selection.
 */
async function callAnswerLLM(
  question: string,
  pagesContent: string,
  chunks: ChunkCitation[],
  llm: LLMAdapter,
  onToken?: (text: string) => void,
): Promise<string> {
  const provenance = chunks.length > 0 ? buildChunkProvenance(chunks) : "";
  const userMessage =
    `Question: ${question}\n\nRelevant wiki pages:\n${pagesContent}${provenance}`;
  return callClaude(llm, {
    system: buildAnswerSystemPrompt(),
    messages: [{ role: "user", content: userMessage }],
    stream: Boolean(onToken),
    onToken,
  });
}

/** Render the top chunk excerpts as a labelled section appended to the prompt. */
function buildChunkProvenance(chunks: ChunkCitation[]): string {
  const sections = chunks.map(
    (chunk) => `--- ${chunk.slug} (chunk ${chunk.chunkIndex}) ---\n${chunk.text}`,
  );
  return `\n\nMost relevant excerpts (from chunk-level retrieval):\n${sections.join("\n\n")}`;
}

/**
 * Generate a one-line summary from the answer for use in the wiki index.
 * Takes the first sentence (up to 120 chars) so the page-selection LLM
 * has retrieval signal beyond just the title.
 * @param answer - The full answer text.
 * @returns A short summary string.
 */
export function summarizeAnswer(answer: string): string {
  const firstLine = answer.trim().split(/\n/)[0] ?? "";
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0] ?? firstLine;
  return firstSentence.slice(0, 120);
}

/**
 * Save a query answer as a wiki page in the queries/ directory,
 * then regenerate the wiki index so the answer is immediately retrievable.
 * @param root - Absolute path to the project root directory.
 * @param question - The original question used as the page title.
 * @param answer - The generated answer body.
 */
async function saveQueryPage(root: string, question: string, answer: string): Promise<string> {
  const slug = slugify(question);
  const filePath = path.join(root, QUERIES_DIR, `${slug}.md`);

  const frontmatter = buildFrontmatter({
    title: question,
    summary: summarizeAnswer(answer),
    type: "query",
    createdAt: new Date().toISOString(),
  });

  const document = `${frontmatter}\n\n${answer}\n`;
  await atomicWrite(filePath, document);

  output.status(
    "+",
    output.success(`Saved query → ${output.source(filePath)}`),
  );

  // Regenerate the index so the saved query is immediately discoverable
  // by the next query's page-selection step.
  await generateIndex(root);

  return slug;
}

/** Options for generateAnswer — programmatic-friendly. */
export interface GenerateAnswerOptions {
  /** Persist the answer as a wiki query page when set. */
  save?: boolean;
  /** Per-token callback for streaming. Omit for non-streaming usage. */
  onToken?: (text: string) => void;
  /** Callback fired once page selection completes — lets CLIs print reasoning before streaming. */
  onPageSelection?: (pages: string[], reasoning: string) => void;
  /** Capture chunk-level provenance + scoring detail in the result. */
  debug?: boolean;
}

/**
 * Run the two-step page-selection + answer-generation pipeline and return
 * a structured QueryResult. This is the programmatic entry point used by
 * the MCP server and any non-CLI consumer.
 *
 * @param root - Absolute path to the project root directory.
 * @param question - The natural language question to answer.
 * @param llm - LLM adapter to use for page selection and answer generation.
 * @param options - Streaming + save behaviour controls.
 * @returns Answer text, selected slugs, reasoning, and saved slug if applicable.
 */
export async function generateAnswer(
  root: string,
  question: string,
  llm: LLMAdapter,
  options: GenerateAnswerOptions = {},
): Promise<QueryResult> {
  if (!existsSync(path.join(root, INDEX_FILE))) {
    throw new Error("Wiki index not found. Run `llmwiki compile` first.");
  }

  const selection = await selectRelevantPages(root, question, Boolean(options.debug), llm);
  options.onPageSelection?.(selection.pages, selection.reasoning);

  const pagesContent = await loadSelectedPages(root, selection.pages);

  if (!pagesContent) {
    return buildEmptyResult(selection);
  }

  const answer = await callAnswerLLM(question, pagesContent, selection.chunks, llm, options.onToken);
  const saved = options.save ? await saveQueryPage(root, question, answer) : undefined;

  return {
    answer,
    selectedPages: selection.pages,
    reasoning: selection.reasoning,
    saved,
    debug: selection.debug,
  };
}

/** Build the empty-pages result while preserving any debug/chunk context. */
function buildEmptyResult(selection: SelectedPages): QueryResult {
  return {
    answer: "",
    selectedPages: selection.pages,
    reasoning: selection.reasoning,
    debug: selection.debug,
  };
}

/**
 * Run a two-step LLM-powered query against the knowledge wiki.
 * @param root - Absolute path to the project root directory.
 * @param question - The natural language question to answer.
 * @param options - Command options (e.g. --save to persist the answer).
 * @param llm - LLM adapter; required to generate an answer.
 */
async function queryCommand(
  root: string,
  question: string,
  options: { save?: boolean; debug?: boolean },
  llm?: LLMAdapter,
): Promise<void> {
  if (!existsSync(path.join(root, INDEX_FILE))) {
    output.status("!", output.error("Wiki index not found. Run `llmwiki compile` first."));
    return;
  }

  if (!llm) {
    output.status("!", output.error(
      "LLM adapter not configured. Use createWikiCompiler({ llm }) to provide an adapter.",
    ));
    process.exit(1);
    return;
  }

  output.header("Selecting relevant pages");

  const result = await generateAnswer(root, question, llm, {
    save: options.save,
    debug: options.debug,
    onToken: (text) => process.stdout.write(text),
    onPageSelection: (pages, reasoning) => {
      output.status("i", output.dim(`Reasoning: ${reasoning}`));
      output.status("*", output.info(`Selected ${pages.length} page(s): ${pages.join(", ")}`));
      output.header("Generating answer");
    },
  });

  // Newline after streamed answer so subsequent terminal output formats cleanly.
  process.stdout.write("\n");

  if (result.debug) printDebugSnapshot(result.debug);

  if (!result.answer) {
    output.status("!", output.error("No matching pages found. Try refining your question."));
    return;
  }

  if (result.saved) {
    output.status("→", output.dim("Saved. Future queries will use this answer as context."));
  } else {
    output.status("→", output.dim("Tip: use --save to add this answer to your wiki"));
  }
}

/** Render the retrieval debug snapshot to the terminal for human inspection. */
function printDebugSnapshot(debug: RetrievalDebug): void {
  output.header("Retrieval debug");
  output.status(
    "i",
    output.dim(
      `Source: ${debug.usedChunks ? "chunk-level" : "page-level"}; ` +
      `reranked: ${debug.reranked ? "yes" : "no"}`,
    ),
  );
  for (const page of debug.pages) {
    output.status("•", `${page.slug} (best chunk score ${page.score.toFixed(3)})`);
  }
  for (const chunk of debug.chunks) {
    const preview = chunk.text.slice(0, DEBUG_CHUNK_PREVIEW_CHARS).replace(/\s+/g, " ").trim();
    output.status(
      "·",
      output.dim(`${chunk.slug}#${chunk.chunkIndex} score=${chunk.score.toFixed(3)} :: ${preview}…`),
    );
  }
}

/** Maximum chunk preview length printed in --debug output. */
const DEBUG_CHUNK_PREVIEW_CHARS = 120;
