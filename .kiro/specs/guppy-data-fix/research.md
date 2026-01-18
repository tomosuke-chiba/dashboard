# Research & Design Decisions: guppy-data-fix

## Summary
- **Feature**: `guppy-data-fix`
- **Discovery Scope**: Extension（既存APIへの機能追加）
- **Key Findings**:
  1. `/api/clinics/[slug]`が`source`カラムでフィルタリングしていないことが根本原因
  2. `admin/clinics`に正しい実装パターン（`.eq('source', 'guppy')`）が既存
  3. 型定義（`Source`型）は既に定義済み、スキーマ変更不要

## Research Log

### APIソースフィルタリングの実装パターン調査
- **Context**: GUPPYページでデータが表示されない問題の原因調査
- **Sources Consulted**:
  - `src/app/api/clinics/[slug]/route.ts`（問題のあるAPI）
  - `src/app/api/admin/clinics/route.ts`（正しい実装例）
  - `src/types/index.ts`（型定義）
- **Findings**:
  - `clinics/[slug]/route.ts`行43-61: `source`フィルタなし
  - `admin/clinics/route.ts`行47: `.eq('source', 'guppy')`実装済み
  - `Source`型: `'guppy' | 'jobmedley' | 'quacareer'`定義済み
- **Implications**: 既存パターンを踏襲してAPIを拡張するのみ

### 媒体別アーキテクチャ比較
- **Context**: 各媒体のデータ取得パターンの違いを理解
- **Sources Consulted**:
  - `/api/jobmedley/route.ts`（専用API）
  - `/api/quacareer/route.ts`（専用API）
  - `/api/clinics/[slug]/route.ts`（汎用API）
- **Findings**:
  | 媒体 | API | データソース | ソースフィルタ |
  |------|-----|-------------|---------------|
  | JobMedley | `/api/jobmedley` | 専用テーブル | 不要 |
  | Quacareer | `/api/quacareer` | 専用テーブル | 不要 |
  | GUPPY | `/api/clinics/[slug]` | 共有テーブル | **未実装** |
- **Implications**: GUPPYは汎用テーブルを使用するため、ソースフィルタが必須

### Supabaseクエリ構築パターン
- **Context**: フィルタ追加の実装方法確認
- **Sources Consulted**: 既存コード内のSupabaseクエリパターン
- **Findings**:
  ```typescript
  // 既存パターン（admin/clinics）
  const { data: guppyMetrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('clinic_id', clinic.id)
    .eq('source', 'guppy')  // ソースフィルタ
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`);
  ```
- **Implications**: チェーン可能なクエリビルダーパターンで簡潔に実装可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存API拡張 | `/api/clinics/[slug]`に`source`パラメータ追加 | 最小変更、後方互換性維持 | 汎用APIに媒体ロジック集中 | **推奨** |
| B: 専用API作成 | `/api/guppy/route.ts`新規作成 | アーキテクチャ一貫性 | 新規ファイル、重複コード | 将来検討 |
| C: ハイブリッド | Aで修正後、将来Bでリファクタ | 段階的改善 | 2段階作業 | オプション |

## Design Decisions

### Decision: 既存API拡張アプローチ（Option A）
- **Context**: GUPPYページのデータ表示問題を最小限の変更で解決する必要
- **Alternatives Considered**:
  1. Option A — 既存`/api/clinics/[slug]`に`source`パラメータ追加
  2. Option B — 新規`/api/guppy/route.ts`作成
- **Selected Approach**: Option A（既存API拡張）
- **Rationale**:
  - 既存パターン（`admin/clinics`）を踏襲
  - 後方互換性維持（`source`なしは従来動作）
  - 変更箇所が1ファイルに限定
- **Trade-offs**:
  - ✅ 最小変更、迅速な修正
  - ❌ 将来的にAPIが肥大化する可能性
- **Follow-up**: 実装後、他の媒体ページでも`source`パラメータを活用可能

### Decision: クエリパラメータによるソース指定
- **Context**: APIへのソース指定方法の選択
- **Alternatives Considered**:
  1. クエリパラメータ `?source=guppy`
  2. パスパラメータ `/api/clinics/[slug]/guppy`
  3. ヘッダー `X-Source: guppy`
- **Selected Approach**: クエリパラメータ `?source=guppy`
- **Rationale**:
  - 既存の`month`、`job_type`パラメータと一貫性
  - RESTful慣習に従う（フィルタリングはクエリパラメータ）
  - 実装が最も簡潔
- **Trade-offs**:
  - ✅ 既存パターンとの一貫性
  - ✅ 将来的に他のフィルタ追加が容易

## Risks & Mitigations
- **後方互換性**: `source`パラメータなしの場合は従来動作を維持 → 既存呼び出し元への影響なし
- **パフォーマンス**: `(clinic_id, source, date)`インデックス確認 → クエリ最適化
- **データ整合性**: `source`カラムに無効値が渡された場合のバリデーション追加

## References
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/select) — クエリビルダーAPI
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) — API実装パターン
