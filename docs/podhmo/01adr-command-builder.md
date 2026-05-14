# ADR: コマンドビルダーとしての提供（Command Builder Pattern）

## ステータス

提案中（Proposed）

## コンテキスト

[ADR #0（簡素化）](./00adr-simlify.md) では、AIサービス依存を取り除く方針を示した。しかし、compile（ソースからwikiページ生成）や query（wikiに対する質問応答）のようなLLMを利用した機能は、ツールのコアバリューである。

これらの機能を完全に削除するのではなく、LLM呼び出し部分をユーザーが注入する形に再設計することで、以下を両立させたい：

- ライブラリとしての依存の最小化（AI SDKをバンドルしない）
- compile/query の機能を引き続き利用可能にする

### 現状のLLMインターフェース

現在の `callClaude()` 関数（`src/utils/llm.ts`）は以下のシグネチャを持つ：

```typescript
interface CallClaudeOptions {
  system: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxTokens?: number;
  stream?: boolean;
  onToken?: (text: string) => void;
}

async function callClaude(options: CallClaudeOptions): Promise<string>;
```

内部で `getProvider()` を呼び、環境変数に応じて Anthropic / OpenAI / Ollama 等のプロバイダーを自動選択している。このプロバイダー選択と各SDKへの依存が、パッケージの肥大化の主因である。

### 最も単純化した抽象

上記を極限まで単純化すると、LLM呼び出しは本質的に `string → string` の関数である：

```typescript
type LLMFunction = (prompt: string) => Promise<string>;
```

実際にはシステムプロンプトやメッセージ履歴の構造が必要だが、ユーザーが注入する最小のインターフェースはこの形に近い。

## 決定

llm-wiki-compiler を**コマンドのインストール**ではなく**コマンドビルダーのインストール**として再設計する。

### 設計方針

1. **ライブラリとしてのコア機能**: compile / query のロジックはライブラリ関数として残す。ただし LLM 呼び出し部分は外部から注入する形にする。
2. **`init` コマンド**: `llmwiki init` でプロジェクトを初期化し、ユーザーが実装すべき `main` ファイルのテンプレートを生成する。
3. **ユーザーによるLLM接続**: 生成された `main` ファイル内で、ユーザーが自分の LLM 呼び出し関数（例: OpenAI SDK, Anthropic SDK, ローカルモデル等）を接続する。

### 具体的なイメージ

#### インストールと初期化

```bash
npm install llm-wiki-compiler
npx llmwiki init
```

#### 生成される main ファイル（例: `llmwiki.config.ts`）

```typescript
import { createWikiCompiler } from "llm-wiki-compiler";

// ユーザーが自分のLLM関数を実装する
const llm = async (options: {
  system: string;
  prompt: string;
}) => {
  // 例: OpenAI SDK を使う場合
  // const response = await openai.chat.completions.create({ ... });
  // return response.choices[0].message.content;
  throw new Error("TODO: LLM関数を実装してください");
};

const wiki = createWikiCompiler({ llm });

// これらがCLIコマンドとして利用可能になる
export default wiki;
```

#### ユーザーの利用フロー

```bash
# 1. initで雛形生成
npx llmwiki init

# 2. llmwiki.config.ts にLLM関数を実装

# 3. コマンドを実行（ユーザーのLLM関数が使われる）
npx llmwiki compile
npx llmwiki query "what is X?"
```

### 注入インターフェース

```typescript
/** ユーザーが実装する最小のLLMインターフェース */
interface LLMAdapter {
  /** 基本的なテキスト生成 */
  complete(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string>;

  /** ストリーミング（オプション） */
  stream?(options: {
    system: string;
    prompt: string;
    maxTokens?: number;
    onToken: (text: string) => void;
  }): Promise<string>;

  /** 構造化出力 / tool use（オプション） */
  toolCall?(options: {
    system: string;
    prompt: string;
    tools: ToolDefinition[];
    maxTokens?: number;
  }): Promise<string>;
}

/** createWikiCompiler に渡すオプション */
interface WikiCompilerOptions {
  llm: LLMAdapter;
  root?: string;
}
```

`stream` と `toolCall` はオプションとし、未実装の場合は `complete` にフォールバックする。これにより、最も単純なケースでは `complete` だけ実装すればよい。

## 理由

1. **依存の最小化と機能の両立**: AI SDKを同梱せず、compile/query の機能は保持できる。ユーザーが好きなLLMプロバイダーを自由に選べる。
2. **フォークからの自然な移行**: 既存の compile/query ロジックは大部分そのまま残し、`callClaude()` の呼び出し箇所を注入された関数に差し替えるだけで移行できる。
3. **テスタビリティ**: LLM関数がモック可能になるため、compile/query のロジックを単体テストしやすくなる。
4. **柔軟性**: ローカルモデル（Ollama）、クラウドAPI（OpenAI, Anthropic）、カスタムプロキシなど、任意のバックエンドを接続できる。

## 影響

- `llmwiki init` コマンドの新規追加が必要
- `createWikiCompiler()` ファクトリ関数の新規実装が必要
- 既存の `callClaude()` / `getProvider()` は内部的に `LLMAdapter` のラッパーに置き換わる
- プロバイダー実装（`src/providers/`）は削除可能（ユーザー側の責務に移行）
- `@anthropic-ai/sdk`, `openai` 等のAI SDKは `package.json` から削除可能

## 関連

- [ADR #0: 簡素化](./00adr-simlify.md) — 依存最小化の方針
- [マイルストーン](./simlify-milestone.md) — 具体的な作業計画
