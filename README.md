> [!IMPORTANT]
> Personal fork of https://github.com/atomicstrata/llm-wiki-compiler — do not merge.

# llmwiki

A knowledge compiler CLI — raw sources in, interlinked wiki out.

Inspired by Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: instead of re-discovering knowledge at query time, compile it once into a persistent, browsable artifact that compounds over time.

## Who this is for

- **AI researchers and engineers** building persistent knowledge from papers, docs, and notes
- **Technical writers** compiling scattered sources into a structured, interlinked reference
- **Anyone with too many bookmarks** who wants a wiki instead of a graveyard of tabs

## Quick start

```bash
npm install llm-wiki-compiler
npx llmwiki init
```

This generates a `llmwiki.config.ts` template. Implement your LLM adapter, then use the CLI:

```bash
npx llmwiki ingest ./my-article.md
npx llmwiki lint
npx llmwiki export
```

For LLM-powered features (compile, query), use the library API:

```typescript
import { createWikiCompiler } from "llm-wiki-compiler";

const wiki = createWikiCompiler({
  llm: {
    complete: async ({ system, prompt }) => {
      // Connect your preferred LLM here (OpenAI, Anthropic, Ollama, etc.)
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      });
      return response.choices[0].message.content ?? "";
    },
  },
});

await wiki.compile();
const result = await wiki.query("What is X?");
```

## Architecture: Command Builder Pattern

llmwiki is a **command builder**, not a monolithic CLI. It ships with built-in commands for tasks that don't need an LLM (ingest, lint, export, schema). LLM-dependent features (compile, query) are available as library functions through `createWikiCompiler()`.

This means:

- **No AI SDK bundled** — you bring your own LLM (OpenAI, Anthropic, Ollama, local models, etc.)
- **Minimal dependencies** — only `commander` and `js-yaml` at runtime
- **Full control** — implement only `complete()` for the simplest case; optionally add `stream()` and `toolCall()` for richer behaviour

### LLMAdapter interface

```typescript
interface LLMAdapter {
  /** Required: basic text completion. */
  complete(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string>;

  /** Optional: streaming (falls back to complete). */
  stream?(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
    onToken: (text: string) => void;
  }): Promise<string>;

  /** Optional: structured tool calls (falls back to complete). */
  toolCall?(options: {
    system: string;
    prompt: string;
    tools: ToolDefinition[];
    maxTokens?: number;
  }): Promise<string>;
}
```

### Example configurations

**OpenAI:**

```typescript
import OpenAI from "openai";
import { createWikiCompiler } from "llm-wiki-compiler";

const openai = new OpenAI();

const wiki = createWikiCompiler({
  llm: {
    complete: async ({ system, prompt, maxTokens }) => {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      });
      return res.choices[0].message.content ?? "";
    },
  },
});
```

**Anthropic:**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createWikiCompiler } from "llm-wiki-compiler";

const anthropic = new Anthropic();

const wiki = createWikiCompiler({
  llm: {
    complete: async ({ system, prompt, maxTokens }) => {
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens ?? 4096,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      return res.content[0].type === "text" ? res.content[0].text : "";
    },
  },
});
```

**Ollama (local):**

```typescript
import { createWikiCompiler } from "llm-wiki-compiler";

