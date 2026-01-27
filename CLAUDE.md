# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

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

## 現在進行中: ダッシュボード改修プロジェクト (2026-01-18開始)

### 計画ファイル
`~/.claude/plans/smooth-weaving-blanket.md`

### 要件定義書（参照用）
ユーザーが提供した改修要件:
- ✅ GUPPY/ジョブメドレー/Quacareerの3媒体対応
- ✅ metricsテーブルに3カラム追加（scout_reply_count, interview_count, hire_count）
- ✅ 一覧画面: 7項目表示（検索順位、PV、応募数、スカウト送信数、スカウト返信数、面接設定数、採用決定数）
- ✅ 詳細画面: GUPPY（データ表示問題修正）、ジョブメドレー（UI重複修正）
- ✅ 手動入力機能: カレンダー形式の日別入力UI
- ✅ ジョブメドレー日別データ取得機能（求人別・スカウト・検索順位）

**🎉 すべての要件が完了しました！**

### Spec分割と進捗

| Spec名 | 優先度 | 状態 | 次のコマンド |
|--------|--------|------|--------------|
| `jobmedley-daily-data` | P0 | ✅ **完了** (2026-01-01) | - |
| `guppy-data-fix` | P0 | ✅ **完了** (2026-01-19) | - |
| `jobmedley-ui-fix` | P0 | ✅ **完了** (2026-01-20) | - |
| `metrics-manual-input` | P1 | ✅ **完了** (2026-01-19) | - |
| `clinic-list-enhancement` | P2 | ✅ **完了** (2026-01-20) | - |
| `data-fetch-enhancement` | P0 | ✅ **完了** (2026-01-20) | - |

**🎉 すべてのSpec完了！**

### 完了したSpec（実装順）

#### jobmedley-daily-data (2026-01-01完了)
- ジョブメドレーの日別データ取得機能
- API連携による自動データ取得（PV/応募数/スカウト経由応募数）
- 求人別データ管理（求人リスト・サマリー・検索順位）
- スカウト送信数のホバースクレイパー（累計→日別差分計算）
- 求人選択UI・日別テーブル・サマリーカード実装
- 全タスク完了、ビルド成功
- 詳細: `.kiro/specs/jobmedley-daily-data/tasks.md`

#### guppy-data-fix (2026-01-19完了)
- GUPPYページでのデータ表示問題を修正
- APIに`source`フィルタリング機能を追加（metrics、scout_messages、bitly_linksテーブル対応）
- GUPPYページから`source=guppy`パラメータを送信
- 後方互換性を維持（sourceパラメータなしでも動作）
- 全12タスク完了、ビルド成功
- 詳細: `.kiro/specs/guppy-data-fix/tasks.md`

#### metrics-manual-input (2026-01-19完了)
- カレンダー形式の日別手動入力UI実装
- GUPPY/JobMedley/Quacareer 3媒体に統合
- scout_reply_count, interview_count カラム追加
- 全28テスト合格、ビルド成功
- 詳細: `.kiro/specs/metrics-manual-input/tasks.md`

#### jobmedley-ui-fix (2026-01-20完了)
- ジョブメドレー詳細画面のUI重複問題を修正
- 重複セクションの描画整理（主要セクション1回のみ描画）
- ローディング/エラー表示の一貫化
- 既存機能の表示維持と回帰防止
- 全タスク完了、実装検証済み（GO判定）
- 詳細: `.kiro/specs/jobmedley-ui-fix/tasks.md`

#### clinic-list-enhancement (2026-01-20完了)
- クリニック一覧で7KPI同時表示（PV/応募数/スカウト送信数/返信数/面接数/採用数/検索順位）
- 媒体別検索順位表示（GUPPY/JobMedley/Quacareer）
- 未入力/欠損/0の明確な区別
- API集計の拡張（`/api/admin/clinics`）
- 全22テスト合格（API: 9テスト、UI: 13テスト）、ビルド成功
- 詳細: `.kiro/specs/clinic-list-enhancement/tasks.md`

#### data-fetch-enhancement (2026-01-20完了)
- JobMedley日別データ取得機能の有効化
- `/api/scrape` に `scrapeJobMedleyDailyBatch` 呼び出しを追加
- 日別メトリクス（PV/応募数/スカウト経由応募数）を `jobmedley_scouts` に保存
- 検索順位の日別取得・保存
- 全クリニック対応、ビルド成功
- 詳細: `.kiro/specs/data-fetch-enhancement/tasks.md`

### 次のステップ
**🎉 すべての計画済みSpecが完了しました！**

次の新規機能を開発する場合は、以下の流れで進めてください:
1. アイデア整理: Codex CLIで`Phase 0.5`を実行
2. 要件定義: Codex CLIで`Phase 1`を実行
3. 設計・実装: Claude Codeで`Phase 2-3`を実行

