/**
 * LLMAdapter mock injection tests.
 *
 * Verifies that createWikiCompiler correctly routes LLM calls through
 * the user-supplied adapter, including fallback behaviour when the
 * optional `stream` and `toolCall` methods are absent.
 *
 * These tests exercise the adapter dispatch layer in isolation — they
 * don't need a real wiki on disk; they validate that callClaude
 * correctly delegates to the injected adapter methods.
 */

import { describe, it, expect, vi } from "vitest";
import { callClaude } from "../src/utils/llm.js";
import type { LLMAdapter } from "../src/types/llm-adapter.js";

describe("LLMAdapter mock injection", () => {
  it("routes a basic call through complete()", async () => {
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("hello from mock"),
    };

    const result = await callClaude(adapter, {
      system: "You are a test.",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result).toBe("hello from mock");
    expect(adapter.complete).toHaveBeenCalledOnce();
    expect(adapter.complete).toHaveBeenCalledWith(
      expect.objectContaining({ system: "You are a test.", prompt: "Hi" }),
    );
  });

  it("falls back to complete() when stream is not implemented", async () => {
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("fallback response"),
    };

    const onToken = vi.fn();
    const result = await callClaude(adapter, {
      system: "sys",
      messages: [{ role: "user", content: "msg" }],
      stream: true,
      onToken,
    });

    expect(result).toBe("fallback response");
    expect(adapter.complete).toHaveBeenCalledOnce();
  });

  it("uses stream() when implemented and streaming is requested", async () => {
    const streamFn = vi.fn().mockResolvedValue("streamed response");
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("should not be called"),
      stream: streamFn,
    };

    const onToken = vi.fn();
    const result = await callClaude(adapter, {
      system: "sys",
      messages: [{ role: "user", content: "msg" }],
      stream: true,
      onToken,
    });

    expect(result).toBe("streamed response");
    expect(streamFn).toHaveBeenCalledOnce();
    expect(adapter.complete).not.toHaveBeenCalled();
  });

  it("falls back to complete() when toolCall is not implemented", async () => {
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue('{"pages":[],"reasoning":"none"}'),
    };

    const result = await callClaude(adapter, {
      system: "sys",
      messages: [{ role: "user", content: "msg" }],
      tools: [{ name: "select_pages", description: "Select pages", input_schema: { type: "object" } }],
    });

    expect(result).toBe('{"pages":[],"reasoning":"none"}');
    expect(adapter.complete).toHaveBeenCalledOnce();
  });

  it("uses toolCall() when implemented and tools are provided", async () => {
    const toolCallFn = vi.fn().mockResolvedValue('{"pages":["a"],"reasoning":"found"}');
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("should not be called"),
      toolCall: toolCallFn,
    };

    const tools = [{ name: "select_pages", description: "Select pages", input_schema: { type: "object" } }];
    const result = await callClaude(adapter, {
      system: "sys",
      messages: [{ role: "user", content: "msg" }],
      tools,
    });

    expect(result).toBe('{"pages":["a"],"reasoning":"found"}');
    expect(toolCallFn).toHaveBeenCalledOnce();
    expect(adapter.complete).not.toHaveBeenCalled();
  });

  it("passes maxTokens through to the adapter", async () => {
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("ok"),
    };

    await callClaude(adapter, {
      system: "sys",
      messages: [{ role: "user", content: "msg" }],
      maxTokens: 2048,
    });

    expect(adapter.complete).toHaveBeenCalledWith(
      expect.objectContaining({ maxTokens: 2048 }),
    );
  });

  it("concatenates multi-turn messages into the prompt", async () => {
    const adapter: LLMAdapter = {
      complete: vi.fn().mockResolvedValue("ok"),
    };

    await callClaude(adapter, {
      system: "sys",
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "Follow up" },
      ],
    });

    const call = (adapter.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.prompt).toContain("Hello");
    expect(call.prompt).toContain("Hi there");
    expect(call.prompt).toContain("Follow up");
  });
});
