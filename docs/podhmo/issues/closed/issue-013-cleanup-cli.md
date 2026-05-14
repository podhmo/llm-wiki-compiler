# cli.ts を整理する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/cli.ts` から削除したコマンドの import と登録を除去し、`init` コマンドを保持した。`applyLanguageOption()` を削除した。

## 根拠

Phase 2〜3 で多くのコマンドとユーティリティが削除されるため、`cli.ts` 内の参照を整理する必要がある。

## 対応方針

- 削除済みコマンドの import を除去（compile, query, watch, review-*, serve, ingest-session）
- 削除済みコマンドの Commander 登録を除去
- `requireProvider()` を除去（LLMAdapter 注入に置換済み）
- `applyLanguageOption()` を除去（output-language.ts 削除済み）
- `init` コマンドの import と登録を追加
- 残るコマンド: init, ingest, lint, export, schema

## 解決方法

`cli.ts` を全面的に書き換え。残るコマンド: init, ingest, lint, export, schema の5つ。

追加の変更:
- `src/commands/compile.ts` を削除（fallow が dead file として検出、cli.ts からも wiki-compiler.ts からも参照されていなかった）
- export コマンドから `--source` オプションを除去（marp 削除に伴い不要）
- fallow が検出した dead code を修正: candidates.ts の未使用エクスポート、export.ts の未使用型エクスポート、query.ts の未使用デフォルトエクスポート、collect.ts の未使用エクスポート
- `test/cli.test.ts`, `test/pack-and-install.test.ts` を更新して削除済みコマンドの参照を除去
