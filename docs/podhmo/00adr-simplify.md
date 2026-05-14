# ADR: llm-wiki-compiler の簡素化（Simplification）

## ステータス

提案中（Proposed）

## コンテキスト

llm-wiki-compiler は「生のソースを取り込み、相互リンクされた Markdown wiki を生成する」ナレッジコンパイラ CLI である。現在のコードベースは多くのリッチな機能と外部依存を抱えている。

### 現状の依存関係（runtime: 14パッケージ）

| パッケージ | 用途 | 使用箇所数 |
|-----------|------|-----------|
| @anthropic-ai/sdk | Claude LLM + 画像認識 | 2ファイル |
| @modelcontextprotocol/sdk | MCPサーバー | 3ファイル |
| @mozilla/readability | Webコンテンツ抽出 | 1ファイル |
| chokidar | ファイル監視 | 1ファイル |
| commander | CLIパース | 1ファイル |
| dotenv | .envファイル読み込み | 1ファイル |
| js-yaml | YAMLパース（frontmatter等） | 3ファイル |
| jsdom | DOM操作（readability用） | 1ファイル |
| openai | OpenAI互換API（5プロバイダー） | 9ファイル |
| p-limit | 並行処理制御 | 1ファイル |
| pdf-parse | PDF抽出 | 1ファイル |
| turndown | HTML→Markdown変換 | 1ファイル |
| youtube-transcript | YouTube字幕取得 | 1ファイル |
| zod | MCPツールバリデーション | 1ファイル |

### 現状のサブコマンド（13個）

`ingest`, `ingest-session`, `compile`, `query`, `watch`, `lint`, `export`, `schema init`, `schema show`, `review list`, `review show`, `review approve`, `review reject`, `serve`（MCPサーバー）

### 現状のLLMプロバイダー（5個）

Anthropic, OpenAI, Ollama, GitHub Copilot, MiniMax

## 決定

llm-wiki-compiler をフォークし、依存を最小化した簡素版を作成する。

## 理由

1. **依存の最小化**: 14個のランタイム依存のうち多くはAIサービスやリッチメディア処理に関連しており、基本的なテキスト処理ツールとしては過剰である。
2. **フォークからの削除が効率的**: ゼロから書き直すよりも、既存のコードから不要な部分を削除するほうが早い。既にあるMarkdownパーサーやfrontmatter処理、ハッシュ計算などの有用なテキスト処理基盤を活かせる。
3. **不要な機能の明確化**: ビューワー的なサーバー機能（MCPサーバー）、マルチモーダル対応（画像認識、PDF抽出、YouTube字幕）、AIサービスAPI依存はコアのテキスト処理ツールには不要である。
4. **保守性の向上**: 依存が少ないほどアップデートの追従やセキュリティリスクの管理が容易になる。

## 影響

- AIサービスSDKへの直接依存は取り除かれる
- compile/query のロジックはライブラリ関数として残り、LLM呼び出し部分はユーザーが注入する形になる（詳細は [ADR #1](./01adr-command-builder.md) を参照）
- リッチメディア（PDF, 画像, YouTube）のインジェスト機能は失われる
- MCPサーバー経由のエージェント連携は失われる
- Markdownテキスト処理、frontmatter操作、ハッシュ計算などの基盤機能は保持される

## 関連

- [ADR #1: コマンドビルダーとしての提供](./01adr-command-builder.md) — compile/query をライブラリとして残す方針
- 詳細な作業マイルストーン: [simlify-milestone.md](./simlify-milestone.md)
