## Docker での起動

BE と FE は将来分割を想定し、各ディレクトリごとに `docker-compose.yml` を配置しています。

- バックエンド（BE）
  - ファイル: `app/BE/docker-compose.yml`
  - 起動: `cd app/BE && docker compose up --build`
  - URL: `http://localhost:4000`
  - 備考: `POSTGRES_URL` 未設定時は `db` サービス（Postgres）に接続

- フロントエンド（FE）
  - ファイル: `app/FE/docker-compose.yml`
  - 起動: `cd app/FE && docker compose up --build`
  - URL: `http://localhost:3000`


