# 不要なユーティリティファイルを削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/utils/` から LLM / リッチメディア関連の不要ファイルを削除した。

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

## 解決方法

対応方針の通りに5ファイルを削除。削除に伴う import の除去と機能修正:

- `src/compiler/index.ts`: `acquireLock`/`releaseLock` を除去（ロックなしで直接実行）、`updateEmbeddings` を除去
- `src/compiler/prompts.ts`: `languageDirective` を除去（`withLangLine` をパススルー関数に変更）
- `src/commands/query.ts`: `embeddings`/`retrieval`/`output-language` の import を除去。チャンク・ページレベルの embedding プリフィルタを削除し、常にフルインデックスを LLM に送る方式に簡略化
- `src/commands/ingest.ts`: `source-writer.ts` の `saveSource` 関数をインライン化
- `src/utils/constants.ts`: 不要になった定数（EMBEDDING_*, CHUNK_*, LOCK_FILE, EMBEDDINGS_FILE, COMPILE_CONCURRENCY, DEFAULT_EMBEDDING_MODEL）を除去

関連テストファイルを削除:
- `test/retrieval.test.ts`, `embeddings.test.ts`, `embeddings-chunks.test.ts`, `chunked-retrieval-integration.test.ts`, `output-language.test.ts`
