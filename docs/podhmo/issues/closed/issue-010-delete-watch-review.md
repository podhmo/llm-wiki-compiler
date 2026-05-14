# watch / review コマンドを削除する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-5

## 概要

`src/commands/watch.ts`, `src/commands/review-*.ts` を削除し、関連コマンドを `cli.ts` から除去した。`chokidar`, `p-limit` を `package.json` から削除した。

## 根拠

- `watch` は compile の自動実行に使用されていたが、compile が組み込みコマンドから外れるため不要
- `review` は compile のレビューワークフローであり、同様に不要
- `chokidar`（ファイル監視）と `p-limit`（LLM 並行制御）はこれらのコマンド専用の依存

## 対応方針

- `src/commands/watch.ts` を削除
- `src/commands/review-*.ts`（review-list, review-show, review-approve, review-reject 等）を削除
- `src/cli.ts` から watch / review コマンドの import と登録を除去
- `package.json` の dependencies から `chokidar`, `p-limit` を削除

## 解決方法

対応方針の通りに実施。以下のファイルを削除:
- `src/commands/watch.ts`
- `src/commands/review-approve.ts`, `review-helpers.ts`, `review-list.ts`, `review-reject.ts`, `review-show.ts`
- `test/review-lock.test.ts`, `review-provenance-integration.test.ts`, `review-integration.test.ts`, `review.test.ts`
- `test/fixtures/review-show-helpers.ts`

`chokidar` と `p-limit` を dependencies から削除。compiler/index.ts 内の p-limit 使用箇所を逐次実行に変更。
review-show に依存していたテスト（schema-violations, provenance-violations, schema-subprocess）から review 関連のテストケースを除去し、非 review 部分は保持。
