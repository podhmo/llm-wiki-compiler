# LLMAdapter インターフェースを定義する

Created: 2026-05-14

## 概要

`src/types/llm-adapter.ts` に `LLMAdapter` インターフェースを新規作成する。ユーザーが LLM 呼び出しを注入するための型定義。

## 根拠

現状の `callClaude()` は内部で `getProvider()` を呼び、環境変数に応じて Anthropic / OpenAI / Ollama 等のプロバイダーを自動選択している。このプロバイダー選択と各 SDK への依存がパッケージの肥大化の主因である（[ADR #1](../01adr-command-builder.md)）。

LLM 呼び出しを `string → string` に近い抽象で外部から注入可能にすることで、AI SDK への直接依存を取り除きつつ compile/query 機能を保持できる。

## 対応方針

- `src/types/llm-adapter.ts` を新規作成
- `LLMAdapter` インターフェースを定義:
  - `complete(options: { system: string; prompt: string; maxTokens?: number }): Promise<string>` — 必須
  - `stream?(options: { system: string; prompt: string; maxTokens?: number; onToken: (text: string) => void }): Promise<string>` — オプション
  - `toolCall?(options: { system: string; prompt: string; tools: ToolDefinition[]; maxTokens?: number }): Promise<string>` — オプション
- `stream` / `toolCall` 未実装時は `complete` にフォールバックするヘルパーも用意
- `WikiCompilerOptions` 型（`{ llm: LLMAdapter; root?: string }`）も同ファイルで定義

Completed: 2026-05-14
Model: claude-sonnet-4-5

## 解決方法

 を新規作成し、以下のインターフェースを定義した:
- : （必須）・・ メソッドを持つ
- : ツール呼び出し型定義
- : 

 の / フォールバックロジックは  で実装済み。
