# OPERATIONS.md

> このファイルはセッションをまたいでも100%作業再開できる状態を維持するためのものです。
> commit前に自動更新されます。

---

## Session Handoff

### 目的
歯科医院向け求人媒体（GUPPY/ジョブメドレー/Quacareer）のアクセスデータを収集・表示するダッシュボード

### 直近やったこと
- Phase 1実装完了（2025-12-30）
  - 職種別データ対応（Dr/DH/DA）のDB設計・スクレイパー準備
  - スカウトメール取得機能（送信数・返信数）
  - 閲覧率30%超アラート（Discord通知）
  - Bitly API連携（クリック数取得）
  - ダッシュボードUI更新（職種タブ・スカウトセクション追加）
  - Cron設定（1日4回: 0時/6時/12時/18時）

### 次にやること
- [ ] DBマイグレーション実行（`supabase/migrations/001_add_job_type_and_new_tables.sql`）
- [ ] 環境変数追加: `BITLY_ACCESS_TOKEN`
- [ ] 各クリニックのBitly URL登録（clinics.bitly_url）
- [ ] GUPPY管理画面の職種タブセレクタ確認・調整
- [ ] Vercelデプロイ
- [ ] Phase 2: ジョブメドレー対応

### 詰まっていること
- 職種タブのセレクタ（`scraper.ts`の`selectJobTypeTab`関数）はGUPPY管理画面の実際のHTML構造確認が必要

### 次回の最初に実行するコマンド
```bash
# 1. Supabase SQL Editorでマイグレーション実行
# ファイル: supabase/migrations/001_add_job_type_and_new_tables.sql

# 2. 環境変数追加（.env.local）
# BITLY_ACCESS_TOKEN=your-bitly-token

# 3. 開発サーバー起動
npm run dev
```

### 関連コマンド
```bash
# スクレイピング手動実行
curl -X POST http://localhost:3000/api/scrape -H "Authorization: Bearer ${CRON_SECRET}"

# クリニックCSVインポート
npx ts-node scripts/import-clinics.ts
```

---

## Quick Start

```bash
# 1. 依存インストール
npm install

# 2. Playwrightブラウザインストール
npx playwright install

# 3. 環境変数設定
cp .env.local.example .env.local
# → .env.local を編集して値を設定

# 4. 起動
npm run dev
# → http://localhost:3000
```

---

## Environment

### Runtime
<!-- AUTO-UPDATED-START -->
| Key | Value |
|-----|-------|
| Node | v25.2.1 |
| npm | 11.6.2 |
| Branch | main |
| Last Commit | a4165a5 test: add OPERATIONS.md |
| Updated | 2025-12-30 16:16:57 |
<!-- AUTO-UPDATED-END -->

### Ports
| Service | Port |
|---------|------|
| Next.js Dev | 3000 |

### Environment Variables (.env.local)
| Key | 取得場所 | 必須 |
|-----|---------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase Dashboard → Settings → API | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase Dashboard → Settings → API | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard → Settings → API | Yes |
| DISCORD_WEBHOOK_URL | Discord → Server Settings → Integrations → Webhooks | Yes |
| ADMIN_PASSWORD | 任意の値を設定 | Yes |
| CRON_SECRET | 任意の値を設定（API認証用） | Yes |
| NEXT_PUBLIC_BASE_URL | デプロイ後の本番URL or http://localhost:3000 | Yes |
| BITLY_ACCESS_TOKEN | Bitly Settings → API → Access Token | Yes (Phase1) |

---

## Runbook

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### 本番起動
```bash
npm run start
```

### Lint
```bash
npm run lint
```

### 型チェック
```bash
npx tsc --noEmit
```

