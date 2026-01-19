# Requirements Document

## Introduction

採用メディア管理ダッシュボードにおいて、スカウト返信数と面接設定数は採用活動の重要なKPIであるが、現状は自動スクレイピングで取得できないデータ項目となっている。採用担当者が日別にこれらの指標を手動入力し、他のメトリクスと併せて可視化できる機能を実装する。

既存のジョブメドレースカウト送信数の手動入力UI（`/clinic/[slug]/job-medley`）と同様のカレンダー形式を採用し、3媒体（GUPPY・ジョブメドレー・クオキャリア）の全てで利用可能にする。

## Requirements

### Requirement 1: データベーススキーマ拡張

**Objective:** As a システム開発者, I want metricsテーブルに新規カラムを追加する, so that スカウト返信数と面接設定数を日別・媒体別に記録できる

#### Acceptance Criteria

1. The Database Schema shall add `scout_reply_count` column to `metrics` table with INTEGER type and DEFAULT 0
2. The Database Schema shall add `interview_count` column to `metrics` table with INTEGER type and DEFAULT 0
3. When 既存データがある場合, the Migration Script shall preserve all existing data without data loss
4. The Database Schema shall maintain existing UNIQUE constraint `(clinic_id, date, source, job_type)`
5. The Database Schema shall support NULL values for `scout_reply_count` and `interview_count` to distinguish between "not entered" and "entered as 0"

### Requirement 2: 手動入力UI（カレンダー形式）

**Objective:** As a 採用担当者, I want カレンダー形式で日別のスカウト返信数と面接設定数を入力する, so that 月ごとの採用活動データを効率的に記録できる

#### Acceptance Criteria

1. When ユーザーがGUPPYページにアクセスする, the UI shall display calendar-style input grid for scout_reply_count and interview_count
2. When ユーザーがジョブメドレーページにアクセスする, the UI shall display calendar-style input grid for scout_reply_count and interview_count
3. When ユーザーがクオキャリアページにアクセスする, the UI shall display calendar-style input grid for scout_reply_count and interview_count
4. The UI shall provide year/month selector to navigate between different time periods
5. The UI shall display each day of the selected month with input fields for both metrics
6. The UI shall pre-populate existing values when 既存データが存在する場合
7. When ユーザーが数値を入力する, the UI shall accept only non-negative integers (0以上の整数)
8. The UI shall provide visual feedback (e.g., loading state, success message) during save operation
9. The UI shall display error messages when 保存に失敗した場合

### Requirement 3: API エンドポイント

**Objective:** As a フロントエンド開発者, I want 手動入力データを保存するAPIエンドポイント, so that クライアントからデータ送信できる

#### Acceptance Criteria

1. The API Endpoint shall accept POST requests at `/api/metrics/manual-input`
2. The Request Body shall include `clinic_id` (UUID), `source` (guppy|jobmedley|quacareer), and `entries` (array of daily data)
3. When リクエストを受信する, the API shall validate that `clinic_id` exists in the database
4. When リクエストを受信する, the API shall validate that `source` is one of valid media types
5. When リクエストを受信する, the API shall validate that each entry contains `date`, `scout_reply_count`, and `interview_count`
6. The API shall upsert data using conflict resolution on `(clinic_id, date, source, job_type)`
7. When データ保存に成功する, the API shall return 200 status with success message
8. If バリデーションエラーが発生する, the API shall return 400 status with error details
9. If データベースエラーが発生する, the API shall return 500 status with error message

### Requirement 4: TypeScript型定義更新

**Objective:** As a 開発者, I want 型安全な実装, so that コンパイル時に型エラーを検出できる

#### Acceptance Criteria

1. The DailyMetrics interface shall include `scout_reply_count: number | null` field
2. The DailyMetrics interface shall include `interview_count: number | null` field
3. The API Request Types shall define `ManualInputEntry` interface with required fields
4. The API Request Types shall define `ManualInputRequest` interface with `clinic_id`, `source`, and `entries`
5. The Component Props shall define types for manual input UI components

### Requirement 5: データ整合性と検証

