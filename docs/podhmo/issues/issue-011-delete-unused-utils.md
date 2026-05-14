# 不要なユーティリティファイルを削除する

Created: 2026-05-14

## 概要

`src/utils/` から LLM / リッチメディア関連の不要ファイルを削除する。

## 根拠

プロバイダー・リッチメディア・MCP の削除に伴い、これらの機能を支えていたユーティリティファイルも不要になる。

## 対応方針

- 以下のファイルを削除:
  - `src/utils/lock.ts` — コンパイルロック（LLM 並行制御用）
  - `src/utils/output-language.ts` — 出力言語設定（LLM 出力用）
  - `src/utils/source-writer.ts` — Web/リッチソース書き出し
  - `src/utils/retrieval.ts` — セマンティック検索
  - `src/utils/embeddings.ts` — エンベディング API
- 削除したファイルへの import を全て除去
