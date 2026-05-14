# AI サービス SDK を package.json から削除する

Created: 2026-05-14

## 概要

`@anthropic-ai/sdk`, `openai`, `dotenv` を `package.json` の dependencies から削除する。

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
