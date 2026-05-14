# README.md とドキュメントを更新する

Created: 2026-05-14

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
