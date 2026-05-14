# init コマンドを新規作成する

Created: 2026-05-14

## 概要

`src/commands/init.ts` を新規作成し、`llmwiki init` コマンドで `llmwiki.config.ts` テンプレートを生成する。

## 根拠

コマンドビルダーパターン（[ADR #1](../01adr-command-builder.md)）では、ユーザーが `init` でプロジェクトを初期化し、生成されたテンプレート内で自分の LLM 関数を実装する。この `init` コマンドがユーザーの利用開始の起点になる。

## 対応方針

- `src/commands/init.ts` を新規作成
- `llmwiki init` 実行時に `llmwiki.config.ts` テンプレートをカレントディレクトリに生成
- テンプレート内容:
  - `createWikiCompiler` の import
  - `LLMAdapter` の `complete` メソッドのスケルトン（`TODO` コメント付き）
  - `export default wiki` の形でエクスポート
- 既にファイルが存在する場合は上書きせず警告を出す
- `cli.ts` に `init` コマンドを登録
