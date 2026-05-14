# llm-wiki-compiler 簡素化マイルストーン

このドキュメントでは、llm-wiki-compiler から不要な機能と依存を取り除く計画を2案提示する。上から順に作業していけば完了する構成になっている。

---

## 案A: ミニマム案（補題）

**ゴール**: AIサービス依存・リッチメディア・サーバー機能をすべて取り除き、純粋なテキスト処理CLIにする。

### 残すもの

| カテゴリ | 内容 | 理由 |
|---------|------|------|
| Markdownパーサー | `src/utils/markdown.ts` | frontmatter解析・Markdown操作はコア機能 |
| Frontmatter処理 | `src/utils/markdown.ts`（YAML frontmatter） | メタデータの読み書きは必須 |
| ハッシュ計算 | `src/compiler/hasher.ts` | コンテンツの変更検知に必要（Node.js組込みcryptoのみ） |
| ファイルインジェスト | `src/ingest/file.ts` | ローカルMarkdown/テキストの取り込み |
| リンター | `src/linter/` | LLM不要のルールベース品質チェック |
| エクスポート（一部） | `src/export/llms-txt.ts`, `src/export/json-export.ts` | LLM不要のテキスト変換 |
| スキーマ | `src/schema/` | YAMLベースのスキーマ定義・検証 |
| 共通ユーティリティ | `src/utils/markdown.ts`, `src/utils/output.ts`, `src/utils/state.ts` | 基盤的テキスト処理 |

### 残す依存

| パッケージ | 理由 |
|-----------|------|
| commander | CLIフレームワーク（代替不要） |
| js-yaml | frontmatterとスキーマのYAML処理 |

### 削除するもの

#### 依存パッケージ（12個削除）

| パッケージ | 削除理由 |
|-----------|---------|
| @anthropic-ai/sdk | AIサービス依存 |
| @modelcontextprotocol/sdk | MCPサーバー機能 |
| @mozilla/readability | Web取り込み機能 |
| chokidar | watchコマンド（LLM前提のため不要） |
| dotenv | AIサービスのAPIキー管理用（不要に） |
| jsdom | Web取り込み機能 |
| openai | AIサービス依存 |
| p-limit | コンパイル並行制御（LLM呼び出し用） |
| pdf-parse | PDF取り込み機能 |
| turndown | Web取り込み機能 |
| youtube-transcript | YouTube取り込み機能 |
| zod | MCPツールバリデーション |

#### サブコマンド（9個削除）

| コマンド | 削除理由 |
|---------|---------|
| `compile` | LLMによるページ生成が前提 |
| `query` | LLMによる回答生成が前提 |
| `watch` | compileの自動化（compile削除に伴い不要） |
| `ingest-session` | AIコーディングセッション取り込み（AI依存） |
| `review list/show/approve/reject` | compileのレビューワークフロー（compile削除に伴い不要） |
| `serve` | MCPサーバー機能 |

#### 残るサブコマンド（4個）

| コマンド | 内容 |
|---------|------|
| `ingest <source>` | ローカルファイルの取り込みのみ（URLは不可） |
| `lint` | ルールベース品質チェック |
| `export` | テキストベースエクスポート（llms.txt, JSON） |
| `schema init/show` | スキーマ管理 |

#### ソースコード（ディレクトリ単位）

| 削除対象 | 理由 |
|---------|------|
| `src/providers/` | LLMプロバイダー全体 |
| `src/mcp/` | MCPサーバー全体 |
| `src/adapters/` | セッションアダプター全体 |
| `src/ingest/web.ts` | Web取り込み |
| `src/ingest/pdf.ts` | PDF取り込み |
| `src/ingest/transcript.ts` | YouTube/字幕取り込み |
| `src/ingest/image.ts` | 画像取り込み |
| `src/compiler/prompts.ts` | LLMプロンプト |
| `src/compiler/prompt-budget.ts` | プロンプトバジェット管理 |
| `src/compiler/page-renderer.ts` | LLMによるページ生成 |
| `src/compiler/candidates.ts` | レビュー候補管理 |
| `src/compiler/deps.ts` | LLM依存解決 |
| `src/compiler/obsidian.ts` | Obsidianリンク変換 |
| `src/commands/compile.ts` | compileコマンド |
| `src/commands/query.ts` | queryコマンド |
| `src/commands/watch.ts` | watchコマンド |
| `src/commands/ingest-session.ts` | ingest-sessionコマンド |
| `src/commands/review-*.ts` | reviewコマンド群 |
| `src/utils/llm.ts` | LLM呼び出しユーティリティ |
| `src/utils/embeddings.ts` | エンベディングAPI |
| `src/utils/retrieval.ts` | セマンティック検索 |
| `src/utils/provider.ts` | プロバイダー管理 |
| `src/utils/claude-settings.ts` | Claude設定 |
| `src/utils/lock.ts` | コンパイルロック |
| `src/utils/output-language.ts` | 出力言語設定（LLM出力用） |
| `src/utils/source-writer.ts` | Web/リッチソース書き出し |
| `src/export/graphml.ts` | GraphMLエクスポート |
| `src/export/json-ld.ts` | JSON-LDエクスポート |
| `src/export/marp.ts` | Marpエクスポート |

