# 不要な devDependencies を削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-20250514

## 概要

削除した機能に関連する devDependencies を `package.json` から除去する。

## 根拠

リッチメディア取り込みや MCP サーバーの削除に伴い、これらの型定義やモックライブラリも不要になる。

## 対応方針

- `package.json` の devDependencies から以下を削除:
  - `@copilotkit/aimock`
  - `@types/jsdom`
  - `@types/turndown`
- その他、削除した依存に関連する型定義パッケージがあれば除去
- `npm install` で lockfile を更新

## 解決方法

`@copilotkit/aimock` を `npm uninstall` で除去した。`@types/jsdom` と `@types/turndown` は先行 issue で既に削除済みだった。
`test/fixtures/aimock-helper.ts`（aimock に依存するヘルパー）も合わせて削除。
lockfile は `npm install` で自動更新された。
