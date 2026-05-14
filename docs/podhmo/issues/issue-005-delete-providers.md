# LLM プロバイダー実装を削除する

Created: 2026-05-14

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