### 作業マイルストーン（案A）

上から順に実行する。各ステップは独立してコミット可能。

- [ ] **A-1**: `src/providers/` ディレクトリ全体を削除し、`src/utils/provider.ts`, `src/utils/llm.ts`, `src/utils/embeddings.ts`, `src/utils/claude-settings.ts` を削除
- [ ] **A-2**: `src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除
- [ ] **A-3**: `src/ingest/web.ts`, `src/ingest/pdf.ts`, `src/ingest/transcript.ts`, `src/ingest/image.ts` を削除。`@mozilla/readability`, `jsdom`, `turndown`, `pdf-parse`, `youtube-transcript` を `package.json` から削除
- [ ] **A-4**: `src/adapters/` ディレクトリ全体を削除し、`ingest-session` コマンドを `cli.ts` から除去
- [ ] **A-5**: `src/commands/compile.ts`, `src/commands/query.ts`, `src/commands/watch.ts`, `src/commands/review-*.ts` を削除。関連コマンドを `cli.ts` から除去。`chokidar`, `p-limit` を `package.json` から削除
- [ ] **A-6**: `src/compiler/` から LLM依存ファイル（`prompts.ts`, `prompt-budget.ts`, `page-renderer.ts`, `candidates.ts`, `deps.ts`）を削除。LLM不要のファイル（`hasher.ts`, `source-state.ts`, `provenance.ts`, `resolver.ts`, `indexgen.ts`）は残す
- [ ] **A-7**: `src/utils/` から不要ファイル（`lock.ts`, `output-language.ts`, `source-writer.ts`, `retrieval.ts`）を削除
- [ ] **A-8**: `src/export/` から `graphml.ts`, `json-ld.ts`, `marp.ts` を削除（LLM不要だが複雑なフォーマット）
- [ ] **A-9**: `@anthropic-ai/sdk`, `openai`, `dotenv` を `package.json` から削除。`src/utils/constants.ts` からプロバイダー関連定数を除去
- [ ] **A-10**: `src/cli.ts` を整理。削除したコマンドのimportと登録を除去。`requireProvider()`, `applyLanguageOption()` を削除
- [ ] **A-11**: `src/ingest/file.ts` と `src/ingest/shared.ts` のみ残るよう `ingest` コマンドを修正。URL入力時のエラーハンドリングを追加
- [ ] **A-12**: devDependencies から `@copilotkit/aimock`, `@types/jsdom`, `@types/turndown` を削除
- [ ] **A-13**: テストの更新。削除した機能に関するテストを除去し、残る機能のテストが通ることを確認
- [ ] **A-14**: README.md とドキュメントを更新。削除した機能への言及を除去
- [ ] **A-15**: `npm run build` と `npm test` で最終検証

---

## 案B: ちょうど良い塩梅案

**ゴール**: AIサービスのAPI直接依存は取り除くが、ローカルで完結するテキスト処理機能とシンプルなWeb取り込みは残す。LLMプロバイダーを外部のプラグインまたは環境設定に委ねる形にする。

### 案Aとの差分：追加で残すもの

| カテゴリ | 内容 | 理由 |
|---------|------|------|
| Web取り込み | `src/ingest/web.ts` | URLからのMarkdown変換はLLM不要で有用 |
| ファイル監視 | `src/commands/watch.ts` | 外部ツール連携のトリガーとして有用（コンパイルでなくlint実行に変更） |
| GraphML/JSONエクスポート | `src/export/graphml.ts`, `src/export/json-ld.ts` | LLM不要の構造化エクスポート |
| コンパイラ基盤 | `src/compiler/` のLLM非依存部分 | ソース状態管理、インデックス生成、解決は残す |
| リンター全体 | `src/linter/` | そのまま残す |
| スキーマ全体 | `src/schema/` | そのまま残す |

### 残す依存

| パッケージ | 理由 |
|-----------|------|
| commander | CLIフレームワーク |
| js-yaml | YAML処理 |
| @mozilla/readability | Web記事抽出（LLM不要） |
| jsdom | readability用DOM |
| turndown | HTML→Markdown変換（LLM不要） |
| chokidar | ファイル監視 |

### 削除するもの（案Aより少ない）

#### 依存パッケージ（8個削除）

| パッケージ | 削除理由 |
|-----------|---------|
| @anthropic-ai/sdk | AIサービス依存 |
| @modelcontextprotocol/sdk | MCPサーバー機能 |
| openai | AIサービス依存 |
| p-limit | LLM並行制御用 |
| pdf-parse | リッチメディア |
| youtube-transcript | リッチメディア |
| zod | MCPツールバリデーション |
| dotenv | APIキー管理（不要に） |

#### サブコマンド（7個削除）

| コマンド | 削除理由 |
|---------|---------|
| `compile` | LLM依存 |
| `query` | LLM依存 |
| `ingest-session` | AI依存 |
| `review list/show/approve/reject` | compile依存 |
| `serve` | MCPサーバー |

#### 残るサブコマンド（6個）

| コマンド | 内容 |
|---------|------|
| `ingest <source>` | ローカルファイル＋URL取り込み |
| `lint` | ルールベース品質チェック |
| `export` | 全エクスポートフォーマット（marp除く） |
| `schema init/show` | スキーマ管理 |
| `watch` | ファイル変更監視（lint自動実行に変更） |

### 作業マイルストーン（案B）

上から順に実行する。各ステップは独立してコミット可能。

- [ ] **B-1**: `src/providers/` ディレクトリ全体を削除。`src/utils/provider.ts`, `src/utils/llm.ts`, `src/utils/embeddings.ts`, `src/utils/claude-settings.ts` を削除
- [ ] **B-2**: `src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除
- [ ] **B-3**: `src/ingest/pdf.ts`, `src/ingest/transcript.ts`, `src/ingest/image.ts` を削除。`pdf-parse`, `youtube-transcript` を `package.json` から削除。Web取り込み（`src/ingest/web.ts`）は残す
- [ ] **B-4**: `src/adapters/` ディレクトリ全体を削除し、`ingest-session` コマンドを `cli.ts` から除去
- [ ] **B-5**: `src/commands/compile.ts`, `src/commands/query.ts`, `src/commands/review-*.ts` を削除。関連コマンドを `cli.ts` から除去。`p-limit` を `package.json` から削除
- [ ] **B-6**: `src/compiler/` からLLM依存ファイル（`prompts.ts`, `prompt-budget.ts`, `page-renderer.ts`, `candidates.ts`, `deps.ts`）を削除
- [ ] **B-7**: `src/utils/` から不要ファイル（`lock.ts`, `output-language.ts`, `source-writer.ts`, `retrieval.ts`）を削除
- [ ] **B-8**: `src/export/marp.ts` を削除（スライド生成は過剰）。`graphml.ts`, `json-ld.ts` は残す
- [ ] **B-9**: `@anthropic-ai/sdk`, `openai`, `dotenv` を `package.json` から削除
- [ ] **B-10**: `src/commands/watch.ts` をリファクタリング。compile実行からlint実行に変更
- [ ] **B-11**: `src/cli.ts` を整理。削除したコマンドのimportと登録を除去。`requireProvider()`, `applyLanguageOption()` を削除
- [ ] **B-12**: devDependencies から `@copilotkit/aimock`, `@types/jsdom` は残す（Web取り込みに必要）。`@types/turndown` も残す
- [ ] **B-13**: テストの更新。削除した機能に関するテストを除去し、残る機能のテストが通ることを確認
- [ ] **B-14**: README.md とドキュメントを更新
- [ ] **B-15**: `npm run build` と `npm test` で最終検証

---

## 案比較

| 観点 | 案A（ミニマム） | 案B（バランス） |
|------|---------------|----------------|
| runtime依存数 | 2個（commander, js-yaml） | 6個（+readability, jsdom, turndown, chokidar） |
| サブコマンド数 | 4個 | 6個 |
| 削除コード量 | 大 | 中 |
| Web取り込み | ✗ | ✓ |
| ファイル監視 | ✗ | ✓（lint実行に変更） |
| オフライン動作 | ✓ | ✓ |
| AIサービス依存 | なし | なし |
| 作業ステップ数 | 15 | 15 |

## 推奨

まず案Aのマイルストーンに沿って最小構成まで削ぎ落とし、その後必要に応じて案Bの追加機能を戻す（案Aをベースに案Bへ拡張する）アプローチが安全である。案Aの完了後に残ったコードが安定していることを確認してから、Web取り込みやファイル監視を選択的に復元できる。
