# 設計: data-fetch-enhancement

## アーキテクチャ概要

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cron/Manual    │────▶│  /api/scrape     │────▶│  Scrapers       │
│  Trigger        │     │  (POST)          │     │  - GUPPY        │
└─────────────────┘     └──────────────────┘     │  - JobMedley    │
                                │                │  - Quacareer    │
                                ▼                └─────────────────┘
                        ┌──────────────────┐              │
                        │  Supabase        │◀─────────────┘
                        │  - metrics       │
                        │  - jobmedley_*   │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  /api/jobmedley  │
                        │  (GET)           │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  UI (React)      │
                        │  job-medley/     │
                        │  page.tsx        │
                        └──────────────────┘
```

---

## 変更設計

### 1. `/api/scrape/route.ts` の修正

#### 現状
```typescript
// 月間サマリーのみ取得
const jobmedleyResult = await scrapeJobMedley(
  clinic.jobmedley_login_id,
  clinic.jobmedley_password,
  jstYear,
  jstMonth,
  ...
);
```

#### 変更後
```typescript
// 月間サマリー取得（既存）
const jobmedleyResult = await scrapeJobMedley(...);

// 日別データ取得（新規追加）
const dailyBatchResult = await scrapeJobMedleyDailyBatch(
  clinic.jobmedley_login_id,
  clinic.jobmedley_password,
  clinic.id,
  clinic.name,
  jstYear,
  jstMonth,
  searchUrlMap  // 検索URL設定
);

// 日別データ保存
if (dailyBatchResult) {
  await saveDailyScrapingResult(supabase, dailyBatchResult);
}
```

#### 処理フロー
1. クリニックループ内でJobMedleyクレデンシャルを確認
2. 月間サマリー取得（既存処理）
3. **日別データ取得を追加**（`scrapeJobMedleyDailyBatch`）
4. 日別データをDB保存（`saveDailyScrapingResult`）
5. エラーハンドリング（失敗しても継続）

---

### 2. 検索順位の日別表示

#### 現状のUI
- `rank` オブジェクトで最新の検索順位のみ表示
- 日別データテーブルの `searchRank` は表示されているが、データがない

#### 変更
`dailyData` 配列内の `searchRank` を活用（データが保存されれば自動で表示）

```typescript
// 既存のDailyDataTableで表示される項目
{
  date: string;
  scoutSentCount: number;
  scoutApplicationCount: number;
  scoutApplicationRate: number | null;
  searchRank: number | null;  // ← これが表示される
  pageViewCount: number;
  applicationCountJobPage: number;
  jobPageApplicationRate: number | null;
}
```

**UI側の変更は不要**（データが入れば自動表示）

---

### 3. データフロー

#### スクレイピング時
```
scrapeJobMedleyDailyBatch
  └─► fetchDailyMetricsFromAPI   → PV/応募数/スカウト経由応募
  └─► scrapeScoutSentDaily       → スカウト送信数（ホバー取得）
  └─► scrapeSearchRankForJobOffer → 検索順位
        ↓
saveDailyScrapingResult
  └─► upsertDailyMetrics → jobmedley_scouts テーブル
```

#### API取得時（既存・変更なし）
```
/api/jobmedley?year=2025&month=1&slug=xxx
  └─► getDailyMetrics → jobmedley_scouts から取得
  └─► 日別データをレスポンス
```

---

### 4. エラーハンドリング

```typescript
try {
  const dailyBatchResult = await scrapeJobMedleyDailyBatch(...);
  if (dailyBatchResult) {
    const saveResult = await saveDailyScrapingResult(supabase, dailyBatchResult);
    if (!saveResult.success) {
      console.error(`Failed to save daily data for ${clinic.name}:`, saveResult.errors);
    }
  }
} catch (error) {
  console.error(`Daily batch scrape failed for ${clinic.name}:`, error);
  // エラーでも継続処理
}
```

---

## DB設計（既存テーブル確認）

### jobmedley_scouts
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID | PK |
| clinic_id | UUID | FK→clinics |
| date | DATE | 日付 |
| job_offer_id | TEXT | 求人ID（NULLは合算） |
| sent_count | INTEGER | スカウト送信数 |
| page_view_count | INTEGER | PV数 |
| application_count_total | INTEGER | 応募数 |
| scout_application_count | INTEGER | スカウト経由応募数 |
| cum_scout_sent_count | INTEGER | 累計スカウト数 |
| search_rank | INTEGER | 検索順位 |
| scraped_at | TIMESTAMP | 取得日時 |

**ユニーク制約**: `(clinic_id, job_offer_id, date)`

---

## 実装順序

1. **Phase 1**: スクレイパー呼び出し追加
   - `/api/scrape/route.ts` に `scrapeJobMedleyDailyBatch` 呼び出し追加
   - DB保存処理追加

2. **Phase 2**: 動作確認
   - ローカルでスクレイピング実行
   - DB保存確認
   - UI表示確認

3. **Phase 3**: エラー対応・改善
   - ログ出力強化
   - 過去月取得オプション追加

---

## リスク・考慮事項

### リスク1: スクレイピング時間の増加
- **対策**: 日別データ取得は時間がかかる（各日ホバー操作）
- **緩和**: 当月のみ取得、過去月は明示的に指定時のみ

### リスク2: ログインセッション
- **対策**: `scrapeJobMedleyDailyBatch` は内部でブラウザセッションを管理
- **注意**: 月間サマリーと日別で2回ログインする（最適化余地あり）

### リスク3: 検索順位取得の依存
- **条件**: `jobmedley_search_url` がクリニックに設定されている必要あり
- **未設定時**: 検索順位はnullとして保存

---

## テスト戦略

### 手動テスト
1. `/api/scrape?source=jobmedley` をPOST実行
2. Supabaseで `jobmedley_scouts` を確認
3. UIで日別データ表示を確認

### 自動テスト（将来）
- スクレイパーのモック化
- DB保存の単体テスト
