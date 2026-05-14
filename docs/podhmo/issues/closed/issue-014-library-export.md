# compile/query をライブラリとして公開する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-20250514

## 概要

compile / query を CLI コマンドから外し、`index.ts` からライブラリとしてエクスポートする。

## 根拠

コマンドビルダーパターン（[ADR #1](../01adr-command-builder.md)）により、compile / query はユーザーが `createWikiCompiler()` 経由で利用するライブラリ関数になる。パッケージの公開 API としてエクスポートする必要がある。

## 対応方針

- `src/index.ts`（パッケージのエントリポイント）から以下をエクスポート:
  - `createWikiCompiler`
  - `LLMAdapter` 型
  - `WikiCompilerOptions` 型
  - compile / query に必要な型定義
- `package.json` の `exports` / `main` / `types` フィールドを確認・更新
- `src/commands/compile.ts` と `src/commands/query.ts` は CLI コマンドとしての登録を外し、ライブラリ関数としてのみ利用可能にする

## 解決方法

`src/index.ts` を新規作成し、以下をエクスポートした:
- `createWikiCompiler` (ファクトリ関数)
- `WikiCompiler` (返り値の型)
- `LLMAdapter`, `WikiCompilerOptions`, `ToolDefinition` (アダプターインターフェース)
- `CompileOptions`, `CompileResult`, `QueryResult` (パイプライン結果型)
- `GenerateAnswerOptions` (クエリオプション型)

`tsup.config.ts` に `src/index.ts` をエントリポイントとして追加。
`package.json` の `exports` と `main` を `./dist/index.js` に変更。
compile/query は既に CLI コマンドから外されていた（先行 issue で対応済み）。
