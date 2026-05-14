# セッションアダプターを削除する

Created: 2026-05-14

## 概要

`src/adapters/` ディレクトリ全体を削除し、`ingest-session` コマンドを `cli.ts` から除去する。

## 根拠

セッションアダプターは AI コーディングセッションの取り込み用であり、AI サービスに依存する機能である。簡素化の対象。

## 対応方針

- `src/adapters/` ディレクトリ全体を削除
- `src/cli.ts` から `ingest-session` コマンドの import と登録を除去
- `src/commands/ingest-session.ts` を削除
- 関連テストがあれば除去
