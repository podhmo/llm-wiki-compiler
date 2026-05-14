# cli.ts を整理する

Created: 2026-05-14

## 概要

`src/cli.ts` から削除したコマンドの import と登録を除去し、`init` コマンドを追加する。`requireProvider()`, `applyLanguageOption()` 等の不要なヘルパーも削除する。

## 根拠

Phase 2〜3 で多くのコマンドとユーティリティが削除されるため、`cli.ts` 内の参照を整理する必要がある。また `init` コマンドの登録もここで行う。

## 対応方針

- 削除済みコマンドの import を除去（compile, query, watch, review-*, serve, ingest-session）
- 削除済みコマンドの Commander 登録を除去
- `requireProvider()` を除去（LLMAdapter 注入に置換済み）
- `applyLanguageOption()` を除去（output-language.ts 削除済み）
- `init` コマンドの import と登録を追加
- 残るコマンド: init, ingest, lint, export, schema
