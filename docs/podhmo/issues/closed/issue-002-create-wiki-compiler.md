# createWikiCompiler() ファクトリ関数を実装する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`createWikiCompiler({ llm })` ファクトリ関数を実装する。`LLMAdapter` を受け取り、compile / query のライブラリ関数を返す。

## 根拠

llm-wiki-compiler を「コマンドのインストール」ではなく「コマンドビルダーのインストール」として再設計する（[ADR #1](../01adr-command-builder.md)）。ユーザーが自分の LLM 関数を注入し、それを使って compile/query を実行できるようにする。

## 対応方針

- `src/wiki-compiler.ts`（または `src/index.ts`）に `createWikiCompiler()` を実装
- 引数: `WikiCompilerOptions`（`LLMAdapter` + オプション）
- 戻り値: `{ compile, query }` のようなオブジェクト。各関数は注入された `LLMAdapter` を使って処理を行う
- 既存の `compile()` / `generateAnswer()` のロジックをラップし、LLMAdapter 経由で LLM 呼び出しを行う形にする

## 解決方法

`src/wiki-compiler.ts` を新規作成し、`createWikiCompiler({ llm })` ファクトリ関数を実装した。
戻り値は `{ compile, compileAndReport, query }` メソッドを持つオブジェクト。
各メソッドは注入された `LLMAdapter` を `compileAndReport`・`generateAnswer` に渡して処理する。
`package.json` の `exports` フィールドと `tsup.config.ts` に `src/wiki-compiler.ts` をエントリポイントとして追加した。
