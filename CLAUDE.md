# Recruit Dashboard Project

This file contains project-specific information.
For global workflow rules, see `~/.claude/CLAUDE.md`.

---

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

---

## Development Guidelines (Project-Specific)

- Think in English, generate responses in Japanese
- All Markdown content (requirements.md, design.md, tasks.md) in Japanese
- Follow cc-sdd workflow (see `~/.claude/CLAUDE.md`)

---

## 完了済みプロジェクト: ダッシュボード改修 (2026-01-18〜2026-01-20)

### 要件定義書（参照用）
- GUPPY/ジョブメドレー/Quacareerの3媒体対応
- metricsテーブルに3カラム追加（scout_reply_count, interview_count, hire_count）
- 一覧画面: 7項目表示（検索順位、PV、応募数、スカウト送信数、スカウト返信数、面接設定数、採用決定数）
- 詳細画面: GUPPY（データ表示問題修正）、ジョブメドレー（UI重複修正）
- 手動入力機能: カレンダー形式の日別入力UI
- ジョブメドレー日別データ取得機能（求人別・スカウト・検索順位）

### Spec完了一覧

| Spec名 | 完了日 | 概要 |
|--------|--------|------|
| `jobmedley-daily-data` | 2026-01-01 | 日別データ取得機能 |
| `guppy-data-fix` | 2026-01-19 | GUPPYデータ表示修正 |
| `metrics-manual-input` | 2026-01-19 | 手動入力UI実装 |
| `jobmedley-ui-fix` | 2026-01-20 | UI重複修正 |
| `clinic-list-enhancement` | 2026-01-20 | 一覧画面KPI拡張 |
| `data-fetch-enhancement` | 2026-01-20 | JobMedley日別データ取得有効化 |

---

## 重要な実装済みファイル

### ジョブメドレー日別データ（jobmedley-daily-data）
- `supabase/migrations/` - jobmedley_scouts/job_offersテーブル追加
- `src/scrapers/jobmedley/` - スクレイパー実装（API・ホバー・検索順位）
- `src/app/api/jobmedley/route.ts` - 日別データAPI
- `src/app/api/jobmedley/job-offers/route.ts` - 求人リストAPI
- `src/app/clinic/[slug]/job-medley/page.tsx` - UI実装

### GUPPY修正（guppy-data-fix）
- `src/app/api/clinics/[slug]/route.ts` - source フィルタリング対応
- `src/app/api/clinics/source-validation.ts` - source検証ユーティリティ

### 手動入力機能（metrics-manual-input）
- `src/app/api/metrics/route.ts` - 手動入力API
- `src/components/ManualMetricsInput.tsx` - 共通入力コンポーネント
- `src/app/clinic/[slug]/guppy/page.tsx` - GUPPY統合
- `src/app/clinic/[slug]/job-medley/page.tsx` - JobMedley統合
- `src/app/clinic/[slug]/quacareer/page.tsx` - Quacareer統合

### ジョブメドレーUI修正（jobmedley-ui-fix）
- `src/app/clinic/[slug]/job-medley/page.tsx` - UI重複修正・描画整理

### 一覧画面KPI拡張（clinic-list-enhancement）
- `src/app/api/admin/clinics/route.ts` - API集計拡張
- `src/app/clinic/page.tsx` - 一覧UI拡張
- `src/app/api/admin/clinics/__tests__/route.test.ts` - APIテスト
- `src/app/clinic/__tests__/page.test.tsx` - UIテスト

---

## 未解決の課題 (2026-01-20追記)

### 検索順位関連
- **検索順位が表示されない問題**: UIで検索順位が正しく表示されていない可能性あり
- **検索順位の取得未実装**: GUPPY, JobMedley, Quacareerの検索順位取得が未実装または動作していない

### 全体的な課題
- 実装は完了しているが、期待通りの動作・表示になっていない部分がある可能性
- 具体的にどの部分が期待と異なるか、次回セッションで確認・整理が必要

### 次回開発時の確認事項
1. 検索順位の取得ロジックを確認（スクレイパー/API実装の有無）
2. 検索順位のUIへの表示フローを確認（API → フロントエンド）
3. 各媒体での検索順位表示状況をテスト
4. ユーザーの「求めているもの」を具体的にヒアリング

---

## セッション引き継ぎメモ

### 最終更新: 2026-02-09

**完了内容**:
- グローバルワークフロー設定を `~/.claude/CLAUDE.md` に移行
- **Claude Code + Codex ハイブリッドワークフローに移行**（旧: Antigravity）
- 2層品質ゲートシステムを更新（Layer 2: 実行的品質ゲート）
- Phase 1.5（UI検証）をPhase 2（設計）に統合
- Phase 3（実装）をCodexに移行（旧: Claude Code/Sonnet）
- Phase 4（QA）をClaude Code Opus + MCP Browser Toolsに変更

**ワークフロー概要（新）**:
- Phase 0.5〜2: Claude Code (Opus) — 設計・要件・アーキテクチャ
- Phase 3: **Codex (GPT-5.3)** — 実装（走らせて放置）
- Phase 4: Claude Code (Opus) + MCP Browser — レビュー・動作確認
- Phase 5: **Codex** → Claude Code (Opus) — テスト実行→影響分析

**核心**: Opus で設計 → Codex で実装 → Opus でレビュー

**次のステップ**:
新規機能開発時は、グローバルワークフロー（`~/.claude/CLAUDE.md`）に従う

---

_Last Updated: 2026-02-09_
_For global workflow rules, see `~/.claude/CLAUDE.md`_
