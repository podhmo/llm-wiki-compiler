# watch / review コマンドを削除する

Created: 2026-05-14

## 概要

`src/commands/watch.ts`, `src/commands/review-*.ts` を削除し、関連コマンドを `cli.ts` から除去する。`chokidar`, `p-limit` を `package.json` から削除する。

## 根拠

- `watch` は compile の自動実行に使用されていたが、compile が組み込みコマンドから外れるため不要
- `review` は compile のレビューワークフローであり、同様に不要
- `chokidar`（ファイル監視）と `p-limit`（LLM 並行制御）はこれらのコマンド専用の依存

## 対応方針

- `src/commands/watch.ts` を削除
- `src/commands/review-*.ts`（review-list, review-show, review-approve, review-reject 等）を削除
- `src/cli.ts` から watch / review コマンドの import と登録を除去
- `package.json` の dependencies から `chokidar`, `p-limit` を削除
