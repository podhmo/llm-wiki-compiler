# 不要なエクスポートフォーマットを削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/export/` から `graphml.ts`, `json-ld.ts`, `marp.ts` を削除した。

## 根拠

- `marp.ts` — スライド生成は LLM 不要だが過剰な機能
- `graphml.ts` — GraphML エクスポートは利用頻度が低い
- `json-ld.ts` — JSON-LD エクスポートは利用頻度が低い

残すのは `llms-txt.ts` と `json-export.ts` のみ。

## 対応方針

- `src/export/graphml.ts` を削除
- `src/export/json-ld.ts` を削除
- `src/export/marp.ts` を削除
- export コマンドの実装から削除したフォーマットへの参照を除去

## 解決方法

対応方針の通りに3ファイルを削除。

- `src/export/types.ts`: `ExportTarget` を 3 種類（llms-txt, llms-full-txt, json）に縮小。`MarpSource` 型と `MARP_SOURCES` 定数を除去
- `src/commands/export.ts`: 削除フォーマットの import を除去、`buildContent` switch 文を更新、marp ソースフィルター関連コード（`isValidMarpSource`, `resolveMarpSource`, `computeReportedPageCount`）を除去、CLI の `--source` オプションを除去
- `test/export-integration.test.ts`, `test/export.test.ts` を削除（削除フォーマットのテストを含むため）
