# 不要なエクスポートフォーマットを削除する

Created: 2026-05-14

## 概要

`src/export/` から `graphml.ts`, `json-ld.ts`, `marp.ts` を削除する。

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
