# README.md とドキュメントを更新する

Created: 2026-05-14
Completed: 2026-05-14
Model: claude-sonnet-4-20250514

## 概要

README.md とドキュメントを更新し、コマンドビルダーとしての利用方法を記載する。

## 根拠

ツールの利用モデルが「コマンドのインストール」から「コマンドビルダーのインストール」に変わるため、ドキュメントもこれに合わせて更新する必要がある。

## 対応方針

- README.md を更新:
  - インストールと `init` の利用手順
  - `llmwiki.config.ts` の実装例（OpenAI, Anthropic, Ollama 等）
  - 利用可能な組み込みコマンド一覧（init, ingest, lint, export, schema）
  - ライブラリとしての compile / query の利用方法
- 削除した機能への言及を除去
- CHANGELOG に変更内容を記載（該当する場合）

## 解決方法

README.md を全面的に書き換え:
- Quick start セクションを `npm install` + `npx llmwiki init` + ライブラリ API の流れに変更
- 「Architecture: Command Builder Pattern」セクションを追加し、LLMAdapter インターフェースを文書化
- OpenAI / Anthropic / Ollama の具体的な設定例を追加
- 組み込み CLI コマンド一覧（init, ingest, lint, export, schema）とライブラリ API（compile, compileAndReport, query）の表を分離
- 削除された機能への言及を除去（プロバイダー設定、MCP サーバー、watch、review、ingest-session、リッチメディアインジェスト、環境変数による LLM 設定、Roadmap の過去バージョン記録、Karpathy 比較表など）
