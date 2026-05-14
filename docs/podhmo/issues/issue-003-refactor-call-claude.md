# callClaude() を LLMAdapter ラッパーに書き換える

Created: 2026-05-14

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
