# LLM プロバイダー実装を削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/providers/` ディレクトリ全体と関連ユーティリティ（`src/utils/provider.ts`, `src/utils/claude-settings.ts`）を削除する。

## 根拠

LLMAdapter 注入パターンの導入（issue-001〜003）により、プロバイダーの選択と実装はユーザー側の責務に移行する。パッケージ内の Anthropic / OpenAI / Ollama / Copilot / MiniMax プロバイダー実装は不要になる。

## 対応方針

- `src/providers/` ディレクトリ全体を削除（anthropic.ts, openai.ts, ollama.ts, copilot.ts, minimax.ts）
- `src/utils/provider.ts`（`getProvider()`, `getActiveProviderName()`）を削除
- `src/utils/claude-settings.ts`（Anthropic 固有の設定解決）を削除
- 削除したファイルへの import を全て除去
- `src/utils/constants.ts` からプロバイダー関連定数（`DEFAULT_PROVIDER`, `PROVIDER_MODELS`, `OLLAMA_DEFAULT_HOST` 等）を除去

## 解決方法

以下のファイルを削除した:
- `src/providers/` 全体（anthropic.ts, openai.ts, ollama.ts, copilot.ts, minimax.ts）
- `src/utils/provider.ts`
- `src/utils/claude-settings.ts`

削除ファイルへの import を全て除去:
- `src/utils/embeddings.ts`: `getProvider`/`getActiveProviderName` を除去し、`embed()` をスタブ（常に throws）に変更
- `src/utils/constants.ts`: プロバイダー関連定数を除去
- `src/mcp/provider-check.ts`: スタブに変更（常に throws）
- `src/ingest/image.ts`: スタブに変更（常に throws）
- `src/cli.ts`: `requireProvider()`・`DEFAULT_PROVIDER`・`resolveAnthropicAuthFromEnv` の使用を削除
- `package.json`: `@anthropic-ai/sdk`・`openai` を依存から除去

プロバイダーに依存するテストファイルを削除・更新:
- 削除: provider-factory, provider-anthropic, provider-openai, provider-copilot, provider-timeout, claude-settings, embed, aimock-smoke, chunked-retrieval-aimock, output-language-integration, output-language-query-integration, prompt-blowup-integration の各テスト
- 更新: compile-claim-provenance, compile-provenance, review, review-provenance-integration, seed-pages-early-return をプロバイダースタブから `LLMAdapter` モック注入パターンに変換
