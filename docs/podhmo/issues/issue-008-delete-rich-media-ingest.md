# リッチメディア取り込み機能を削除する

Created: 2026-05-14

## 概要

Web / PDF / YouTube / 画像の取り込みファイルと関連依存パッケージを削除する。

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
