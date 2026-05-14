# テストを更新する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-20250514

## 概要

削除した機能に関するテストを除去し、残る機能のテストが通ることを確認する。`LLMAdapter` のモック注入テストを追加する。

## 根拠

Phase 2〜3 で多くのソースが削除されるため、それらに依存するテストも除去する必要がある。また LLMAdapter パターンの導入に伴い、モック注入によるテストパターンを追加する。

## 対応方針

- 削除したソースに関するテストファイルを除去
- プロバイダーテスト、MCP テスト、リッチメディアインジェストテスト等
- `LLMAdapter` のモック注入テストを追加:
  - `complete` のみ実装したモック LLMAdapter で compile が動くことを確認
  - `stream` / `toolCall` フォールバックの確認
- 残る機能のテスト（linter, ingest file, export, schema）が全て通ることを確認
- `npm test` で全テスト PASS を確認

## 解決方法

`test/llm-adapter-injection.test.ts` を新規作成し、以下の 7 テストを追加:
1. basic complete() ルーティング
2. stream 未実装時の complete() フォールバック
3. stream 実装時の stream() 利用
4. toolCall 未実装時の complete() フォールバック
5. toolCall 実装時の toolCall() 利用
6. maxTokens のパススルー
7. マルチターンメッセージの連結

プロバイダーテスト・MCP テスト等は先行 issue で既に削除済みだった。
全 324 テスト（既存 317 + 新規 7）が PASS することを確認。
