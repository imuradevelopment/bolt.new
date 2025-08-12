# Bolt BE (Express)

## クイックスタート（.env 作成と起動）

1) 前提

- Node.js >= 18.18 / pnpm
- Gemini の API キー（取得先: [Google AI Studio の API キー管理](https://aistudio.google.com/app/apikey)）
 - DB は以下から選択:
   - SQLite（既定。追加設定不要）
   - Postgres（環境変数 `DB_DIALECT=postgres` と `POSTGRES_URL` を設定）

2) .env を作成

```
cd app/BE
cp .env.example .env
# .env を開き、最低限以下を設定
# GEMINI_API_KEY=取得したキー
# （任意）CORS_ORIGIN=http://localhost:3000  # FE 側ポートに合わせる
```

3) 依存インストールと DB 準備

```
pnpm i
pnpm db:generate   # 毎回 DBML から SQL を生成
pnpm db:migrate    # 生成 SQL を適用（__migrations__ で管理）
```

4) 起動

```
pnpm dev
# http://localhost:4000
```

このバックエンドは、既存実装（バックアップ参照）を Node.js/Express へ移植し、Nuxt 3（app/FE）から利用される API を提供します。

## 設計原則（必須ルール）

先に3行でまとめます。
1. 「/src/shared/」はアプリケーション横断機能
2. 「/src/features/」直下はエンドポイント横断機能
3. 「/src/features/endpoint/[domain]」はエンドポイント固有機能

---

## 構成 = 設計

ファイル名とディレクトリパスだけで中身の責務が即座に分かること。

`utils` / `common` / `core` のような曖昧な構成は一切禁止。処理対象と責務をパス全体で表現し、抽象名に逃がさない。

---

## ドメイン駆動構成（DDD志向 + LLM対応）

各機能は `features/` 以下に集約し、次の構成単位で責務を明示：

- `routes.ts`：ルーティング（唯一の外部エントリポイント）
- `service.ts`：アプリケーションサービス層（ビジネスルールとユースケース処理）
- `schema.ts`：Zod による入力バリデーション（`.infer<>` による型一体化）
- `repository.ts`：DB アクセスの責務分離（`models` 直アクセスは禁止）
- `worker.ts` / `queue.ts`：非同期/LLM タスク処理（必要に応じて）

永続化層のモデルは `models/` に配置。CLI で自動生成・更新し、直接 import は許可せず `repository` 経由のみ操作する。

複雑なユースケースでは、`service.ts` をディレクトリ化して `create.ts` / `update.ts` などに分割。`repository` も `crud.ts` / `query.ts` / `aggregate.ts` 等に分割し、`index.ts` で再統合する。

`interface` / `adapter` の抽象分離は将来の実装切替が想定される箇所（DB/外部API 等）のみに限定。原則として抽象と実装は同一ファイルに配置し、DI は最小限。

エンドポイント実装はすべて `routes.ts` から開始し、`service → repository` 方向で処理が流れる（逆依存は禁止）。

---

## AI開発支援最適化

機能単位で責務が閉じる構成を徹底し、同一ディレクトリ内で文脈が完結。ファイル名から用途が明示されることで、1-hop で全体を追跡可能。

---

## CRUDの扱い

基本的な CRUD/一覧取得は `service.ts` に集約。責務が増えたら `create.ts` / `detail.ts` / `list.ts` / `update.ts` / `delete.ts` に分離。ドメインロジックを含む場合は `usecase.ts` / `logic.ts` 等に明確化。

---

## shared/ の扱い

`shared/` は「アプリケーション全体に関わる横断的責務」のみ。

例）`logger` / `auth` / `database` / `security` / `types` など。`utils.ts` や `helpers/` のような責務不明構成は禁止。共通ロジックは責務名でディレクトリ化する。

---

## 禁止事項

- `utils.ts` による責務のゴミ箱化
- `shared` にドメイン横断でないものを置くこと
- LLM を知らずに叩く `worker` 設計（`prompt` も責務分離）
- `Model` を直接 import して CRUD 実装
- 構成から責務が読めないルート名（`config.ts`, `home.ts` 等）
- `schema` と `type` の分離（Zod と infer による一体運用）
- `interface` / `adapter` の過剰分離（抽象と実装は同一ファイルにまとめる）

---

## Swagger連携

`features/endpoint/` は HTTP ルーティングに対応する専用レイヤー。OpenAPI 仕様（例: `bolt.yaml`）の各パスは `features/endpoint/<path>/routes.ts` に 1:1 対応させる。

全体のマウントは `src/app.ts` で行い、API 仕様は OpenAPI を唯一のソースとして構成を準拠させる。

---

## ディレクトリ構成（本プロジェクト）

```
app/BE/
  src/
    app.ts                      # Express アプリ初期化（CORS/JSON/Error など）
    server.ts                   # 起動ブートストラップ（listen）
    features/
      endpoint/
        chat/                   # /api/chat
          routes.ts             # 既存 api.chat を移植
          service.ts
          schema.ts
          repository.ts
        
      llm/                      # LLM 呼び出し/プロンプト/ストリーム
        model.ts
        prompts.ts
        stream-text.ts
        switchable-stream.ts
      email/                    # （必要に応じて）通知/招待等
    models/                     # ORM モデル（CLI 生成、read-only）
    shared/
      auth/
      database/
      logger/
      security/
      types/
    middleware/
      cors.ts
      error.ts
      json.ts
    router.ts                   # ルート統合（features/endpoint/* を集約）

db/
  datamase.dbml                 # DB スキーマの唯一のソース
  migrations/                   # DBML → SQL 生成物

bolt.yaml                       # OpenAPI 仕様（任意/将来追加）
```

---

---

## 外部サービスの不使用

- CDN/マネージドDB/メール・SMS配信/オブジェクトストレージ等の外部クラウドサービスには依存しません。
- 実行・データ保存はローカル/セルフホストで完結させます（開発DBは既定で SQLite）。
- メール等が必要な場合はローカルMTAやスタブで代替します（外部APIは利用しない）。

---

## 既存からの移植ポイント
- `既存アプリのバックアップ/app/routes/api.chat.ts` → `features/endpoint/chat/routes.ts`
- `既存アプリのバックアップ/app/lib/.server/llm/*` → `features/llm/*`
- バックアップ由来の環境バインディングは `process.env` に統一

## DB（DBML 駆動 + ORM）
- 単一ソース: `db/datamase.dbml`
- 生成: DBML → `db/migrations/*.sql`（例: `@dbml/cli`）
- 適用: SQLite を既定（開発/小規模運用）。他 RDB に移行する場合はセルフホスト前提で接続設定のみ切替。
- モデル: ORM CLI で `src/models` を生成・同期（直接 import 禁止、`repository` 経由）

## 環境変数（開発例）
```
PORT=4000
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-pro
```

## CORS
- FE は `http://localhost:3000` を想定。`shared` or `middleware` で許可。

## スクリプト（予定）
- `pnpm dev`: ts-node/tsx で開発起動
- `pnpm build`: tsc ビルド
- `pnpm start`: ビルド成果物を実行
- `pnpm db:generate`: DBML → migrations 生成
- `pnpm db:migrate`: DB へ適用