詳細は「Multi-CLI Workflow（コスト最適化）」セクションを参照してください。

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

---

## Multi-CLI Workflow（コスト最適化）

Claude Codeのリソースを最大化するため、要件定義はCodex CLIに委譲する。

### ワークフロー概要
```
Phase 0.5: Codex CLI → アイデア整理（機能名/概要/依存関係）
Phase 1: Codex CLI → requirements-draft.md, gap-analysis-draft.md
Phase 1.5: Codex CLI → ワイヤーフレーム作成・視覚レビュー（必要時のみHTML/CSSモック）
Phase 2: Claude Code → レビュー・確定 → requirements.md, gap-analysis.md
Phase 3: Claude Code → 設計・実装（通常Kiroフロー）
```

### Phase 0.5: アイデア整理（Codex CLI）

**Step 1: 入力準備**
- ざっくりアイデア（1-3文）
- 対象ユーザー / 現在の困りごと / 成功の兆し / 制約（分かる範囲）

**Step 2: Codexで機能名・概要・依存関係を整理**
```bash
codex "
ざっくりアイデア: {rough_idea}
追加情報: {users_or_constraints}

以下を参照して、機能名/概要/依存関係を整理してください:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/specs/（既存機能の一覧と内容）

出力要件:
1. 機能名候補を3つ提示（kebab-caseのスラッグも付与）
2. 推奨する機能名を1つ選び、1-2文の概要を書く
3. 依存関係・影響範囲を整理（既存Specとの関係: 関連/依存/衝突の可能性、影響しそうな機能領域/UI/データ）
4. 仮の前提/未確定事項/要確認事項を列挙
5. そのまま .kiro/specs/{feature}/idea-brief.md として保存できるMarkdownで出力
"
```

**Step 3: 保存**
- 推奨された機能名を `{feature}` に採用
- `mkdir -p .kiro/specs/{feature}`
- 出力を `.kiro/specs/{feature}/idea-brief.md` として保存

### Phase 1: 要件定義（Codex CLI）

**Step 1: 準備**
- 機能名 `{feature}` と概要 `{description}` を決める
- `idea-brief.md` がある場合は必ず参照する
- 既存のガイドは `.kiro/steering/` を参照

**Step 2: specディレクトリ作成**
```bash
mkdir -p .kiro/specs/{feature}
```

**Step 3: 要件ドラフト作成（Codex）**
```bash
codex "
機能名: {feature}
概要: {description}

以下を参照してEARS形式で詳細な要件を作成:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/settings/templates/specs/requirements-draft.md（テンプレート）
- .kiro/settings/templates/specs/gap-analysis-draft.md（テンプレート）
- .kiro/specs/{feature}/idea-brief.md（存在する場合）

出力:
- .kiro/specs/{feature}/requirements-draft.md
- .kiro/specs/{feature}/gap-analysis-draft.md

要件内に以下を必ず含める:
- 依存関係や影響範囲（既存機能/データ/UI）
- 依存関係が原因で起きうる制約や注意点
"
```

**Step 4: 出力確認**
```bash
ls -la .kiro/specs/{feature}
```
`requirements-draft.md` と `gap-analysis-draft.md` が作成されていることを確認する。

### Phase 1.5: ワイヤーフレーム確認（Codex CLI）

基本はワイヤーフレームで構造を確認し、判定が難しい場合のみHTML/CSSの最小モックを作成する。  
保存先は `.kiro/specs/{feature}/` 配下にまとめる。

**ファイル名ルール**
- `wireframe.md`（またはASCIIのみなら `wireframe.txt`）
- `ui-mock.html`（必要時のみ）

**Step 1: ワイヤーフレーム作成**
```bash
codex "
機能名: {feature}
対象: requirements-draft.md / gap-analysis-draft.md

要件から主要画面のワイヤーフレームを作成してください。
出力はテキスト/ASCIIで、情報設計・導線・要素の優先度が分かる形にする。
保存先: .kiro/specs/{feature}/wireframe.md
"
```

**Step 2: 目視レビュー（あなた）**
- 構造・導線・主要要素の抜け漏れがないか確認
- 迷う箇所があれば次のステップへ

**Step 3: 必要時のみHTML/CSSモック作成**
```bash
codex "
機能名: {feature}
対象: requirements-draft.md / gap-analysis-draft.md

ワイヤーフレームで判断が難しいため、1画面分の最小HTML/CSSモックを作成してください。
雰囲気が既存UIに近い程度でOK。完璧な再現は不要。
保存先: .kiro/specs/{feature}/ui-mock.html
"
```

### Phase 2: 擦り合わせ（Claude Code）

**Step 1: Claude Codeでレビュー依頼**
```bash
claude "
.kiro/specs/{feature}/requirements-draft.md と gap-analysis-draft.md をレビュー。
最新コードとの整合性を確認し、修正後 requirements.md / gap-analysis.md として確定。
"
```

