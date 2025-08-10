[![Bolt Open Source Codebase](./public/social_preview_index.jpg)](https://bolt.new)

> **Bolt** オープンソースコードベースへようこそ！このリポジトリは、bolt.new のコアコンポーネントを用いた最小のサンプルアプリを含み、**StackBlitz の WebContainer API** を活用した **AI 開発ツール** を構築するための出発点を提供します。

### なぜ Bolt + WebContainer API なのか

Bolt と WebContainer API を組み合わせると、**仮想マシン不要**で、ブラウザだけで **プロンプト→実行→編集→デプロイ** まで可能なフルスタック開発アプリを構築できます。WebContainer API を使えば、AI に **Node.js サーバ**、**ファイルシステム**、**パッケージマネージャ**、**開発用ターミナル** への完全なアクセスを与えられます。主要な JavaScript ライブラリや Node パッケージを、リモート環境やローカルインストールなしでそのまま扱える新しい開発体験を実現します。

### 本リポジトリ（Bolt）と [Bolt.new](https://bolt.new) の違い

- **Bolt.new**: StackBlitz が提供する商用のクラウド型プロダクト。ブラウザだけでフルスタックアプリをプロンプト/実行/編集/デプロイできます。ベースはこのオープンソース（Bolt）で、**WebContainer API** を活用しています。
- **Bolt（このリポジトリ）**: Bolt.new を構成する UI およびサーバ部品のコアを公開。フレームワークは [Remix Run](https://remix.run/)。本 OSS と **WebContainer API** を使えば、ブラウザ内で完結する AI 開発ツールやフルスタックアプリを自作できます。

## Bolt で開発を始める

Bolt は AI とサンドボックス開発環境を組み合わせ、アシスタントと開発者が協調してコードを作る体験を提供します。バックエンドは [WebContainer API](https://webcontainers.io/api)、AI は **Gemini**、フレームワークは [Remix](https://remix.run/)、AI SDK は [Vercel AI SDK](https://sdk.vercel.ai/) を使用します。

### WebContainer API

[WebContainers](https://webcontainers.io/) はブラウザ内でコードを実行するフルスタックのサンドボックス環境を提供します。クラウド上のエージェントを使わず、ブラウザで直接コードを動かし、ユーザーの編集も即座に反映できます。

商用利用時のライセンスや料金については、[WebContainer API の料金ページ](https://stackblitz.com/pricing#webcontainer-api)をご確認ください。

### Remix アプリ

本アプリは [Remix](https://remix.run/) で構築し、[Cloudflare Pages](https://pages.cloudflare.com/) と [Cloudflare Workers](https://workers.cloudflare.com/) で配信します。

### AI SDK 連携

AI 連携には [AI SDK](https://github.com/vercel/ai) を利用し、**Google Gemini** ファミリーを使用します。API キーは `Google AI Studio` から取得してください。コードは [app/lib/.server/llm](./app/lib/.server/llm) を参照。

## 前提条件

- Node.js (v20.15.1)
- pnpm (v9.4.0)

## セットアップ

1. リポジトリを取得

```bash
git clone https://github.com/stackblitz/bolt.new.git
```

2. 依存関係をインストール

```bash
pnpm install
```

3. ルートに `.env.local` を作成し、API キー等を設定

```
GEMINI_API_KEY=XXX
GEMINI_MODEL=gemini-2.5-pro
VITE_LOG_LEVEL=debug
```

`.env.local` は機微情報のためコミットしないでください（`.gitignore` 済み）。

## 利用可能なスクリプト

- `pnpm run dev`: 開発サーバを起動（Remix Vite）
- `pnpm run build`: プロダクションビルド
- `pnpm run start`: ビルド済みクライアントを Wrangler Pages でローカル起動（`bindings.sh` でバインディング設定）
- `pnpm run preview`: ビルド後にローカル起動（HTTP ストリーミングは `wrangler pages dev` で制約あり）
- `pnpm test`: Vitest によるテスト実行
- `pnpm run typecheck`: TypeScript の型チェック
- `pnpm run typegen`: Wrangler 型生成
- `pnpm run deploy`: Cloudflare Pages へデプロイ

## 開発

```bash
pnpm run dev
```

Remix Vite の開発サーバが起動します。

## テスト

```bash
pnpm test
```

## デプロイ

```bash
pnpm run deploy
```

Cloudflare アカウントに対する権限と Wrangler の設定が正しいことを確認してください。
