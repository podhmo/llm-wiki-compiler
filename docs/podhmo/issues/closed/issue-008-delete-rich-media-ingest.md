# リッチメディア取り込み機能を削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

Web / PDF / YouTube / 画像の取り込みファイルと関連依存パッケージを削除し、ingest コマンドをローカルファイル（.md / .txt）のみに限定した。

## 根拠

リッチメディア取り込みは AI サービスに依存する機能（画像認識等）や専用パーサー（pdf-parse, youtube-transcript）を必要とし、簡素化の対象である（[ADR #0](../00adr-simlify.md)）。

## 対応方針

- 以下のソースファイルを削除:
  - `src/ingest/web.ts`
  - `src/ingest/pdf.ts`
  - `src/ingest/transcript.ts`
  - `src/ingest/image.ts`
- `package.json` の dependencies から以下を削除:
  - `@mozilla/readability`
  - `jsdom`
  - `turndown`
  - `pdf-parse`
  - `youtube-transcript`
- ingest コマンドの実装からリッチメディア関連のコードパスを除去し、ローカルファイル取り込みのみに限定
- URL 入力時のエラーハンドリングを追加

## 解決方法

- `src/ingest/web.ts`, `src/ingest/pdf.ts`, `src/ingest/transcript.ts`, `src/ingest/image.ts` を削除した。
- `npm uninstall` で `@mozilla/readability`, `jsdom`, `turndown`, `pdf-parse`, `youtube-transcript`, `@types/jsdom`, `@types/turndown` を削除した。
- `src/commands/ingest.ts` を全面的に簡素化した。URL が渡された場合は「URL sources are not supported」というエラーをスローし、ローカルファイルはすべて `ingestFile` に委譲するよう変更した。また transcript sniffing コード（スピーカータグ検出・タイムスタンプ検出）も削除した。
- `src/utils/types.ts` の `SourceType` を `"file"` のみに限定した。
- `src/utils/constants.ts` から `IMAGE_EXTENSIONS` と `TRANSCRIPT_EXTENSIONS` を削除した。
- `test/multimodal-ingest.test.ts` と `test/multimodal-ingest-integration.test.ts` を更新し、削除した機能のテストを除去・ファイル ingest のテストに絞った。
- TypeScript の型チェック、ビルド、全テスト（510件）がすべて通過し、fallow も問題なしを報告した。
