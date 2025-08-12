## Docker での起動（BE/FE/DB 一括）

1) 前提
- Docker / Docker Compose
- `app/BE/.env` と `app/FE/.env` を作成（`.env.example` をベースに設定）
- BE 側 `.env` に `POSTGRES_URL` を未指定でも、Compose 既定の `db` サービスへ接続します

2) 起動
```
docker compose up --build
```
- FE: `http://localhost:3000`
- BE: `http://localhost:4000`
- DB: `postgres://postgres:postgres@localhost:5432/bolt`

3) 停止/削除
```
docker compose down
```


