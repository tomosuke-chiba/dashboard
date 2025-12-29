# 開発マイルストーン

## プロジェクト概要

**プロジェクト名**: 求人媒体ダッシュボード
**MVP期限**: 1〜2週間以内
**初期テスト対象**: 1〜2件のクライアント

---

## マイルストーン一覧

| Phase | マイルストーン | ステータス |
|-------|---------------|-----------|
| 0 | 要件定義・設計 | ✅ 完了 |
| 1 | 環境構築 | 🔄 進行中 |
| 2 | データベース構築 | ⬜ 未着手 |
| 3 | スクレイピング機能 | ⬜ 未着手 |
| 4 | ダッシュボードUI | ⬜ 未着手 |
| 5 | 通知機能 | ⬜ 未着手 |
| 6 | 定期実行設定 | ⬜ 未着手 |
| 7 | テスト・デプロイ | ⬜ 未着手 |

---

## Phase 0: 要件定義・設計 ✅ 完了

### タスク

- [x] ヒアリング・要件整理
- [x] 要件定義書作成
- [x] 技術スタック決定
- [x] データベース設計（案）

### 成果物

- `docs/requirements.md`
- `docs/milestones.md`

---

## Phase 1: 環境構築 🔄 進行中

### タスク

- [x] Next.js プロジェクト作成
- [x] TypeScript 設定
- [x] Tailwind CSS 設定
- [x] 必要パッケージインストール（Supabase, Playwright, Recharts）
- [x] ディレクトリ構造作成
- [x] 型定義ファイル作成
- [ ] 環境変数設定（.env.local）
- [ ] Playwright ブラウザインストール完了確認

### 成果物

- プロジェクト基本構成
- `src/types/index.ts`
- `.env.local.example`

### 確認方法

```bash
npm run dev
# http://localhost:3000 でアクセス確認
```

---

## Phase 2: データベース構築 ⬜ 未着手

### タスク

- [ ] Supabase プロジェクト作成
- [ ] `clinics` テーブル作成
- [ ] `metrics` テーブル作成
- [ ] RLS (Row Level Security) 設定
- [ ] テストデータ投入（1〜2件のクライアント）
- [ ] Supabase クライアント接続確認

### テーブル定義

