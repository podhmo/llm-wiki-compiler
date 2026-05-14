# llm-wiki-compiler 簡素化マイルストーン

このドキュメントでは、llm-wiki-compiler から不要な機能と依存を取り除く計画を2案提示する。上から順に作業していけば完了する構成になっている。

両案とも、compile/query のロジックはライブラリ関数として残し、LLM呼び出し部分はユーザーが注入する形にする（[ADR #1: コマンドビルダー](./01adr-command-builder.md) を参照）。

---

## 案A: ミニマム案（補題）

**ゴール**: AIサービスSDKへの直接依存・リッチメディア・サーバー機能をすべて取り除く。compile/query は `createWikiCompiler({ llm })` 経由でライブラリとして利用可能にし、`init` コマンドでユーザーが自分のLLM関数を注入するテンプレートを生成する。

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
| コンパイルロジック | `src/compiler/`（LLM呼び出し以外） | ライブラリとして提供。LLM部分はユーザー注入 |
| クエリロジック | `src/commands/query.ts`（ライブラリ化） | ライブラリとして提供。LLM部分はユーザー注入 |
| LLMアダプター型定義 | `LLMAdapter` インターフェース（新規） | ユーザーが実装する注入ポイント |
| initコマンド | `src/commands/init.ts`（新規） | テンプレート生成。ユーザーがLLM関数を実装する起点 |

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

#### サブコマンド（8個削除、2個変更）

| コマンド | 変更内容 |
|---------|---------|
| `compile` | 組み込みコマンドから削除。ライブラリ関数 `createWikiCompiler()` 経由で利用 |
| `query` | 組み込みコマンドから削除。ライブラリ関数 `createWikiCompiler()` 経由で利用 |
| `watch` | 削除（compile削除に伴い不要） |
| `ingest-session` | 削除（AIコーディングセッション取り込み） |
| `review list/show/approve/reject` | 削除（compileのレビューワークフロー） |
| `serve` | 削除（MCPサーバー機能） |

#### 残るサブコマンド（5個）

| コマンド | 内容 |
|---------|------|
| `init` | **新規**。プロジェクト初期化。LLM関数のテンプレート（`llmwiki.config.ts`）を生成 |
| `ingest <source>` | ローカルファイルの取り込みのみ（URLは不可） |
| `lint` | ルールベース品質チェック |
| `export` | テキストベースエクスポート（llms.txt, JSON） |
| `schema init/show` | スキーマ管理 |

ユーザーが `llmwiki.config.ts` でLLM関数を接続した後は、`compile` と `query` がユーザー実装のコマンドとして利用可能になる。

#### ソースコード（ディレクトリ単位）

| 削除対象 | 理由 |
|---------|------|
| `src/providers/` | LLMプロバイダー実装全体（ユーザー側の責務に移行） |
| `src/mcp/` | MCPサーバー全体 |
| `src/adapters/` | セッションアダプター全体 |
| `src/ingest/web.ts` | Web取り込み |
| `src/ingest/pdf.ts` | PDF取り込み |
| `src/ingest/transcript.ts` | YouTube/字幕取り込み |
| `src/ingest/image.ts` | 画像取り込み |
| `src/commands/watch.ts` | watchコマンド |
| `src/commands/ingest-session.ts` | ingest-sessionコマンド |
| `src/commands/review-*.ts` | reviewコマンド群 |
| `src/utils/embeddings.ts` | エンベディングAPI |
| `src/utils/retrieval.ts` | セマンティック検索 |
| `src/utils/provider.ts` | プロバイダー自動選択（`LLMAdapter` 注入に置換） |
| `src/utils/claude-settings.ts` | Claude設定 |
| `src/utils/lock.ts` | コンパイルロック |
| `src/utils/output-language.ts` | 出力言語設定（LLM出力用） |
| `src/utils/source-writer.ts` | Web/リッチソース書き出し |
| `src/export/graphml.ts` | GraphMLエクスポート |
| `src/export/json-ld.ts` | JSON-LDエクスポート |
| `src/export/marp.ts` | Marpエクスポート |

#### リファクタリング対象（削除ではなく書き換え）

| 対象 | 変更内容 |
|------|---------|
| `src/utils/llm.ts` | `callClaude()` を注入された `LLMAdapter` のラッパーに書き換え |
| `src/compiler/index.ts` | `LLMAdapter` を引数として受け取る形にリファクタリング |
| `src/compiler/prompts.ts` | 残す（プロンプトテンプレートはライブラリの一部） |
| `src/compiler/prompt-budget.ts` | 残す（プロンプト予算管理はライブラリの一部） |
| `src/compiler/page-renderer.ts` | `LLMAdapter` 経由でLLM呼び出しに書き換え |
| `src/compiler/candidates.ts` | 残す（レビュー候補管理） |
| `src/compiler/deps.ts` | 残す（依存解決） |
| `src/commands/compile.ts` | ライブラリ関数として公開（CLIコマンドからは除去） |
| `src/commands/query.ts` | ライブラリ関数として公開（CLIコマンドからは除去） |

### 作業マイルストーン（案A）

上から順に実行する。各ステップは独立してコミット可能。

#### Phase 1: コマンドビルダー基盤の構築

- [ ] **A-1**: `LLMAdapter` インターフェースを定義（`src/types/llm-adapter.ts`）。`complete` は必須、`stream` / `toolCall` はオプション
- [ ] **A-2**: `createWikiCompiler({ llm })` ファクトリ関数を実装。LLMAdapter を受け取り、compile / query のライブラリ関数を返す
- [ ] **A-3**: `src/utils/llm.ts` の `callClaude()` を、注入された `LLMAdapter` のラッパーに書き換え。グローバルプロバイダー選択を廃止
- [ ] **A-4**: `src/commands/init.ts` を新規作成。`llmwiki init` で `llmwiki.config.ts` テンプレートを生成

#### Phase 2: AI SDK依存の除去

- [ ] **A-5**: `src/providers/` ディレクトリ全体を削除。`src/utils/provider.ts`, `src/utils/claude-settings.ts` を削除
- [ ] **A-6**: `src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除
- [ ] **A-7**: `@anthropic-ai/sdk`, `openai`, `dotenv` を `package.json` から削除

#### Phase 3: リッチメディア・不要機能の除去

- [ ] **A-8**: `src/ingest/web.ts`, `src/ingest/pdf.ts`, `src/ingest/transcript.ts`, `src/ingest/image.ts` を削除。`@mozilla/readability`, `jsdom`, `turndown`, `pdf-parse`, `youtube-transcript` を `package.json` から削除
- [ ] **A-9**: `src/adapters/` ディレクトリ全体を削除し、`ingest-session` コマンドを `cli.ts` から除去
- [ ] **A-10**: `src/commands/watch.ts`, `src/commands/review-*.ts` を削除。関連コマンドを `cli.ts` から除去。`chokidar`, `p-limit` を `package.json` から削除
- [ ] **A-11**: `src/utils/` から不要ファイル（`lock.ts`, `output-language.ts`, `source-writer.ts`, `retrieval.ts`, `embeddings.ts`）を削除
- [ ] **A-12**: `src/export/` から `graphml.ts`, `json-ld.ts`, `marp.ts` を削除

#### Phase 4: CLI整理と仕上げ

- [ ] **A-13**: `src/cli.ts` を整理。削除したコマンドのimportと登録を除去。`requireProvider()`, `applyLanguageOption()` を削除。`init` コマンドを追加
- [ ] **A-14**: compile/query をCLIコマンドから外し、ライブラリ公開（`index.ts` でエクスポート）に変更
- [ ] **A-15**: devDependencies から `@copilotkit/aimock`, `@types/jsdom`, `@types/turndown` を削除
- [ ] **A-16**: テストの更新。削除した機能に関するテストを除去し、残る機能のテストが通ることを確認。`LLMAdapter` のモック注入テストを追加
- [ ] **A-17**: README.md とドキュメントを更新。コマンドビルダーとしての利用方法を記載
- [ ] **A-18**: `npm run build` と `npm test` で最終検証

---

## 案B: ちょうど良い塩梅案

**ゴール**: AIサービスのSDK直接依存は取り除くが、ローカルで完結するテキスト処理機能とシンプルなWeb取り込みは残す。案Aと同様に compile/query は `createWikiCompiler({ llm })` 経由のライブラリとして提供する。

### 案Aとの差分：追加で残すもの

| カテゴリ | 内容 | 理由 |
|---------|------|------|
| Web取り込み | `src/ingest/web.ts` | URLからのMarkdown変換はLLM不要で有用 |
| ファイル監視 | `src/commands/watch.ts` | 外部ツール連携のトリガーとして有用（コンパイルでなくlint実行に変更） |
| GraphML/JSONエクスポート | `src/export/graphml.ts`, `src/export/json-ld.ts` | LLM不要の構造化エクスポート |
| コンパイラ基盤 | `src/compiler/` のLLM非依存部分 | ソース状態管理、インデックス生成、解決は残す |
| リンター全体 | `src/linter/` | そのまま残す |
| スキーマ全体 | `src/schema/` | そのまま残す |

※ 案Aと同様に、compile/query のロジック、`LLMAdapter` インターフェース、`init` コマンドは残る。

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

#### サブコマンド（6個削除、2個変更）

| コマンド | 変更内容 |
|---------|---------|
| `compile` | 組み込みコマンドから削除。ライブラリ関数として利用 |
| `query` | 組み込みコマンドから削除。ライブラリ関数として利用 |
| `ingest-session` | 削除 |
| `review list/show/approve/reject` | 削除 |
| `serve` | 削除（MCPサーバー） |

#### 残るサブコマンド（7個）

| コマンド | 内容 |
|---------|------|
| `init` | **新規**。プロジェクト初期化。LLM関数のテンプレート生成 |
| `ingest <source>` | ローカルファイル＋URL取り込み |
| `lint` | ルールベース品質チェック |
| `export` | 全エクスポートフォーマット（marp除く） |
| `schema init/show` | スキーマ管理 |
| `watch` | ファイル変更監視（lint自動実行に変更） |

ユーザーが `llmwiki.config.ts` でLLM関数を接続した後は、`compile` と `query` がユーザー実装のコマンドとして利用可能になる。

### 作業マイルストーン（案B）

上から順に実行する。各ステップは独立してコミット可能。

#### Phase 1: コマンドビルダー基盤の構築（案Aと共通）

- [ ] **B-1**: `LLMAdapter` インターフェースを定義（`src/types/llm-adapter.ts`）
- [ ] **B-2**: `createWikiCompiler({ llm })` ファクトリ関数を実装
- [ ] **B-3**: `src/utils/llm.ts` の `callClaude()` を `LLMAdapter` ラッパーに書き換え
- [ ] **B-4**: `src/commands/init.ts` を新規作成。`llmwiki init` でテンプレート生成

#### Phase 2: AI SDK依存の除去

- [ ] **B-5**: `src/providers/` ディレクトリ全体を削除。`src/utils/provider.ts`, `src/utils/claude-settings.ts` を削除
- [ ] **B-6**: `src/mcp/` ディレクトリ全体を削除し、`serve` コマンドを `cli.ts` から除去。`zod`, `@modelcontextprotocol/sdk` を `package.json` から削除
- [ ] **B-7**: `@anthropic-ai/sdk`, `openai`, `dotenv` を `package.json` から削除

#### Phase 3: リッチメディアの選択的除去

- [ ] **B-8**: `src/ingest/pdf.ts`, `src/ingest/transcript.ts`, `src/ingest/image.ts` を削除。`pdf-parse`, `youtube-transcript` を `package.json` から削除。Web取り込み（`src/ingest/web.ts`）は残す
- [ ] **B-9**: `src/adapters/` ディレクトリ全体を削除し、`ingest-session` コマンドを `cli.ts` から除去
- [ ] **B-10**: `src/commands/review-*.ts` を削除。関連コマンドを `cli.ts` から除去。`p-limit` を `package.json` から削除
- [ ] **B-11**: `src/utils/` から不要ファイル（`lock.ts`, `output-language.ts`, `source-writer.ts`, `retrieval.ts`, `embeddings.ts`）を削除
- [ ] **B-12**: `src/export/marp.ts` を削除。`graphml.ts`, `json-ld.ts` は残す

#### Phase 4: CLI整理と仕上げ

- [ ] **B-13**: `src/commands/watch.ts` をリファクタリング。compile実行からlint実行に変更
- [ ] **B-14**: `src/cli.ts` を整理。削除したコマンドのimportと登録を除去。`requireProvider()`, `applyLanguageOption()` を削除。`init` コマンドを追加
- [ ] **B-15**: compile/query をCLIコマンドから外し、ライブラリ公開に変更
- [ ] **B-16**: devDependencies から `@copilotkit/aimock` を削除。`@types/jsdom`, `@types/turndown` は残す
- [ ] **B-17**: テストの更新。`LLMAdapter` のモック注入テストを追加
- [ ] **B-18**: README.md とドキュメントを更新。コマンドビルダーとしての利用方法を記載
- [ ] **B-19**: `npm run build` と `npm test` で最終検証

---

## 案比較

| 観点 | 案A（ミニマム） | 案B（バランス） |
|------|---------------|----------------|
| runtime依存数 | 2個（commander, js-yaml） | 6個（+readability, jsdom, turndown, chokidar） |
| 組み込みサブコマンド数 | 5個（init含む） | 7個（init含む） |
| compile/query | ライブラリ関数として利用可能 | ライブラリ関数として利用可能 |
| 削除コード量 | 大 | 中 |
| Web取り込み | ✗ | ✓ |
| ファイル監視 | ✗ | ✓（lint実行に変更） |
| オフライン動作 | ✓ | ✓ |
| AIサービスSDK依存 | なし（ユーザー注入） | なし（ユーザー注入） |
| 作業ステップ数 | 18 | 19 |

## 推奨

まず案Aのマイルストーンに沿って最小構成まで削ぎ落とし、その後必要に応じて案Bの追加機能を戻す（案Aをベースに案Bへ拡張する）アプローチが安全である。

Phase 1（コマンドビルダー基盤の構築）は両案共通なので、最初に着手する。`LLMAdapter` インターフェースと `createWikiCompiler()` が安定した時点で、Phase 2 以降の削除作業に入る。
