# Research & Design Decisions

## Summary
- **Feature**: `metrics-manual-input`
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - 既存の`jobmedley_scouts`テーブルとカレンダーUIパターンを再利用可能
  - `metrics`テーブルの複合ユニーク制約に注意が必要
  - 新規外部依存なし、既存技術スタックで実装可能

## Research Log

### 既存パターンの分析

**Context**: 手動入力UIとAPIの実装パターンを確認するため、既存のjobmedley_scoutsテーブルとその関連実装を調査

**Sources Consulted**:
- `src/app/clinic/[slug]/job-medley/page.tsx` - 既存カレンダーUI実装
- `src/app/api/jobmedley/scout/route.ts` - 既存API実装
- `supabase/schema.sql` - データベーススキーマ
- `src/types/index.ts` - 型定義

**Findings**:
- **カレンダーUI**: 7列グリッド（週表示）、日別number input、週末の色分け（日曜=赤、土曜=青）
- **保存フロー**: React state管理 → 月選択 → 日別入力 → 保存ボタン → API POST
- **API設計**: upsertパターン（`onConflict`）でデータ重複を防ぐ
- **バリデーション**: クライアント側で非負整数のみ許可、サーバー側でclinic存在確認
- **エラーハンドリング**: 成功/失敗メッセージをUI表示、ローディング状態管理

**Implications**:
- 既存UIコンポーネントを再利用可能な形で抽出すべき
- API設計は既存パターンに倣い、`/api/metrics/manual-input` エンドポイントを作成
- バリデーションロジックは既存と統一

### データベーススキーマの制約分析

**Context**: metricsテーブルへの新規カラム追加における影響範囲の調査

**Sources Consulted**:
- `supabase/schema.sql` - metricsテーブル定義
- `src/app/api/clinics/[slug]/route.ts` - 既存のメトリクス取得API

**Findings**:
- **複合ユニーク制約**: `UNIQUE(clinic_id, date, source, job_type)`
- **job_typeカラム**: NULLは「全職種合計」を意味する
- **既存カラム**: `search_rank`, `display_count`, `view_count`, `redirect_count`, `application_count`
- **スクレイピングとの関係**: 既存カラムはスクレイピングで自動取得、新規カラムは手動入力専用

**Implications**:
- 新規カラム（`scout_reply_count`, `interview_count`）はNULL許容にする必要がある（未入力と0を区別）
- マイグレーションでは既存データを保持しつつカラム追加
- job_typeの扱いは要件定義に従い、3媒体すべてで統一

### 技術スタック整合性確認

**Context**: 新規ライブラリ導入の必要性を確認

**Sources Consulted**:
- `.kiro/steering/tech.md` - プロジェクト技術スタック
- `src/app/clinic/[slug]/job-medley/page.tsx` - 既存実装

**Findings**:
- **必要な技術**: TypeScript, React 19, Next.js 16 App Router, Supabase
- **既存で利用可能**: すべて既にプロジェクトに含まれている
- **新規依存**: なし

**Implications**:
- 外部ライブラリ導入不要
- 既存のReact Hooks（`useState`, `useEffect`）とNext.js APIルートで実装可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 共通コンポーネント化 | `ManualMetricsInput.tsx`として再利用可能なカレンダーUIを作成 | 3媒体で統一されたUI、メンテナンス性向上 | 初期実装コストがやや増加 | 推奨。既存のjobmedley_scoutsパターンを参考に実装 |
| ページ個別実装 | 各媒体ページに個別にカレンダーUIを実装 | 実装が簡単 | コード重複、メンテナンス性低下 | 非推奨 |
| 専用APIエンドポイント | `/api/metrics/manual-input` を新規作成 | 責務分離、既存APIに影響なし | エンドポイント数増加 | 推奨。既存のscout APIパターンに倣う |

## Design Decisions

### Decision: `メトリクステーブルへのカラム追加`

- **Context**: スカウト返信数と面接設定数を記録する必要がある
- **Alternatives Considered**:
  1. 既存のmetricsテーブルにカラム追加 — scout_reply_count, interview_count
  2. 新規テーブル作成 — manual_metrics テーブルを別途作成
- **Selected Approach**: オプション1（metricsテーブルにカラム追加）
- **Rationale**:
  - 既存のメトリクスと同じ粒度（日別・媒体別・職種別）のデータである
  - クエリが簡潔になり、一覧画面での集計が容易
  - 複合ユニーク制約を活用してデータ整合性を保証
- **Trade-offs**:
  - **メリット**: データモデルがシンプル、既存のクエリパターンを再利用可能
  - **デメリット**: テーブルのカラム数が増加（許容範囲内）
- **Follow-up**: マイグレーション実行後、既存データに影響がないことを確認

### Decision: `NULL許容カラムとして実装`

- **Context**: 未入力と0件を区別する必要がある
- **Alternatives Considered**:
  1. NULL許容 — 未入力=NULL, 入力済み=0以上
  2. DEFAULT 0 — 未入力も0として扱う
- **Selected Approach**: オプション1（NULL許容）
- **Rationale**:
  - 「未入力（データがない）」と「0件（データがあるがゼロ）」は意味が異なる
  - 一覧画面で「未入力」を明示的に表示できる
  - 将来的なデータ分析で入力状況を追跡可能
- **Trade-offs**:
  - **メリット**: データの意味が明確、入力率の可視化が可能
  - **デメリット**: NULL処理が必要（TypeScriptでは`number | null`型）
- **Follow-up**: UIで未入力状態を適切に表現（例: 「—」または「未入力」）

### Decision: `共通コンポーネントの作成`

- **Context**: 3媒体すべてで同じカレンダーUIを使用する
- **Alternatives Considered**:
  1. 共通コンポーネント — `ManualMetricsInput.tsx`
  2. ページ個別実装 — 各ページにコピー&ペースト
- **Selected Approach**: オプション1（共通コンポーネント）
- **Rationale**:
  - DRY原則に従う
  - UI/UXの一貫性を保証
  - 将来的な修正が一箇所で済む
- **Trade-offs**:
  - **メリット**: メンテナンス性向上、コード重複なし
  - **デメリット**: props設計が必要、初期実装に時間がかかる
- **Follow-up**: propsインターフェースを型安全に設計

## Risks & Mitigations

- **リスク1: 既存スクレイピングデータとの競合** — 提案する緩和策: upsertパターンを使用し、`updated_at`タイムスタンプで最新データを保持
- **リスク2: job_typeの扱いの混乱** — 提案する緩和策: UIで「全職種合計」を明示、APIでjob_type=nullとして統一
- **リスク3: 未来日入力の防止** — 提案する緩和策: サーバー側バリデーションで未来日を拒否

## References
- [Next.js App Router Documentation](https://nextjs.org/docs/app) — App Routerの公式ガイド
- [Supabase Upsert](https://supabase.com/docs/reference/javascript/upsert) — upsertパターンの実装方法
- [PostgreSQL UNIQUE Constraint](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS) — 複合ユニーク制約の仕様
