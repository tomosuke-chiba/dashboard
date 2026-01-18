# Gap Analysis: guppy-data-fix

## 1. 現状調査 (Current State Investigation)

### 1.1 アーキテクチャパターンの比較

| 媒体 | 詳細ページ | API | データソース | ソースフィルタ |
|------|-----------|-----|-------------|---------------|
| **JobMedley** | `/clinic/[slug]/job-medley` | `/api/jobmedley` | `jobmedley_job_offers`, `jobmedley_scout_messages` | 不要（専用テーブル） |
| **Quacareer** | `/clinic/[slug]/quacareer` | `/api/quacareer` | `quacareer_dashboard`, `quacareer_scout_mails` | 不要（専用テーブル） |
| **GUPPY** | `/clinic/[slug]/guppy` | `/api/clinics/[slug]` | `metrics`, `scout_messages`, `bitly_clicks` | **なし（問題の根本原因）** |

### 1.2 データテーブル構造

```
metrics テーブル:
├── id, clinic_id, date
├── source: 'guppy' | 'jobmedley' | 'quacareer'  ← フィルタリングに使用可能
├── job_type: 'dr' | 'dh' | 'da' | null
├── display_count, view_count, redirect_count, application_count
└── search_rank

scout_messages テーブル:
├── id, clinic_id, date
├── source: 'guppy' | 'jobmedley' | 'quacareer'  ← フィルタリングに使用可能
├── sent_count, reply_count, open_count
└── created_at, updated_at

bitly_links テーブル:
├── id, clinic_id, bitlink, long_url
├── source: 'guppy' | 'quacareer'  ← フィルタリングに使用可能
└── link_id, label
```

### 1.3 問題の根本原因

