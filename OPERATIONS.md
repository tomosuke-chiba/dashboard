# OPERATIONS.md

> このファイルはセッションをまたいでも100%作業再開できる状態を維持するためのものです。
> commit前に自動更新されます。

---

## Session Handoff

### 目的
歯科医院向け求人媒体（GUPPY/ジョブメドレー/Quacareer）のアクセスデータを収集・表示するダッシュボード
Notion案件進捗ダッシュボード（/dashboard/sales）の集計・可視化

### 直近やったこと
- Phase 1 全完了（2025-12-30）
  - [x] DBマイグレーション実行（job_type, source, scout_messages, bitly_clicks）
  - [x] 環境変数追加: `BITLY_ACCESS_TOKEN`
  - [x] Bitly URL登録（3クリニック: 津谷歯科医院, みどりの歯科医院, Well-being Dental Clinic）
  - [x] Vercelデプロイ完了（https://dashbord-pink.vercel.app）
  - [x] トップページ → /clinic リダイレクト実装
  - [x] Cron設定（Hobby制限で1日1回に変更）
  - [x] 職種別データ取得・表示（Phase 1-D）
  - [x] スカウトメール日別送信数取得（Phase 1-E）
  - [x] Bitlyクリック率計算ロジック確認済み

- Phase 1-G: Bitlyリンク別クリック追跡（2025-12-30）
  - [x] `bitly_links`テーブル新規作成（個別リンク管理用）
  - [x] `bitly_link_clicks`テーブル新規作成（リンク別日別クリック数）
  - [x] Bitly APIでグループ内全リンク取得機能追加
  - [x] 命名規則でリンクをフィルタリング: `bit.ly/{クリニック名}-{媒体}-{ID}`
  - [x] UIにスカウト文面別クリック数テーブルを表示

- Notion案件進捗ダッシュボード（2025-12-31）
  - [x] Notion API集計（契約完了/振込確認の契約完了日で当月カウント）
  - [x] ステータス正規化（絵文字なし/空白揺れ対応）
  - [x] 月別・年間（2026年通年）切替
  - [x] 年間表示は月次値（1月〜12月）でグラフ表示、Y軸0〜12固定
  - [x] 9月ノルマを9件に変更（年間ノルマ100）
  - [x] リード件数は「リード＋日程確定」の合算表示
  - [x] UIデザイン刷新（ダークモード/ライトモード切替、ヤギ/人アイコン視認性向上）
  - [x] useThemeフック実装（テーマ切替・永続化）
  - [x] /dashboard/sales ページ完成

### 次にやること

**Notion案件進捗ダッシュボード**
- [ ] 追加機能検討中（ユーザーフィードバック待ち）

**次回のDB適用**
- [x] マイグレーション実行: `supabase/migrations/002_add_bitly_links_table.sql` ✅ 完了（2025-12-31）
- [ ] マイグレーション実行: `supabase/migrations/003_add_jobmedley_search_fields.sql`
- [ ] マイグレーション実行: `supabase/migrations/004_add_jobmedley_quacareer_tables.sql`
- [ ] マイグレーション実行: `supabase/migrations/005_add_jobmedley_credentials.sql`

**Bitly URL命名規則での運用開始**
- 命名規則: `bit.ly/{クリニックslug}-{媒体}-{ID}`
- 例: `bit.ly/tsutani-guppy-001`, `bit.ly/midorino-quacareer-002`
- Bitlyで短縮URL作成時に「カスタムバックハーフ」を上記形式で設定

**Phase 2: ジョブメドレー対応**（後回し）

### 詰まっていること
- なし

### 次回の最初に実行するコマンド
```bash
# 1. Supabase SQL Editorでマイグレーション実行
# ファイル: supabase/migrations/002_add_bitly_links_table.sql

# 2. 開発サーバー起動
npm run dev

# 3. スクレイピング実行（Bitlyリンク取得含む）
curl -X POST http://localhost:3000/api/scrape -H "Authorization: Bearer ${CRON_SECRET}"
```

### 関連コマンド
```bash
# スクレイピング手動実行（全媒体）
curl -X POST http://localhost:3000/api/scrape -H "Authorization: Bearer ${CRON_SECRET}"

# 媒体別スクレイピング
curl -X POST "http://localhost:3000/api/scrape?source=guppy" -H "Authorization: Bearer ${CRON_SECRET}"
curl -X POST "http://localhost:3000/api/scrape?source=jobmedley" -H "Authorization: Bearer ${CRON_SECRET}"
curl -X POST "http://localhost:3000/api/scrape?source=quacareer" -H "Authorization: Bearer ${CRON_SECRET}"

# Notionダッシュボード集計
curl http://localhost:3000/api/dashboard/summary?year=2026&month=0

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
| Last Commit | afb5407 1/1 1:00 |
| Updated | 2026-01-04 12:28:50 |
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
| NOTION_API_KEY | Notion Integrations → Internal Integration | Yes (Dashboard) |
| NOTION_DATABASE_ID | Notion DB ID | Yes (Dashboard) |
| DASHBOARD_PASSWORD | 任意の値を設定 | Yes (Dashboard) |

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
- `bitly_clicks`: Bitlyクリックデータ（クリニック単位の合計）
- `bitly_links`: Bitlyリンク管理（命名規則: `{slug}-{source}-{id}`）
- `bitly_link_clicks`: リンク別日別クリック数

### スキーマ適用
```bash
# Supabase Dashboard → SQL Editor で実行
# 初期スキーマ: supabase/schema.sql
# マイグレーション1: supabase/migrations/001_add_job_type_and_new_tables.sql
# マイグレーション2: supabase/migrations/002_add_bitly_links_table.sql
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
| 2025-12-30 | Phase 1-G: Bitlyリンク別クリック追跡機能追加（命名規則ベース自動検出） |
| 2025-12-31 | Notion案件進捗ダッシュボード完成（UIデザイン刷新、ダークモード対応） |
