# 最終検証を行う

Created: 2026-05-14

## 概要

`npm run build` と `npm test` で最終検証を行い、全てのビルドとテストが通ることを確認する。

## 根拠

全ての削除・リファクタリング作業完了後、パッケージとして正しくビルド・テストできることを保証する。

## 対応方針

- `npm run build` — TypeScript コンパイルが成功すること
- `npm test` — 全テストが PASS すること
- `npm pack --dry-run` — パッケージとして正しく構成されていること
- `npx llmwiki --help` — CLI が正しく起動し、残るコマンドが表示されること
- `npx llmwiki init` — テンプレートが正しく生成されること
- `package.json` の dependencies が想定通り（commander, js-yaml のみ）であること
