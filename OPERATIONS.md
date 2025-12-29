# OPERATIONS.md

> このファイルはセッションをまたいでも100%作業再開できる状態を維持するためのものです。
> commit前に自動更新されます。

---

## Session Handoff

### 目的
歯科医院向け求人媒体（GUPPY/ジョブメドレー/Quacareer）のアクセスデータを収集・表示するダッシュボード

### 直近やったこと
- GUPPYスクレイピング実装完了（過去6ヶ月分対応）
- 17クライアントのデータ登録
- ダッシュボードUI完成（月別切り替え機能）
- Discord通知設定完了

### 次にやること
- [ ] Phase 6: Vercel Cron設定（10分間隔の自動更新）
- [ ] Phase 7: Vercelデプロイ
- [ ] ジョブメドレー/Quacareerスクレイピング実装

### 詰まっていること
なし

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
| Node | not installed |
| npm | not installed |
| Branch | main |
| Last Commit | 64f82bc Initial commit |
| Updated | 2025-12-29 21:16:31 |
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
- `clinics`: クライアント（歯科医院）情報
- `metrics`: 日別アクセスデータ

### スキーマ適用
```bash
# Supabase Dashboard → SQL Editor で実行
# ファイル: supabase/schema.sql
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

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── clinics/        # クリニックAPI
│   │   └── scrape/         # スクレイピングAPI
│   └── clinic/
│       ├── page.tsx        # クリニック一覧（HOME）
│       └── [slug]/
│           ├── guppy/      # GUPPYダッシュボード
│           ├── job-medley/ # ジョブメドレー（Coming Soon）
│           └── quacareer/  # Quacareer（Coming Soon）
├── lib/
│   ├── supabase.ts         # Supabaseクライアント
│   ├── scraper.ts          # GUPPYスクレイパー
│   └── discord.ts          # Discord通知
└── types/
    └── index.ts            # 型定義

scripts/
├── import-clinics.ts       # CSVインポート
├── test-scrape.ts          # スクレイピングテスト
└── update_operations.sh    # OPERATIONS.md自動更新

supabase/
├── schema.sql              # DBスキーマ
└── seed.sql                # シードデータ

data/
└── clinics-guppy-pw.csv    # クリニック情報CSV
```

---

## Change Log

| 日付 | 内容 |
|------|------|
| 2024-12-29 | OPERATIONS.md 作成 |
| 2024-12-29 | Phase 0-5 完了（スクレイピング、UI、Discord通知） |
| 2024-12-29 | 17クライアント、6ヶ月分データ取得完了 |
