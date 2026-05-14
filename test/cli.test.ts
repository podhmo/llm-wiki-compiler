import { describe, it, expect } from "vitest";
import path from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { exec, CLI } from "./fixtures/cli-runner.js";

async function cleanupDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

describe("CLI smoke tests", () => {
  it("prints help and exits 0", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toContain("llmwiki");
    expect(stdout).toContain("ingest");
    expect(stdout).toContain("lint");
    expect(stdout).toContain("export");
  }, 30_000);

  it("prints version", async () => {
    const { stdout } = await exec("node", [CLI, "--version"]);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  }, 30_000);

  it("init creates llmwiki.config.ts", async () => {
    const cwd = path.join(tmpdir(), `llmwiki-test-init-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    try {
      const { stdout } = await exec("node", [CLI, "init"], { cwd });
      expect(stdout).toContain("llmwiki.config.ts");
    } finally {
      await cleanupDirectory(cwd);
    }
  }, 30_000);

  it("init does not overwrite an existing config", async () => {
    const cwd = path.join(tmpdir(), `llmwiki-test-init-existing-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    const configPath = path.join(cwd, "llmwiki.config.ts");
    await writeFile(configPath, "// existing", "utf8");
    try {
      // The "already exists" warning goes to stderr; stdout may be empty.
      const result = await exec("node", [CLI, "init"], { cwd }).catch((e) => e);
      const combined = (result.stdout ?? "") + (result.stderr ?? "");
      expect(combined).toContain("already exists");
    } finally {
      await cleanupDirectory(cwd);
    }
  }, 30_000);

  it("ingest shows next-step hint", async () => {
    const cwd = path.join(tmpdir(), `llmwiki-test-ingest-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    const fixture = path.resolve("test/fixtures/sample-source.md");
    try {
      const { stdout } = await exec("node", [CLI, "ingest", fixture], { cwd });
      expect(stdout).toContain("Next: llmwiki compile");
    } finally {
      await cleanupDirectory(cwd);
    }
  }, 30_000);
});
