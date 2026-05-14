/**
 * Subprocess-level acceptance tests for the schema layer.
 *
 * These tests complement the in-process unit tests in schema-violations.test.ts
 * by exercising schema behaviours through the compiled CLI binary.
 *
 * Review-show tests removed — review commands deleted (issue-010).
 *
 * dist/cli.js is built once via vitest globalSetup (see test/global-setup.ts).
 */

import { describe, it, expect } from "vitest";
import path from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { runCLI, expectCLIExit } from "./fixtures/run-cli.js";

/** Create a fresh temporary project directory with a sources/ sub-folder. */
async function makeTempProject(label: string): Promise<string> {
  const dir = path.join(tmpdir(), `llmwiki-subproc-${label}-${Date.now()}`);
  await mkdir(path.join(dir, "sources"), { recursive: true });
  return dir;
}

/** Remove a temporary project directory. */
async function cleanupDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

describe("schema subprocess tests", () => {
  it("schema show prints resolved schema", async () => {
    const cwd = await makeTempProject("schema-show");
    try {
      const result = await runCLI(["schema", "show"], cwd);
      expectCLIExit(result, 0);
      expect(result.stdout).toBeTruthy();
    } finally {
      await cleanupDir(cwd);
    }
  }, 30_000);
});