const wiki = createWikiCompiler({
  llm: {
    complete: async ({ system, prompt }) => {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3.1", system, prompt, stream: false }),
      });
      const json = await res.json();
      return json.response;
    },
  },
});
```

## Built-in CLI Commands

| Command | What it does |
|---------|-------------|
| `llmwiki init` | Generate a `llmwiki.config.ts` starter template |
| `llmwiki ingest <file>` | Copy a local file into `sources/` |
| `llmwiki lint` | Run rule-based quality checks against the wiki |
| `llmwiki export [--target <name>]` | Export wiki content to portable formats (llms.txt, JSON) |
| `llmwiki schema init` | Write a starter `.llmwiki/schema.json` file |
| `llmwiki schema show` | Print the resolved schema for this project |

### Library API (via `createWikiCompiler`)

| Method | What it does |
|--------|-------------|
| `wiki.compile()` | Incremental compile: extract concepts, generate wiki pages |
| `wiki.compileAndReport()` | Compile and return a structured `CompileResult` |
| `wiki.query(question)` | Two-step grounded answer using the wiki |

## Why not just RAG?

RAG retrieves chunks at query time. Every question re-discovers the same relationships from scratch. Nothing accumulates.

llmwiki **compiles** your sources into a wiki. Concepts get their own pages. Pages link to each other. When you ask a question with `save: true`, the answer becomes a new page, and future queries use it as context. Your explorations compound.

```
RAG:     query → search chunks → answer → forget
llmwiki: sources → compile → wiki → query → save → richer wiki → better answers
```

## How it works

```
sources/  →  SHA-256 hash check  →  LLM concept extraction  →  wiki page generation  →  [[wikilink]] resolution  →  index.md
```

**Two-phase pipeline.** Phase 1 extracts all concepts from all sources. Phase 2 generates pages. This eliminates order-dependence, catches failures before writing anything, and merges concepts shared across multiple sources into single pages.

**Incremental.** Only changed sources go through the LLM. Everything else is skipped via hash-based change detection.

**Compounding queries.** `wiki.query(question, root, { save: true })` writes the answer as a wiki page and immediately rebuilds the index. Saved answers show up in future queries as context.

### What it produces

```yaml
---
title: Knowledge Compilation
summary: Techniques for converting knowledge representations into forms that support efficient reasoning.
kind: concept
sources:
  - knowledge-compilation.md
createdAt: "2026-04-05T12:00:00Z"
updatedAt: "2026-04-05T12:00:00Z"
---
```

Pages include source attribution in frontmatter. Paragraphs are annotated with `^[filename.md]` markers pointing back to the source file that contributed the content; specific claims can use line ranges like `^[filename.md:42-58]` or `^[filename.md#L42-L58]`.

## Output

```
wiki/
  concepts/         one .md file per concept, with YAML frontmatter
  queries/          saved query answers, included in index and retrieval
  index.md          auto-generated table of contents
.llmwiki/
  schema.json       optional page-kind and cross-link policy
```

Obsidian-compatible. `[[wikilinks]]` resolve to concept titles.

## Page metadata

Compiled pages can carry epistemic metadata in frontmatter so consumers know how trustworthy each page is. All fields are optional and existing pages without them continue to work.

```yaml
---
title: Knowledge Compilation
summary: Techniques for converting knowledge representations...
sources:
  - knowledge-compilation.md
confidence: 0.82           # 0–1, LLM-reported confidence in the synthesized page
provenanceState: merged    # extracted | merged | inferred | ambiguous
contradictedBy:
  - slug: probabilistic-reasoning
---
```

`llmwiki lint` surfaces this metadata:

- `low-confidence` — flags pages with `confidence` below a threshold
- `contradicted-page` — flags pages with non-empty `contradictedBy`
- `excess-inferred-paragraphs` — flags pages whose body has too many uncited prose paragraphs

## Claim-level provenance

Paragraph citations use the source-marker form:

```markdown
This paragraph is grounded in the source. ^[source.md]
```

For claims that need tighter verification, pages can pin a statement to a line range:

```markdown
The system uses a two-phase compile pipeline. ^[architecture-notes.md:42-58]
The same range can also use GitHub-style anchors. ^[architecture-notes.md#L42-L58]
```

`llmwiki lint` validates both forms — missing source files, malformed citations, impossible ranges, and out-of-bounds line numbers.

## Schema layer

Projects can optionally define `.llmwiki/schema.json` to shape the wiki beyond flat concept pages.

```bash
llmwiki schema init
llmwiki schema show
```

The schema supports four page kinds:

- `concept` — standalone idea or pattern
- `entity` — specific person, product, organization, or named artifact
- `comparison` — side-by-side analysis across concepts or entities
- `overview` — map page that connects several concepts in a domain

## Requirements

Node.js >= 24.

## License

MIT


## Disclaimer

No LLMs were harmed in the making of this repo.
