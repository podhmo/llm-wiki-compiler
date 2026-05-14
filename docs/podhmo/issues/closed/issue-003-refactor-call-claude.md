# callClaude() を LLMAdapter ラッパーに書き換える

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/utils/llm.ts` の `callClaude()` を、注入された `LLMAdapter` のラッパーに書き換える。グローバルプロバイダー選択（`getProvider()`）を廃止する。

## 根拠

現在の `callClaude()` は `getProvider()` を内部で呼び出し、環境変数ベースでプロバイダーを自動選択している。この仕組みが `@anthropic-ai/sdk`, `openai` 等の SDK への直接依存を生んでいる。

`LLMAdapter` を外部から受け取る形に変えることで、プロバイダー実装をパッケージから除去できる。

## 対応方針

- `callClaude()` のシグネチャを変更し、`LLMAdapter` インスタンスを引数（またはコンテキスト経由）で受け取る形にする
- `getProvider()` の呼び出しを除去
- リトライロジック（exponential backoff）は残す
- `stream` モードは `LLMAdapter.stream` があればそちらを使い、なければ `complete` にフォールバック
- `tools` モードは `LLMAdapter.toolCall` があればそちらを使い、なければ `complete` にフォールバック

## 解決方法

`callClaude()` のシグネチャを `callClaude(llm: LLMAdapter, options: CallClaudeOptions)` に変更した。
`getProvider()` 呼び出しを除去し、`dispatchLLMCall()` ヘルパーで `stream`/`toolCall`/`complete` を振り分ける実装に変更。
リトライロジック（exponential backoff）は保持。
`compiler/index.ts`・`commands/query.ts` 全体にわたって `llm: LLMAdapter | undefined` を貫通させ、
`requireLLM(llm)` ヘルパーで LLM が未設定の場合に明確なエラーを投げる。
`compile()`・`compileAndReport()` の公開シグネチャも `llm?: LLMAdapter` を追加した。
