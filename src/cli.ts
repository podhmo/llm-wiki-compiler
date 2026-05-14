/**
 * CLI entry point for llmwiki — the knowledge compiler.
 *
 * Registers all commands (init, ingest, lint, export, schema) via Commander.
 * LLM-dependent features (compile, query) are available as library functions
 * through createWikiCompiler() — see `llmwiki init` to generate a starter config.
 */

import { createRequire } from "module";
import { Command } from "commander";
import initCommand from "./commands/init.js";
import ingestCommand from "./commands/ingest.js";
import lintCommand from "./commands/lint.js";
import exportCommand from "./commands/export.js";
import { schemaInitCommand, schemaShowCommand } from "./commands/schema.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("llmwiki")
  .description("The knowledge compiler — raw sources in, interlinked wiki out")
  .version(version);

program
  .command("init")
  .description("Generate a llmwiki.config.ts starter template in the current directory")
  .action(async () => {
    try {
      await initCommand();
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("ingest <source>")
  .description("Ingest a URL or local file into sources/")
  .action(async (source: string) => {
    try {
      await ingestCommand(source);
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("lint")
  .description("Run rule-based quality checks against the wiki")
  .action(async () => {
    try {
      await lintCommand();
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

const schemaCmd = program
  .command("schema")
  .description("Inspect or initialize the project's wiki schema config");

schemaCmd
  .command("init")
  .description("Write a starter schema file to .llmwiki/schema.json")
  .action(async () => {
    try {
      await schemaInitCommand();
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

schemaCmd
  .command("show")
  .description("Print the resolved schema for this project")
  .action(async () => {
    try {
      await schemaShowCommand();
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command("export")
  .description("Export wiki content to portable formats (llms.txt, JSON)")
  .option("--target <name>", "Limit export to a single target format")
  .action(async (options: { target?: string }) => {
    try {
      await exportCommand(process.cwd(), options);
    } catch (err) {
      console.error(`\x1b[31mError:\x1b[0m ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse();
