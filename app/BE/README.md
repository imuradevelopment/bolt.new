# Bolt App BE - アーキテクチャポリシー

バックエンドは Node.js + Express（PORT: 4000）で実装します。DB スキーマは `db/schema.dbml` を唯一のソースとし、DBML → SQL マイグレーション生成 → 適用の手順で管理します。

## 設計原則

先に3行でまとめます。
1. `/src/shared/` はアプリケーション横断機能
2. `/src/features/` 直下はエンドポイント横断機能
3. `/src/features/endpoint/[domain]` はエンドポイント固有機能

---

## 構成 = 設計

ファイル名とディレクトリパスだけで中身の責務が即座に分かること。

`utils` / `common` / `core` のような曖昧な構成は一切禁止。

処理対象と責務をパス全体で表現する。責務を抽象名に逃がさない。

---

## ドメイン駆動構成（DDD志向 + LLM対応）

各機能は `features/` 以下に集約し、次の構成単位で責務を明示：

- `routes.ts`：ルーティング（唯一の外部エントリポイント）
- `service.ts`：アプリケーションサービス層（ビジネスルールとユースケース処理）
- `schema.ts`：Zod による入力バリデーション（`.infer<>` によって型生成を一体化）
- `repository.ts`：DB アクセスの責務分離（`models` 直アクセスは禁止）
- `worker.ts` / `queue.ts`：非同期/LLM タスク処理（必要に応じて）

永続化層のモデルは `models/` に配置。DB スキーマは `db/schema.dbml` を唯一のソースとし、`@dbml/cli` で SQL マイグレーションを生成し適用する。ORM/クエリ実装（Sequelize/Knex/Drizzle 等）は repository 層経由に限定し、`models` の直接 import は許可しない。

複雑なユースケースでは、`service.ts` をディレクトリ化し、`create.ts` / `update.ts` などで分割。`repository` も同様に `crud.ts` / `query.ts` / `aggregate.ts` 等に分割し、`index.ts` で再統合する構成とする。

`interface` / `adapter` の抽象分離は、将来的に実装切替が想定される箇所（DB, 外部 API 等）に限定する。原則として、`interface` と実装は同一ファイルに配置すること（LLM の文脈保持を優先）。DI の導入も最小限に抑える。

エンドポイント実装はすべて `routes.ts` から開始し、`service → repository` の方向で処理が流れる。逆依存は禁止する。

---

## AI 開発支援最適化

Cursor 等の AI 開発支援ツールが「機能単位」でコード探索できる構成を徹底。同一ディレクトリ内に責務が揃っていることで、LLM が文脈を見失わずに修正・提案可能。ファイル名から用途が明示され、LLM の 1-hop 探索で処理全体がトレース可能であること。

---

## CRUD の扱い

基本的な CRUD/一覧取得は `service.ts` に集約。ただし責務が増えた場合はファイル分割を行い、`create.ts` / `detail.ts` / `list.ts` / `update.ts` / `delete.ts` に分離。ドメインロジックを含む場合は `usecase.ts` や `logic.ts` 等に明確に責務分離する（可能な限り `create.ts`, `detail.ts`, `list.ts`, `update.ts`, `delete.ts` に収める）。

---

## shared/ の扱い

`shared/` は「アプリケーション全体に関わる横断的責務」を明示するためのレイヤー。

`logger` / `auth` / `database` / `aws` / `security` など、スコープが全機能にまたがるもののみ配置可能。`utils.ts`, `helpers/`, `core/` のような責務不明構成は禁止。共通ロジックは明示的に責務名でディレクトリを切ること。

---

## 認証・認可の扱い

### 権限管理システムの設計原則

権限管理は API エンドポイント単位で細かく制御。粗い権限（`manage`/`view`）ではなく、具体的な操作権限（`create`, `update`, `delete` 等）を定義する。

権限チェックは各 `service.ts` の冒頭で実行し、認可失敗時は即座に 403 エラーを返す。権限ロジックをビジネスロジックと混在させない。

### 権限定義の配置

- 権限定数: `shared/types/user-status.ts`（全ドメイン共通）
- 権限マネージャー: `shared/auth/permission.ts`（権限判定ロジック）
- JWT 認証: `shared/auth/jwt.ts`（認証・権限設定）

### 権限フロー

1. JWT 認証でユーザー情報と権限を `req.user`・`req.authorityStatusCode` に設定
2. Service 層で `AuthPermissionManager.hasPermission()` により権限チェック
3. 権限不足時は 403 エラーで即座に処理中断
4. 権限充足時のみビジネスロジックを実行

### 招待システムとの連携

招待時に指定した権限（`authorityStatusCode`）は、招待受諾後に組織ユーザーとして正確に反映される。招待→登録→ログイン→権限設定の一連の流れで、権限の欠損や不整合が発生しないよう設計。

---

## 禁止事項

- `utils.ts` による責務のゴミ箱化
- `shared` にドメイン横断でないものを置くこと
- LLM を知らずに叩く `worker` 設計（`prompt` も責務分離）
- `Model` を直接 import して CRUD 実装
- 構成から責務が読めないルート名（`config.ts`, `home.ts` 等）
- `schema` と `type` の分離（Zod と infer による一体運用を徹底）
- `interface` / `adapter` の責務分離（抽象と実装は同一ファイルにまとめる）

---

## OpenAPI（Swagger）連携

`features/endpoint/` は、HTTP ルーティングに対応するエントリポイントのみを配置する専用レイヤー。OpenAPI 仕様（例: `bolt-api.yaml`）に定義されたエンドポイント群は、すべて `features/endpoint/<path>/routes.ts` に個別に対応する構成を取る。

アプリ全体のルーティングは `src/app.ts` にて、全ての `features/endpoint/<path>/routes.ts` をルートごとにマウント。API 仕様は OpenAPI によって一元管理され、コード構成はこれに準拠する。

---

## ディレクトリ構成概要（予定）

```
app/BE/
  src/
    features/                             # DDD コンテキストルート
      endpoint/                           # 入出力責務特化（REST の唯一の入口）
        auth/
        chat/
        enhancer/
      email/                              # エンドポイント横断内部機能（通知/招待等）
      llm/                                # LLM プロンプト/呼び出し/生成責務
        prompts/
        handlers/
        worker.ts
    models/                               # DB モデル（DBML→マイグレーション適用後に生成/定義）
    shared/
      auth/
      database/
      logger/
      security/
      types/
    app.ts                                # アプリ初期化・ミドルウェア定義
    router.ts                             # 全エンドポイント統合ルーター定義

db/
  schema.dbml                             # DB スキーマ（唯一のソース）
  migrations/                             # DBML から生成した SQL マイグレーション

bolt-api.yaml                             # OpenAPI 仕様（REST 仕様のソース）
```

---

## 環境変数（例）

```
PORT=4000
DATABASE_URL=file:./data/dev.sqlite
GEMINI_API_KEY=
```
