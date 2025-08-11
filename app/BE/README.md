# Bolt BE (Express)

このバックエンドは、既存のRemix/Cloudflare Pages Functions 実装（バックアップ参照）を Node.js/Express に置き換えるためのものです。Nuxt 3（app/FE）から呼び出される API を提供します。

## 目的（バックアップからの移植方針）
- 既存の `app/routes/api.chat.ts` 相当を Express の `POST /api/chat` に移植（LLMレスポンスのストリーミング対応、トークン上限時の継続生成を含む）
- 既存の `app/routes/api.enhancer.ts` 相当を Express の `POST /api/enhancer` に移植（プロンプト改善のストリーミング）
- 既存の `app/lib/.server/llm/*`（`model.ts`, `prompts.ts`, `stream-text.ts`, `switchable-stream.ts` など）を Node ランタイム向けに再配置
- Cloudflare固有の `context.cloudflare.env` は `process.env` へ置換

## ディレクトリ構成（シンプルなExpress構成）
```
app/BE/
  src/
    server.ts                 # 起動ブートストラップ（Express listen）
    app.ts                    # Expressアプリ本体（ミドルウェア/CORS/ルーティング集約）
    routes/
      api/
        chat.ts               # POST /api/chat（LLMストリーミング）
        enhancer.ts           # POST /api/enhancer（プロンプト改善ストリーミング）
    llm/
      model.ts                # Geminiモデル選択（GEMINI_API_KEY/GEMINI_MODEL）
      prompts.ts              # 既存のプロンプトを移植
      stream-text.ts          # LLM呼び出しラッパ（既存の実装をNode向けに）
      switchable-stream.ts    # 既存の継続生成ストリームを移植
    middleware/
      cors.ts                 # CORS許可（FE: http://localhost:3000）
      error.ts                # エラーハンドリング
      json.ts                 # JSONパース/制限
    config/
      env.ts                  # 環境変数の読み込み/検証
    utils/
      sse.ts                  # 必要ならSSE/チャンク送出の補助

  package.json                # （後で作成）scripts: dev/build/start など

db/
  datamase.dbml               # DBの単一ソース（ユーザー指定名）
  migrations/                 # DBML→SQL生成物
```

Rinstack 固有の `features/` や `shared/` といった階層は採用しません。ここでは「既存アプリの責務」に合わせた最小の Express 構成とします。

## API（移植対象）
- POST `/api/chat`
  - Body: `{ messages: Array<{ role: 'user' | 'assistant', content: string }> }`
  - Res: テキストのストリーミング（チャンク/SSEのいずれか）。既存の `SwitchableStream` ロジックでトークン上限到達時に自動継続

- POST `/api/enhancer`
  - Body: `{ message: string }`
  - Res: 改善済みプロンプトのストリーミング（最終的にはプレーンテキスト）

既存実装の参照箇所:
- `既存アプリのバックアップ/app/routes/api.chat.ts`
- `既存アプリのバックアップ/app/routes/api.enhancer.ts`
- `既存アプリのバックアップ/app/lib/.server/llm/*`

## 環境変数（開発例）
```
PORT=4000
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-pro
```

## CORS
- FEはデフォルトで `http://localhost:3000` を想定。`middleware/cors.ts` で許可

## DB（DBML駆動）
- 単一ソース: `db/datamase.dbml`
- 生成: DBML → `db/migrations/*.sql`（例: `@dbml/cli`）
- 適用: SQLite（開発） or Postgres（本番）に対して Node スクリプト（`pnpm db:migrate`）で適用

## 開発フロー（想定）
1) 既存の LLM ロジックを `src/llm/*` に移植（型/ストリームAPIをNode向けに調整）
2) ルートを `src/routes/api/*` に実装し、`app.ts` にマウント
3) CORS/エラー処理/JSON制限を `middleware/*` で適用
4) DBML → マイグレーション生成 → 開発DBへ適用

## スクリプト（予定）
- `pnpm dev`: ts-node/tsx で開発起動（PORT=4000）
- `pnpm build`: tsc ビルド
- `pnpm start`: ビルド成果物を実行
- `pnpm db:generate`: `db/datamase.dbml` から `db/migrations` 生成
- `pnpm db:migrate`: ローカルDBへマイグレーション適用
