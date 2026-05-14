# MCP サーバーを削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去した。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除した。

## 根拠

MCP（Model Context Protocol）サーバー機能はエージェント連携用であり、簡素化されたテキスト処理 CLI には不要である（[ADR #0](../00adr-simlify.md)）。

## 対応方針

- `src/mcp/` ディレクトリ全体を削除
- `src/cli.ts` から `serve` コマンドの import と登録を除去
- `package.json` の dependencies から `@modelcontextprotocol/sdk`, `zod` を削除
- 関連テスト `test/mcp-server.test.ts` を除去

## 解決方法

`src/mcp/` ディレクトリ（`server.ts`, `tools.ts`, `resources.ts`, `provider-check.ts`）を削除した。`src/cli.ts` から `startMCPServer` のインポートと `serve` コマンド登録を除去した。`npm uninstall @modelcontextprotocol/sdk zod` で依存を削除した。`test/mcp-server.test.ts` も除去した。

MCP モジュールのみが利用していた `ingestSource`（`src/commands/ingest.ts`）・`scanWikiPages`・`collectPageSummaries`（`src/compiler/indexgen.ts`）の `export` キーワードも fallow で検出・除去した。全テスト（540件）・型チェック・ビルド・fallow が正常に通過した。