### スクレイピングテスト
```bash
# 単一クリニックでテスト
npx ts-node scripts/test-scrape.ts

# 全クリニック実行（API経由）
curl -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

---

## Supabase

### 現在の構成
- **クラウドSupabase使用**（ローカルSupabaseは未定）
- Project URL: Supabase Dashboardで確認

### テーブル構成
- `clinics`: クライアント（歯科医院）情報 + bitly_url
- `metrics`: 日別アクセスデータ + job_type
- `scout_messages`: スカウトメールデータ（送信数・返信数・開封数）
- `bitly_clicks`: Bitlyクリックデータ

### スキーマ適用
```bash
# Supabase Dashboard → SQL Editor で実行
# 初期スキーマ: supabase/schema.sql
# マイグレーション: supabase/migrations/001_add_job_type_and_new_tables.sql
```

### シードデータ
```bash
# CSVインポート（推奨）
npx ts-node scripts/import-clinics.ts
# → data/clinics-guppy-pw.csv を読み込む
```

### ローカルSupabase（将来対応時）
```bash
# インストール
brew install supabase/tap/supabase

# 起動
supabase start

# 停止
supabase stop

# マイグレーション
supabase db reset
```

---

## Troubleshooting

### `supabaseUrl is required` エラー
**原因**: .env.local が設定されていない
**対処**:
```bash
cp .env.local.example .env.local
# → 値を設定
```

### `Executable doesn't exist at .../chromium` エラー
**原因**: Playwrightブラウザ未インストール
**対処**:
```bash
npx playwright install
```

### スクレイピングで `Login failed` エラー
**原因**: GUPPYのログイン情報が間違っている
**対処**: clinicsテーブルの `guppy_login_id`, `guppy_password` を確認

### ポート3000が使用中
**原因**: 別のNext.jsプロセスが動作中
**対処**:
```bash
pkill -f "next dev"
# または
lsof -i :3000
kill -9 <PID>
```

### Discord通知が届かない
**原因**: Webhook URLが未設定 or 無効
**対処**: .env.local の `DISCORD_WEBHOOK_URL` を確認

### Bitlyクリック数が取得できない
**原因**: BITLY_ACCESS_TOKEN未設定 or clinics.bitly_url未登録
**対処**:
1. .env.local に `BITLY_ACCESS_TOKEN` を設定
2. clinicsテーブルの `bitly_url` にBitly短縮URLを登録

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── clinics/        # クリニックAPI
│   │   └── scrape/         # スクレイピングAPI（閲覧率アラート・Bitly連携含む）
│   └── clinic/
│       ├── page.tsx        # クリニック一覧（HOME）
│       └── [slug]/
│           ├── guppy/      # GUPPYダッシュボード（職種タブ・スカウトセクション）
│           ├── job-medley/ # ジョブメドレー（Coming Soon）
│           └── quacareer/  # Quacareer（Coming Soon）
├── lib/
│   ├── supabase.ts         # Supabaseクライアント
│   ├── scraper.ts          # GUPPYスクレイパー（職種別・スカウト取得）
│   ├── discord.ts          # Discord通知（応募通知・閲覧率アラート）
│   └── bitly.ts            # Bitly APIクライアント
└── types/
    └── index.ts            # 型定義（職種・スカウト・Bitly型追加）

scripts/
├── import-clinics.ts       # CSVインポート
├── test-scrape.ts          # スクレイピングテスト
└── update_operations.sh    # OPERATIONS.md自動更新

supabase/
├── schema.sql              # DBスキーマ（最新版）
└── migrations/
    └── 001_add_job_type_and_new_tables.sql  # Phase1マイグレーション

data/
└── clinics-guppy-pw.csv    # クリニック情報CSV

docs/
├── requirements.md         # 全体要件定義書
├── requirements-guppy.md   # GUPPY詳細要件
├── requirements-jobmedley.md   # ジョブメドレー詳細要件
└── requirements-quacareer.md   # クオキャリア詳細要件

vercel.json                 # Cron設定（1日4回）
```

---

## Change Log

| 日付 | 内容 |
|------|------|
| 2024-12-29 | OPERATIONS.md 作成 |
| 2024-12-29 | Phase 0-5 完了（スクレイピング、UI、Discord通知） |
| 2024-12-29 | 17クライアント、6ヶ月分データ取得完了 |
| 2025-12-30 | Phase 1完了（職種別、スカウト、Bitly、閲覧率アラート、Cron設定） |
| 2025-12-30 | 要件定義書作成（requirements.md、媒体別詳細要件） |