#### clinics
```sql
CREATE TABLE clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  guppy_login_id TEXT NOT NULL,
  guppy_password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### metrics
```sql
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  pv_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_metrics_clinic_id ON metrics(clinic_id);
CREATE INDEX idx_metrics_recorded_at ON metrics(recorded_at);
```

### 成果物

- Supabase プロジェクト
- データベーススキーマ
- `src/lib/supabase.ts` 接続確認

### 確認方法

- Supabase ダッシュボードでテーブル確認
- API経由でデータ取得テスト

---

## Phase 3: スクレイピング機能 ⬜ 未着手

### タスク

- [ ] GUPPY ログインページ構造調査
- [ ] ログイン処理実装
- [ ] 管理画面ナビゲーション実装
- [ ] PV数取得ロジック実装
- [ ] 応募数取得ロジック実装
- [ ] エラーハンドリング実装
- [ ] 単体テスト実施

### 調査が必要な項目

| 項目 | 内容 |
|------|------|
| ログインフォーム | input要素のname属性、formのaction |
| 管理画面URL | ログイン後のダッシュボードURL |
| PV表示場所 | セレクタ（class, id等） |
| 応募数表示場所 | セレクタ（class, id等） |

### 成果物

- `src/lib/scraper.ts` 完成版
- スクレイピングテストスクリプト

### 確認方法

```bash
# デバッグモードでスクレイピングテスト
npx ts-node scripts/test-scrape.ts
```

---

## Phase 4: ダッシュボードUI ⬜ 未着手

### タスク

- [ ] メトリクスカードコンポーネント
- [ ] 推移グラフコンポーネント
- [ ] クライアント一覧コンポーネント
- [ ] クライアント別ページ (`/clinic/[slug]`)
- [ ] 社内管理ページ (`/admin`)
- [ ] パスワード認証機能
- [ ] レスポンシブ対応

### 画面一覧

| ページ | URL | 認証 | 説明 |
|--------|-----|------|------|
| クライアント別 | `/clinic/[slug]` | なし | クライアント向けダッシュボード |
| 社内管理 | `/admin` | パスワード | 全クライアント一覧 |

### 成果物

- `src/components/MetricsCard.tsx`
- `src/components/MetricsChart.tsx`
- `src/components/ClinicList.tsx`
- `src/app/clinic/[slug]/page.tsx`
- `src/app/admin/page.tsx`

### 確認方法

```bash
npm run dev
# /admin でログイン確認
# /clinic/test-clinic でダッシュボード表示確認
```

---

## Phase 5: 通知機能 ⬜ 未着手

### タスク

- [ ] Discord Webhook 連携実装
- [ ] 新規応募検知ロジック実装
- [ ] 通知メッセージフォーマット作成
- [ ] 通知テスト実施

### 通知仕様

| 項目 | 内容 |
|------|------|
| 通知先 | Discord（1チャンネル） |
| トリガー | 応募数が前回より増加 |
| メッセージ | `{クライアント名}に新規応募がありました！` |

### 成果物

- `src/lib/discord.ts` 完成版

### 確認方法

- テスト通知をDiscordに送信して確認

---

## Phase 6: 定期実行設定 ⬜ 未着手

### タスク

- [ ] Vercel Cron 設定（または GitHub Actions）
- [ ] 10分間隔の定期実行設定
- [ ] CRON_SECRET による認証設定
- [ ] エラー時のアラート設定

### Vercel Cron 設定例

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### 成果物

- `vercel.json` または GitHub Actions workflow
- `/api/scrape` エンドポイント完成

### 確認方法

- 手動でAPIを叩いて動作確認
- Vercel ダッシュボードでCronログ確認

---

## Phase 7: テスト・デプロイ ⬜ 未着手

### タスク

- [ ] 1〜2件のクライアントでE2Eテスト
- [ ] Vercel へデプロイ
- [ ] 本番環境変数設定
- [ ] ドメイン設定（必要に応じて）
- [ ] 動作確認（本番環境）
- [ ] クライアントへURL共有

### デプロイチェックリスト

- [ ] 環境変数がすべて設定されている
- [ ] Supabase の本番URLが設定されている
- [ ] Discord Webhook URLが設定されている
- [ ] ADMIN_PASSWORD が設定されている
- [ ] CRON_SECRET が設定されている

### 成果物

- 本番稼働中のダッシュボード
- クライアント共有用URL

### 確認方法

- 本番URLでアクセス確認
- 10分後にデータが更新されることを確認
- Discord通知が届くことを確認

---

## 進捗サマリー

```
Phase 0: 要件定義・設計    [████████████████████] 100%
Phase 1: 環境構築          [████████████░░░░░░░░]  60%
Phase 2: データベース構築   [░░░░░░░░░░░░░░░░░░░░]   0%
Phase 3: スクレイピング機能 [░░░░░░░░░░░░░░░░░░░░]   0%
Phase 4: ダッシュボードUI   [░░░░░░░░░░░░░░░░░░░░]   0%
Phase 5: 通知機能          [░░░░░░░░░░░░░░░░░░░░]   0%
Phase 6: 定期実行設定      [░░░░░░░░░░░░░░░░░░░░]   0%
Phase 7: テスト・デプロイ   [░░░░░░░░░░░░░░░░░░░░]   0%

全体進捗: ████░░░░░░░░░░░░░░░░ 20%
```

---

## 次のアクション

1. **Phase 1 完了**: 環境変数設定、Playwrightインストール確認
2. **Phase 2 開始**: Supabase プロジェクト作成

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-29 | 初版作成 |