**Step 2: 出力確認**
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/gap-analysis.md`

### Phase 3: 設計・実装（Claude Code）

**Step 1: 設計**
```bash
/kiro:spec-design {feature}
```

**Step 2: タスク生成**
```bash
/kiro:spec-tasks {feature}
```

**Step 3: 実装**
```bash
/kiro:spec-impl {feature}
```

### ツール優先順位
1. **Codex CLI**（メイン）

### モデル運用ルール（必須）
- Phase 0.5 / Phase 1 / Phase 1.5 は **必ず Codex CLI** を使う
- Claude Codeでの **擦り合わせ（Phase 2）と最終プラン策定** は **Opus** を使う
- Claude Codeでの **実装（Phase 3）** は **Sonnet** を使う
- もし上記のモデル指定で動いていない場合は、**「このモードで実行できていないので切り替えませんか？」** と必ず提案する

---

## ワークフロー仕様書（アイデア → 実装）

### 目的
- トークン使用量を最小化しつつ、要件品質と実装品質を最大化する
- ざっくりアイデアから、依存関係を考慮した要件定義と確実な実装につなげる

### 前提
- Phase 0.5/1/1.5 は Codex CLI を使用
- Phase 2 は Claude Code（Opus）を使用
- Phase 3 は Claude Code（Sonnet）を使用

### 成果物一覧
- `idea-brief.md`（アイデア整理）
- `requirements-draft.md`（要件ドラフト）
- `gap-analysis-draft.md`（ギャップ分析ドラフト）
- `wireframe.md` / `ui-mock.html`（視覚確認）
- `requirements.md` / `gap-analysis.md`（確定版）
- `design.md` / `tasks.md` / `spec.json`（設計〜タスク）

### 全体フロー（ステップバイステップ）

**Phase 0.5: アイデア整理（Codex CLI）**
1. ざっくりアイデア（1-3文）を用意
2. Codexに入力し、機能名/概要/依存関係を整理
3. 推奨された機能名を採用し `idea-brief.md` に保存

**Phase 1: 要件定義（Codex CLI）**
1. `.kiro/specs/{feature}` を作成
2. `idea-brief.md` を参照させて要件ドラフトを生成
3. `requirements-draft.md` / `gap-analysis-draft.md` を確認

**Phase 1.5: ワイヤーフレーム確認（Codex CLI）**
1. `wireframe.md` で情報設計・導線を確認
2. 判断が難しい場合のみ `ui-mock.html` を作成

**Phase 2: 擦り合わせ（Claude Code / Opus）**
1. ドラフトをレビューして確定版を作成
2. `requirements.md` / `gap-analysis.md` を保存

**Phase 3: 設計・実装（Claude Code / Sonnet）**
1. `/kiro:spec-design {feature}`
2. `/kiro:spec-tasks {feature}`
3. `/kiro:spec-impl {feature}`

---

## 具体例: metrics-manual-input

### Phase 0.5（Codex CLI）
```bash
codex "
ざっくりアイデア: 日別メトリクスをカレンダー形式で手動入力したい
追加情報: 対象ユーザーはCS。既存のmetrics集計と整合が必要。

以下を参照して、機能名/概要/依存関係を整理してください:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/specs/

出力要件:
1. 機能名候補を3つ提示（kebab-caseのスラッグも付与）
2. 推奨する機能名を1つ選び、1-2文の概要を書く
3. 依存関係・影響範囲を整理（既存Specとの関係: 関連/依存/衝突の可能性、影響しそうな機能領域/UI/データ）
4. 仮の前提/未確定事項/要確認事項を列挙
5. そのまま .kiro/specs/{feature}/idea-brief.md として保存できるMarkdownで出力
"
```

```bash
mkdir -p .kiro/specs/metrics-manual-input
# 出力を .kiro/specs/metrics-manual-input/idea-brief.md に保存
```

### Phase 1（Codex CLI）
```bash
codex "
機能名: metrics-manual-input
概要: カレンダー形式で日別メトリクスを手動入力できるUI

以下を参照してEARS形式で詳細な要件を作成:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/settings/templates/specs/requirements-draft.md
- .kiro/settings/templates/specs/gap-analysis-draft.md
- .kiro/specs/metrics-manual-input/idea-brief.md

出力:
- .kiro/specs/metrics-manual-input/requirements-draft.md
- .kiro/specs/metrics-manual-input/gap-analysis-draft.md

要件内に以下を必ず含める:
- 依存関係や影響範囲（既存機能/データ/UI）
- 依存関係が原因で起きうる制約や注意点
"
```

### Phase 1.5（Codex CLI）
```bash
codex "
機能名: metrics-manual-input
対象: requirements-draft.md / gap-analysis-draft.md