**Objective:** As a システム管理者, I want データの整合性を保証する, so that 不正なデータが記録されないようにする

#### Acceptance Criteria

1. When 数値入力を検証する, the System shall reject negative values
2. When 数値入力を検証する, the System shall reject non-integer values
3. When 日付を検証する, the System shall reject future dates (未来日の入力を禁止)
4. When 日付を検証する, the System shall accept dates in format YYYY-MM-DD
5. The System shall prevent duplicate entries for same `(clinic_id, date, source, job_type)` combination
6. When 既存データを上書きする, the System shall update `updated_at` timestamp

### Requirement 6: 既存UIパターンとの整合性

**Objective:** As a ユーザー, I want 既存のjobmedley_scouts UIと同じ操作感, so that 学習コストなく使える

#### Acceptance Criteria

1. The Manual Input UI shall use same calendar grid layout as jobmedley_scouts input
2. The Manual Input UI shall use same month/year navigation controls as existing pattern
3. The Manual Input UI shall use same save button design and placement as existing pattern
4. The Manual Input UI shall use same loading state indicator as existing pattern
5. The Manual Input UI shall use same success/error message display as existing pattern

### Requirement 7: 一覧画面での表示

**Objective:** As a 採用担当者, I want 一覧画面で手動入力したメトリクスを確認する, so that 全体の採用状況を把握できる

#### Acceptance Criteria

1. When クリニック一覧画面を表示する, the System shall include scout_reply_count in metrics summary
2. When クリニック一覧画面を表示する, the System shall include interview_count in metrics summary
3. The List View shall display these metrics alongside existing metrics (display_count, view_count, application_count)
4. The List View shall indicate when manual input data is missing (NULL値の場合は「未入力」と表示)

## Technical Investigation

### 調査が必要な事項

- [ ] 既存のjobmedley_scoutsテーブルとmetricsテーブルのデータ統合方法
- [ ] NULL値と0の区別をUIでどう表現するか（未入力 vs 0件）
- [ ] job_typeカラムがNULLの場合の扱い（全職種合計 vs 職種未指定）

### 技術的制約

- メトリクステーブルの複合ユニーク制約 `(clinic_id, date, source, job_type)` を維持する必要がある
- 既存のスクレイピングデータと手動入力データの競合を防ぐ必要がある
- Next.js 16 App Routerのサーバーコンポーネント/クライアントコンポーネントの適切な分離

## Affected Files

### 変更対象ファイル

| ファイルパス | 変更種別 | 変更概要 |
|-------------|---------|---------|
| `supabase/migrations/XXX_add_manual_metrics.sql` | 新規作成 | scout_reply_count, interview_count カラム追加マイグレーション |
| `src/types/index.ts` | 修正 | DailyMetrics型にscout_reply_count, interview_count追加 |
| `src/app/api/metrics/manual-input/route.ts` | 新規作成 | 手動入力データ保存APIエンドポイント |
| `src/app/clinic/[slug]/guppy/page.tsx` | 修正 | 手動入力UI追加 |
| `src/app/clinic/[slug]/job-medley/page.tsx` | 修正 | 手動入力UI追加 |
| `src/app/clinic/[slug]/quacareer/page.tsx` | 修正 | 手動入力UI追加 |
| `src/components/ManualMetricsInput.tsx` | 新規作成 | 再利用可能な手動入力コンポーネント |

### 関連ファイル（参照のみ）

- `src/app/api/jobmedley/scout/route.ts` - 既存の手動入力APIパターン
- `src/app/clinic/[slug]/job-medley/page.tsx` - 既存のカレンダー入力UIパターン
- `supabase/schema.sql` - 現在のDBスキーマ

## Definition of Done

### 完了条件チェックリスト

- [ ] 全Acceptance Criteriaを満たしている
- [ ] マイグレーションスクリプトが正常に実行できる
- [ ] 3媒体すべてで手動入力UIが動作する
- [ ] APIエンドポイントがバリデーションとエラーハンドリングを実装している
- [ ] TypeScriptの型エラーがない
- [ ] ビルドが成功する (`npm run build`)
- [ ] 既存機能（スクレイピング、一覧表示）に影響がない
