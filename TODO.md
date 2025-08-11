# TODO（次のチャットへの引き継ぎメモ）

目的: 「既存アプリのバックアップを解析し、バックエンドは Node/Express、フロントエンドは Nuxt 3 でMVPを再構築」

前提/決定事項（ここでは要点のみ。詳細は各README参照）
- 外部サービス不使用（CDN/マネージドDB/外部API等なし）。ローカル/セルフホスト完結。
- BE: Node/Express、FE: Nuxt 3。DBはDBML駆動（既定SQLite）。
- ブランチ: feature/nuxt-express-mvp。

必読（作業前に必ず確認）
- app/BE/README.md（設計原則・レイヤリング・移植方針）
- app/FE/README.md（フロントのコーディング規約/構成方針）
- 既存アプリのバックアップ/README.md（参照用：移植元の概要）

移植マップ（既存→新規）
- 既存: 既存アプリのバックアップ/app/routes/api.chat.ts
  - 新規: app/BE/src/features/endpoint/chat/{routes.ts, service.ts, schema.ts, repository.ts}
  - メモ: LLMストリーミング（チャンク）/継続生成（トークン上限時）。Node向けにストリームAPIへ適合。
- 既存: 既存アプリのバックアップ/app/routes/api.enhancer.ts
  - 新規: app/BE/src/features/endpoint/enhancer/{routes.ts, service.ts, schema.ts, repository.ts}
  - メモ: 改善済みプロンプトをプレーンテキストで逐次出力。
- 既存: 既存アプリのバックアップ/app/lib/.server/llm/{model.ts, prompts.ts, stream-text.ts, switchable-stream.ts}
  - 新規: app/BE/src/features/llm/{model.ts, prompts.ts, stream-text.ts, switchable-stream.ts}
  - メモ: 実際のLLMを使用（外部API: Gemini）。`.env` の `LLM_PROVIDER=gemini`, `GEMINI_MODEL`, `GEMINI_API_KEY` を利用してストリーミング呼び出し。鍵はコミットしない。
- 既存: 既存アプリのバックアップ/app/entry.server.tsx などSSR系
  - 新規: FE側はNuxt SSRで代替（既存のSSRコードは移植対象外）。
- 既存: WebContainers/Workbench/Editor/Terminal 等 UI（components/workbench/*, components/editor/* 他）
  - 新規: MVPでは非対象。FEはチャット画面の最小実装に限定。
- 既存: IndexedDBベースの履歴（app/lib/persistence/*）
  - 新規: サーバ保存（DB）へ移行。必要ならFEでローカル履歴を任意で保持（後回し）。

MVPのスコープ（抜粋）
- 含める: /api/chat, /api/enhancer（チャンクストリーミング）, FEのチャット画面, CORS/エラーハンドリング, DB（users/chats/messagesの最小）
- 含めない: Workbench/Terminal/WebContainers、認証・権限、OpenAPI定義の整備（後日）

タスク（チェックリスト）
1) BEスキャフォールド
   - app/BE/src/{server.ts, app.ts, router.ts}
   - middleware: cors.ts, error.ts, json.ts（制限値含む）
2) LLM接続（外部: Gemini）
   - features/llm/{prompts.ts, switchable-stream.ts}を移植
   - stream-text.ts: Gemini API をストリーミングで呼び出し、そのままチャンク転送
   - model.ts: `LLM_PROVIDER=gemini`, `GEMINI_MODEL`, `GEMINI_API_KEY` を参照
   - 失敗時はわかりやすいエラーを返す（鍵未設定/クォータ超過など）
3) エンドポイント
   - endpoint/chat: POST /api/chat（Body: {messages}）→ テキスト/プレーンでチャンク返却
   - endpoint/enhancer: POST /api/enhancer（Body: {message}）→ 改善済テキストのチャンク返却
4) DB
   - db/datamase.dbml を作成（users/chats/messages）
   - マイグレーション生成と適用スクリプト整備
   - repository 実装（直接 models をimportしない）
5) FE（Nuxt3）
   - チャット画面（Pages + Templates + Organisms骨子）
   - API_BASE_URL で BE 接続、ストリーム表示（テキスト追記）
6) 動作確認
   - BE/FE起動→手動でチャット実行→継続生成・分割送出の確認

仕様メモ（READMEと重複しない補足）
- ストリーミング形式: text/plain のチャンク配信（SSE不要）。ヘッダ/フラッシュは Node/Expressの既定で対応。
- 継続生成: 既存のトークン上限ロジックを模して、一定長でスイッチング（SwitchableStream）
- エラー返却: 500時は本文なしで statusText のみ。FEはグローバルアラートで通知。

リスク/懸念
- LLM外部APIのレイテンシ/クォータ/コスト
- DBスキーマ確定前のAPI確定の順番
- ストリームのブラウザ互換性（Nuxt側のReadableStream処理）

次のチャットで決めたいこと
- モデル/設定の確定（`GEMINI_MODEL` 候補、温度/最大トークン等）
- ストリーミング実装: チャンク or SSE（現状はチャンク想定のままで良いか）
- DBスキーマの確定（users/chats/messages の属性詳細）
- Nuxtの状態管理（Pinia採用有無）
- ログ出力レベル/フォーマット（開発時はDEBUG）

受け入れ基準（DoD）
- FEから入力→BEがチャンクで応答→FEでリアルタイム描画が成立
- /api/chat と /api/enhancer が実LLM応答で動作（Gemini API 経由）
- DBMLからマイグレーション生成・適用が成功（SQLite）
- 外部サービス依存はLLM APIのみに限定（他クラウド機能は不使用）