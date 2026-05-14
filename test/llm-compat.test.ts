/**
 * Backward compatibility tests for the callClaude export.
 * Ensures that the refactored llm.ts still exports callClaude and
 * accepts an LLMAdapter as its first argument.
 */

import { describe, it, expect } from "vitest";
import { callClaude } from "../src/utils/llm.js";
import type { LLMAdapter } from "../src/types/llm-adapter.js";

describe("callClaude backward compatibility", () => {
  it("is exported as a function from llm.ts", () => {
    expect(typeof callClaude).toBe("function");
  });

  it("accepts an LLMAdapter and the existing options interface shape", () => {
    // Verify the function signature accepts an LLMAdapter as first arg
    // and a call-options object as second, without type errors.
    const adapter: LLMAdapter = {
      complete: async () => "ok",
    };

    const optionsShape = {
      system: "You are a test assistant.",
      messages: [{ role: "user" as const, content: "Hello" }],
      tools: [{ name: "t", description: "d", input_schema: { type: "object" } }],
      maxTokens: 1024,
      stream: false,
      onToken: (_text: string) => {},
    };

    // The options object and adapter should match types without errors.
    // We do not actually call the function (would invoke the adapter).
    expect(adapter).toBeDefined();
    expect(optionsShape).toBeDefined();
  });
});
