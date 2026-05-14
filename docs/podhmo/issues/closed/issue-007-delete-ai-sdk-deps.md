# AI サービス SDK を package.json から削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4.5

## 概要

`dotenv` を `package.json` の dependencies から削除し、`src/cli.ts` の `import "dotenv/config"` を除去した。また `src/utils/constants.ts` のプロバイダー関連定数 `EMBEDDING_MODELS` を `DEFAULT_EMBEDDING_MODEL` に置き換えた。

## 根拠

プロバイダー実装の削除（issue-005）と LLMAdapter 注入パターンの導入により、AI サービス SDK への直接依存は不要になる。`dotenv` も API キー管理のために使用されていたが、プロバイダー削除に伴い不要になる。

## 対応方針

- `package.json` の dependencies から以下を削除:
  - `@anthropic-ai/sdk`
  - `openai`
  - `dotenv`
- `src/utils/constants.ts` からプロバイダー関連定数を除去（issue-005 で未完了の場合）
- `dotenv` の `config()` 呼び出し箇所があれば除去
- `npm install` で lockfile を更新

## 解決方法

`@anthropic-ai/sdk` と `openai` は既に issue-005 で削除されていた。残っていた `dotenv` を `package.json` から削除し、`src/cli.ts` の `import "dotenv/config"` を除去した。

`src/utils/constants.ts` の `EMBEDDING_MODELS` レコード（anthropic/openai/ollama のプロバイダー別モデル名マッピング）をプロバイダーに依存しない `DEFAULT_EMBEDDING_MODEL = "voyage-3-lite"` 定数に置き換えた。`src/utils/embeddings.ts` と `test/embeddings.test.ts` を合わせて更新した。`npm install` で lockfile を更新し、全テスト（540件）・ビルド・fallow が問題なく通過した。
