# MCP サーバーを削除する

Created: 2026-05-14

## 概要

`src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去する。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除する。

## 根拠

MCP（Model Context Protocol）サーバー機能はエージェント連携用であり、簡素化されたテキスト処理 CLI には不要である（[ADR #0](../00adr-simlify.md)）。

## 対応方針

- `src/mcp/` ディレクトリ全体を削除
- `src/cli.ts` から `serve` コマンドの import と登録を除去
- `package.json` の dependencies から `@modelcontextprotocol/sdk`, `zod` を削除
- 関連テストがあれば除去
