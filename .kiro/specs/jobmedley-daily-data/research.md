# Research & Design Decisions

## Summary
- **Feature**: jobmedley-daily-data
- **Discovery Scope**: Extension（既存システムへの機能拡張）
- **Key Findings**:
  - ジョブメドレーAPIから直接JSONで日別データ取得可能（ホバー方式より高速・安定）
  - 既存`jobmedley_scouts`テーブルを拡張し、新規`jobmedley_job_offers`テーブルを追加
  - Playwrightによるスクレイピング基盤は既存（ログイン機構を再利用）

## Research Log

### ジョブメドレーAPI調査
- **Context**: 日別データ取得方法の最適化調査
- **Sources Consulted**: ユーザー提供のAPI情報、既存スクレイパーコード分析
- **Findings**:
  - API: `GET /api/customers/statistics/total/?job_offer_id=&period_type=2&target_year=0`
  - Response構造:
    - `statistics.pv_data[]` - 日別閲覧数
    - `statistics.apply_data[]` - 日別応募数（全応募）
    - `statistics.apply_from_scout_data[]` - 日別スカウト経由応募数
    - `statistics.application_acceptance_data[]` - 日別採用決定数
  - 各配列は `{label: number, count: number}` 形式（labelは日付）
  - `period_type=2` で月間データ、`target_year=0` は現在月
- **Implications**: グラフホバー方式からAPI直接取得に移行可能、大幅な安定性・速度向上

### スカウト送信数グラフ調査
- **Context**: 日別送信数の自動計測方法
- **Sources Consulted**: ジョブメドレー管理画面HTML分析
- **Findings**:
  - スカウト送信数はRechartsグラフで表示（月間累計）
  - APIでの直接取得は未確認 → ホバーで累計値を取得し差分計算が必要
  - グラフセレクタ: `.recharts-area-dot`（ドット）、`.recharts-tooltip-wrapper`（ツールチップ）
- **Implications**: 送信数のみホバー方式を維持、累計→日別への差分計算ロジックが必要

### 既存アーキテクチャ分析
- **Context**: 拡張箇所と既存パターンの把握
- **Sources Consulted**: コードベース分析
- **Findings**:
  - スクレイパー: `src/lib/jobmedley-scraper.ts` - Playwrightベース
  - API: `src/app/api/jobmedley/route.ts` - Next.js API Route
  - UI: `src/app/clinic/[slug]/job-medley/page.tsx` - React Client Component
  - DB: Supabase（PostgreSQL）、既存テーブル `jobmedley_scouts`, `jobmedley_analysis`
- **Implications**: 既存パターンを踏襲し、拡張する形で実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存テーブル拡張 | `jobmedley_scouts`にカラム追加 | 既存データ維持、移行コスト低 | ユニーク制約変更が必要 | 採用 |
| 新規テーブル | `jobmedley_daily_metrics`新設 | クリーンな設計 | 既存コード変更大 | 見送り |

## Design Decisions

### Decision: データ取得方式のハイブリッド化
- **Context**: 日別データの安定的な取得
- **Alternatives Considered**:
  1. 全てホバー方式（現行）
  2. 全てAPI方式
  3. ハイブリッド（API + 一部ホバー）
- **Selected Approach**: ハイブリッド方式
  - API: 閲覧数、応募数、スカウト経由応募数
  - ホバー: スカウト送信数（累計→差分計算）
- **Rationale**: APIで取得可能なデータはAPI化し安定性向上、送信数のみホバー維持
- **Trade-offs**: ホバー部分は画面変更に脆弱だが、影響範囲を最小化
- **Follow-up**: 送信数のAPI取得可能性を継続調査

### Decision: DBスキーマ設計
- **Context**: 日別データ + 求人別データの永続化
- **Alternatives Considered**:
  1. `jobmedley_scouts`を拡張
  2. 新規テーブル`jobmedley_daily_metrics`を作成
- **Selected Approach**: `jobmedley_scouts`を拡張 + `jobmedley_job_offers`新規作成
- **Rationale**: 既存データを維持しつつ、求人マスタは別テーブルで管理
- **Trade-offs**: ユニーク制約の変更が必要（`clinic_id, date` → `clinic_id, date, job_offer_id`）
- **Follow-up**: マイグレーション時の既存データ移行確認

## Risks & Mitigations
- **ジョブメドレーUI変更リスク** — セレクタ変更監視、エラー時フォールバック実装
- **APIレート制限** — 適切な待機時間設定、エラーハンドリング
- **差分計算の精度** — 月初リセット検知、累計値の妥当性検証

## References
- 既存スクレイパー: `src/lib/jobmedley-scraper.ts`
- 既存DBスキーマ: `supabase/schema.sql`
- ジョブメドレーAPI: `/api/customers/statistics/total/`