**[clinics/[slug]/route.ts:43-61](src/app/api/clinics/[slug]/route.ts#L43-L61)** の実装:

```typescript
// 現在の実装（問題あり）
let metricsQuery = supabase
  .from('metrics')
  .select('*')
  .eq('clinic_id', clinic.id);

// job_type フィルタのみ実装
if (jobType) {
  metricsQuery = metricsQuery.eq('job_type', jobType);
} else {
  metricsQuery = metricsQuery.is('job_type', null);  // 合計行のみ
}

// ❌ source フィルタが存在しない！
```

**比較: admin/clinics/route.ts の正しい実装**:
```typescript
// 正しい実装例（行43-49）
const { data: guppyMetrics } = await supabase
  .from('metrics')
  .select('application_count, pv_count, display_count, redirect_count, date')
  .eq('clinic_id', clinic.id)
  .eq('source', 'guppy')  // ✅ ソースフィルタあり
  .gte('date', `${month}-01`)
  .lte('date', `${month}-31`);
```

### 1.4 型定義の確認

**[types/index.ts:5](src/types/index.ts#L5)**:
```typescript
export type Source = 'guppy' | 'jobmedley' | 'quacareer';
```

**[types/index.ts:28-41](src/types/index.ts#L28-L41)**:
```typescript
export interface DailyMetrics {
  source: Source;  // ✅ ソースフィールドは型定義に存在
  // ...
}
```

---

## 2. 要件実現可能性分析 (Requirements Feasibility Analysis)

### 2.1 要件と既存資産のマッピング

| 要件 | 既存資産 | ギャップ | 状態 |
|------|---------|---------|------|
| Req 1: APIソースフィルタ | `source`カラム存在 | フィルタロジック未実装 | **Missing** |
| Req 2: 日別データ表示 | `DailyMetrics`型、テーブルUI | APIからデータ取得できない | **Missing** |
| Req 3: サマリー集計 | `summary`オブジェクト | ソース別集計未実装 | **Missing** |
| Req 4: スカウトデータ | `scout_messages`テーブル | ソースフィルタ未実装 | **Missing** |
| Req 5: 利用可能月リスト | `availableMonths`ロジック | ソース別フィルタ未実装 | **Missing** |
| Req 6: エラーハンドリング | 基本実装あり | 追加変更不要 | **Existing** |

### 2.2 技術的制約

1. **後方互換性**: `/api/clinics/[slug]`は他のページ（トップページ等）からも使用されている可能性
2. **パフォーマンス**: ソースフィルタ追加によるクエリ影響は軽微（インデックスあれば）
3. **テスト**: 現在テストフレームワーク未導入

### 2.3 複雑度シグナル

- **CRUD操作**: シンプル（SELECTクエリにWHERE句追加）
- **外部連携**: なし
- **アルゴリズム**: なし
- **ワークフロー**: なし

---

## 3. 実装アプローチオプション

### Option A: 既存APIを拡張（推奨）

**変更対象**: `/api/clinics/[slug]/route.ts`

**実装内容**:
```typescript
// sourceパラメータを追加
const source = searchParams.get('source') as Source | null;

// metricsクエリにフィルタ追加
if (source) {
  metricsQuery = metricsQuery.eq('source', source);
}

// scout_messagesにも同様に追加
if (source) {
  scoutQuery = scoutQuery.eq('source', source);
}

// bitly_linksにも同様に追加
if (source) {
  bitlyLinksQuery = bitlyLinksQuery.eq('source', source);
}

// availableMonthsもソース別に
if (source) {
  allDatesQuery = allDatesQuery.eq('source', source);
}
```

**GUPPYページ側の変更**:
```typescript
// guppy/page.tsx
const res = await fetch(`/api/clinics/${slug}?source=guppy&month=${selectedMonth}`);
```

**トレードオフ**:
- ✅ 最小限の変更（1ファイル修正）
- ✅ 既存パターンを活用
- ✅ 後方互換性維持（sourceパラメータなしなら全ソース）
- ❌ 汎用APIに媒体固有のロジックが集中

### Option B: GUPPY専用APIを新規作成

**新規作成**: `/api/guppy/route.ts`

**実装内容**:
- JobMedley/Quacareerと同じパターンで専用API作成
- `/api/quacareer/route.ts`を参考に実装

**トレードオフ**:
- ✅ 媒体間のアーキテクチャ一貫性
- ✅ 責務の明確な分離
- ❌ 新規ファイル作成
- ❌ GUPPYページのAPI呼び出し変更必要
- ❌ 既存の`/api/clinics/[slug]`との重複

### Option C: ハイブリッドアプローチ

**Phase 1**: Option Aで迅速に修正
**Phase 2**: 将来的にOption Bでリファクタリング（オプション）

**トレードオフ**:
- ✅ 即座に問題解決
- ✅ 将来の拡張性を考慮
- ❌ 2段階の作業が必要

---

## 4. 実装複雑度とリスク評価

### 工数見積もり: **S（1-3日）**

**根拠**:
- 既存パターンあり（admin/clinicsの実装を参照可能）
- 変更箇所が明確（route.ts + page.tsx）
- 外部依存なし
- データベーススキーマ変更不要

### リスク評価: **Low**

**根拠**:
- 技術的に確立されたパターン（WHERE句追加）
- 影響範囲が限定的（GUPPYページのみ）
- ロールバック容易（パラメータなしで旧動作）

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ: **Option A（既存APIを拡張）**

**理由**:
1. 最小限の変更で問題解決可能
2. 後方互換性を維持しながら機能追加
3. 既存の`admin/clinics`に実績のあるパターン
4. 将来的にOption Bへの移行も阻害しない

### 設計フェーズで決定すべき事項

1. **APIパラメータ設計**
   - `source`パラメータの必須/任意
   - デフォルト動作（全ソース or エラー）

2. **クエリ最適化**
   - `metrics(clinic_id, source, date)`の複合インデックス確認
   - N+1クエリの回避（bitlyLinkClicksのループ）

3. **エラーハンドリング**
   - 無効なsource値の処理

### 調査継続事項

- [ ] **Research Needed**: metricsテーブルに`source='guppy'`のデータが存在するか確認
- [ ] **Research Needed**: インデックス`(clinic_id, source, date)`の存在確認

---

## 6. まとめ

| 項目 | 評価 |
|------|------|
| **工数** | S（1-3日） |
| **リスク** | Low |
| **推奨アプローチ** | Option A: 既存API拡張 |
| **主な変更ファイル** | `route.ts`, `guppy/page.tsx` |
| **ブロッカー** | なし |