要件から主要画面のワイヤーフレームを作成してください。
出力はテキスト/ASCIIで、情報設計・導線・要素の優先度が分かる形にする。
保存先: .kiro/specs/metrics-manual-input/wireframe.md
"
```

### Phase 2（Claude Code / Opus）
```bash
claude "
.kiro/specs/metrics-manual-input/requirements-draft.md と gap-analysis-draft.md をレビュー。
最新コードとの整合性を確認し、修正後 requirements.md / gap-analysis.md として確定。
"
```

### Phase 3（Claude Code / Sonnet）
```bash
/kiro:spec-design metrics-manual-input
/kiro:spec-tasks metrics-manual-input
/kiro:spec-impl metrics-manual-input
```

---

## セッション引き継ぎメモ (2026-01-25更新)

### 前回のセッション完了内容
- **ドキュメント整理** 完了
  - すべての完了済みSpecをCLAUDE.mdに反映
  - 進捗状況を最新に更新
- **2026-01-25**: プロジェクト状況の全体確認・ドキュメント更新

### 完了済みSpec一覧（実装順）
1. **jobmedley-daily-data** (2026-01-01完了) - 日別データ取得機能
2. **guppy-data-fix** (2026-01-19完了) - GUPPYデータ表示修正
3. **metrics-manual-input** (2026-01-19完了) - 手動入力UI実装
4. **jobmedley-ui-fix** (2026-01-20完了) - UI重複修正
5. **clinic-list-enhancement** (2026-01-20完了) - 一覧画面KPI拡張
6. **data-fetch-enhancement** (2026-01-20完了) - JobMedley日別データ取得有効化

**🎉 計画済みのすべてのSpec完了！**

### 次のステップ
新規機能を開発する場合は、Multi-CLI Workflowに従って進めてください:
1. **Phase 0.5**: Codex CLIでアイデア整理
2. **Phase 1**: Codex CLIで要件定義
3. **Phase 2-3**: Claude Codeで設計・実装

### 重要な実装済みファイル

#### ジョブメドレー日別データ（jobmedley-daily-data）
- `supabase/migrations/` - jobmedley_scouts/job_offersテーブル追加
- `src/scrapers/jobmedley/` - スクレイパー実装（API・ホバー・検索順位）
- `src/app/api/jobmedley/route.ts` - 日別データAPI
- `src/app/api/jobmedley/job-offers/route.ts` - 求人リストAPI
- `src/app/clinic/[slug]/job-medley/page.tsx` - UI実装（求人選択・日別テーブル・サマリー）

#### GUPPY修正（guppy-data-fix）
- `src/app/api/clinics/[slug]/route.ts` - source フィルタリング対応
- `src/app/api/clinics/source-validation.ts` - source検証ユーティリティ

#### 手動入力機能（metrics-manual-input）
- `src/app/api/metrics/route.ts` - 手動入力API
- `src/components/ManualMetricsInput.tsx` - 共通入力コンポーネント
- `src/app/clinic/[slug]/guppy/page.tsx` - GUPPY統合
- `src/app/clinic/[slug]/job-medley/page.tsx` - JobMedley統合
- `src/app/clinic/[slug]/quacareer/page.tsx` - Quacareer統合

#### ジョブメドレーUI修正（jobmedley-ui-fix）
- `src/app/clinic/[slug]/job-medley/page.tsx` - UI重複修正・描画整理

#### 一覧画面KPI拡張（clinic-list-enhancement）
- `src/app/api/admin/clinics/route.ts` - API集計拡張
- `src/app/clinic/page.tsx` - 一覧UI拡張
- `src/app/api/admin/clinics/__tests__/route.test.ts` - APIテスト
- `src/app/clinic/__tests__/page.test.tsx` - UIテスト

---

## 未解決の課題・今後の開発メモ (2026-01-20追記)

### 検索順位関連
- **検索順位が表示されない問題**: UIで検索順位が正しく表示されていない可能性あり
- **検索順位の取得未実装**: GUPPY, JobMedley, Quacareerの検索順位取得が未実装または動作していない
  - 各媒体のスクレイピング/API連携で検索順位を取得する機能が必要

### 全体的な課題
- **まだ求めている完成形に達していない**: 実装は完了しているが、期待通りの動作・表示になっていない部分がある可能性
  - 具体的にどの部分が期待と異なるか、次回セッションで確認・整理が必要

### 次回開発時の確認事項
1. 検索順位の取得ロジックを確認（スクレイパー/API実装の有無）
2. 検索順位のUIへの表示フローを確認（API → フロントエンド）
3. 各媒体（GUPPY, JobMedley, Quacareer）での検索順位表示状況をテスト
4. ユーザーの「求めているもの」を具体的にヒアリングして要件を明確化
