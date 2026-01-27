# cc-sdd 進捗管理

## 概要

このプロジェクトでは、cc-sdd（仕様駆動開発）を導入し、実装前に要件・設計・タスクを明確化して手戻りを防止します。

---

## チャット表示テンプレ（毎回必須）
```
最終的な機能一覧（確定版）:
- ...

タスク全体像（現在フェーズの全タスク）:
- ...

今から取り組むタスク:
- ...

直近で完了したタスク:
- ...
```

## 引き継ぎメモ（ツール/チャット切替時）
```
[yyyy-mm-dd hh:mm] feature=...
phase=... / last_done=... / next=...
files=... / tests=...
```
[2026-01-19 10:47] feature=guppy-data-fix
phase=実装 / last_done=1.1 / next=1.2
files=src/app/api/clinics/source-validation.ts, src/app/api/clinics/query-builder.ts, src/app/api/clinics/[slug]/route.ts, src/app/api/clinics/__tests__/source-validation.test.ts, src/app/api/clinics/__tests__/query-builder.test.ts, .kiro/specs/guppy-data-fix/tasks.md / tests=jest --testPathPatterns=source-validation, jest --testPathPatterns=query-builder
[2026-01-19 11:42] feature=guppy-data-fix
phase=実装 / last_done=3.3 / next=-
files=src/app/api/clinics/[slug]/route.ts, src/app/clinic/[slug]/guppy/page.tsx, src/app/api/clinics/__tests__/route.test.ts, jest.setup.js, .kiro/specs/guppy-data-fix/tasks.md / tests=jest --testPathPatterns=route.test, jest --testPathPatterns=source-validation, jest --testPathPatterns=query-builder
[2026-01-19 13:24] feature=jobmedley-ui-fix
phase=実装 / last_done=4.3 / next=-
files=src/app/clinic/[slug]/job-medley/page.tsx, .kiro/specs/jobmedley-ui-fix/tasks.md / tests=manual URL checks
[2026-01-19 13:32] feature=metrics-manual-input
phase=実装 / last_done=1.1,2.1,2.2,3.1,4.1(未統合),6.1,6.2 / next=5.1-5.3,4.1補完(既存値反映),7.1
files=src/app/api/metrics/manual-input/route.ts, src/components/ManualMetricsInput.tsx, src/components/__tests__/ManualMetricsInput.test.tsx, src/app/api/metrics/manual-input/__tests__/route.test.ts, supabase/migrations/013_add_manual_metrics_columns.sql / tests=not run
[2026-01-19 13:32] feature=clinic-list-enhancement
phase=spec-init / last_done=spec-init / next=requirements
files=.kiro/specs/clinic-list-enhancement/spec.json, .kiro/specs/clinic-list-enhancement/requirements.md / tests=-
[2026-01-19 13:41] feature=clinic-list-enhancement
phase=spec-requirements / last_done=requirements / next=design
files=.kiro/specs/clinic-list-enhancement/requirements.md, .kiro/specs/clinic-list-enhancement/spec.json / tests=-
[2026-01-19 13:46] feature=clinic-list-enhancement
phase=spec-wireframe / last_done=wireframe / next=design
files=.kiro/specs/clinic-list-enhancement/wireframe.md / tests=-
[2026-01-19 14:12] feature=clinic-list-enhancement
phase=spec-requirements / last_done=decision-update / next=design
files=.kiro/specs/clinic-list-enhancement/requirements.md / tests=-
[2026-01-19 15:31] feature=clinic-list-enhancement
phase=spec-requirements / last_done=decision-update(検索順位=媒体別) / next=design
files=.kiro/specs/clinic-list-enhancement/requirements.md, .kiro/specs/clinic-list-enhancement/wireframe.md / tests=-
[2026-01-19 15:35] feature=clinic-list-enhancement
phase=spec-design / last_done=requirements-approved / next=design
files=.kiro/specs/clinic-list-enhancement/spec.json / tests=-
[2026-01-19 17:22] feature=clinic-list-enhancement
phase=spec-design / last_done=design-generated / next=design-approval
files=.kiro/specs/clinic-list-enhancement/design.md, .kiro/specs/clinic-list-enhancement/spec.json / tests=-
[2026-01-19 17:25] feature=clinic-list-enhancement
phase=spec-tasks / last_done=tasks-generated / next=tasks-approval
files=.kiro/specs/clinic-list-enhancement/tasks.md, .kiro/specs/clinic-list-enhancement/spec.json / tests=-
[2026-01-19 17:42] feature=clinic-list-enhancement
phase=implementation / last_done=1.1-1.2(partial),2.1-2.2(partial) / next=1.3,3.1,4.1-4.3
files=src/app/api/admin/clinics/route.ts, src/app/clinic/page.tsx / tests=not run
[2026-01-19 17:43] feature=clinic-list-enhancement
phase=implementation / last_done=1.1-1.3,2.1-2.2,3.1 / next=4.1-4.3
files=src/app/api/admin/clinics/route.ts, src/app/clinic/page.tsx, .kiro/specs/clinic-list-enhancement/tasks.md / tests=not run
[2026-01-19 18:04] feature=clinic-list-enhancement
phase=implementation / last_done=task-4.3-checklist-update / next=4.1-4.3
files=.kiro/specs/clinic-list-enhancement/tasks.md / tests=-
[2026-01-19 15:30] feature=guppy-data-fix
phase=completed / last_done=all-tasks / next=-
files=src/app/api/clinics/[slug]/route.ts, src/app/clinic/[slug]/guppy/page.tsx, src/app/api/clinics/source-validation.ts, src/app/api/clinics/query-builder.ts, .kiro/specs/guppy-data-fix/tasks.md, .kiro/specs/guppy-data-fix/spec.json, CLAUDE.md / tests=npm run build (success)
[2026-01-20 00:00] feature=clinic-list-enhancement
phase=completed / last_done=all-tasks(1.1-4.3) / next=-
files=src/app/api/admin/clinics/route.ts, src/app/clinic/page.tsx, src/app/api/admin/clinics/__tests__/route.test.ts, src/app/clinic/__tests__/page.test.tsx, .kiro/specs/clinic-list-enhancement/tasks.md, .kiro/specs/clinic-list-enhancement/spec.json, .kiro/specs/clinic-list-enhancement/completion-summary.md, CLAUDE.md / tests=npm test (22/22 passed), npm run build (success)
[2026-01-20 09:30] feature=ALL
phase=documentation-update / last_done=CLAUDE.md/cc-sdd-progress.md更新 / next=-
note=全6Spec完了を確認・反映（jobmedley-daily-data, guppy-data-fix, metrics-manual-input, jobmedley-ui-fix, clinic-list-enhancement, data-fetch-enhancement）
[2026-01-25 13:16] feature=ALL
phase=progress-update / last_done=プロジェクト状況確認 / next=検索順位問題の調査または次の機能開発
note=全プロジェクト状況を調査、まとめを作成。検索順位の表示/取得問題が未解決。

---

## cc-sddワークフロー

```
1. /kiro:steering          → プロジェクトの記憶を確立（初回のみ）
2. /kiro:spec-init <説明>  → 新機能のワークスペース作成
3. /kiro:spec-requirements → 要件定義（EARS形式）
4. /kiro:spec-design -y    → 設計書作成
5. /kiro:spec-tasks -y     → タスク計画作成
6. /kiro:spec-impl <番号>  → タスク実装
7. /kiro:validate-impl     → 実装検証
```

---

## 全体進捗

| Spec名 | ステータス | 完了日 | 備考 |
|--------|-----------|--------|------|
| jobmedley-daily-data | ✅ 完了 | 2026-01-01 | 日別データ取得機能 |
| guppy-data-fix | ✅ 完了 | 2026-01-19 | GUPPYデータ表示修正 |
| metrics-manual-input | ✅ 完了 | 2026-01-19 | 手動入力UI実装 |
| jobmedley-ui-fix | ✅ 完了 | 2026-01-20 | UI重複修正 |
| clinic-list-enhancement | ✅ 完了 | 2026-01-20 | 一覧画面KPI拡張 |
| data-fetch-enhancement | ✅ 完了 | 2026-01-20 | JobMedley日別データ取得有効化 |

**🎉 計画済みのすべてのSpec完了！**

---

## ステップ1: Steering（プロジェクト記憶の確立）

### 実行コマンド
```
/kiro:steering
```

### 生成されるファイル
- `.kiro/steering/product.md` - プロダクトの目的、価値、主要機能
- `.kiro/steering/tech.md` - 技術スタック、フレームワーク、設計方針
- `.kiro/steering/structure.md` - プロジェクト構成、命名規則

### ステータス
- [ ] コマンド実行
- [ ] 生成ファイルのレビュー
- [ ] 必要に応じて修正依頼

---

## ステップ2: Phase 1-A 職種別データ取得

### 概要
GUPPYスクレイパーに職種（Dr/DH/DA）切り替え機能を追加し、職種別にデータを取得・保存する。

### cc-sddフロー

#### 2.1 ワークスペース作成
```
/kiro:spec-init GUPPYの職種別データ取得機能を実装する
```
- [ ] 実行完了

#### 2.2 要件定義
```
/kiro:spec-requirements guppy-job-type-data
```
- [ ] 実行完了
- [ ] EARS形式で要件が明確化されているか確認
- [ ] 承認

#### 2.3 設計
```
/kiro:spec-design guppy-job-type-data -y
```
- [ ] 実行完了
- [ ] アーキテクチャ決定のレビュー
- [ ] 承認

#### 2.4 タスク計画
```
/kiro:spec-tasks guppy-job-type-data -y
```
- [ ] 実行完了
- [ ] タスク粒度の確認
- [ ] 承認

#### 2.5 実装
```
/kiro:spec-impl guppy-job-type-data 1 -y
/kiro:spec-impl guppy-job-type-data 2 -y
...
```
- [ ] 全タスク完了

#### 2.6 検証
```
/kiro:validate-impl guppy-job-type-data
```
- [ ] 検証完了

---

## ステップ3: Phase 1-B スカウトメール機能

### 概要
GUPPYのスカウトメール送信数・返信数を取得し、DBに保存・UIに表示する。

### cc-sddフロー

#### 3.1 ワークスペース作成
```
/kiro:spec-init GUPPYのスカウトメール送信数・返信数取得機能を実装する
```
- [ ] 実行完了

#### 3.2 要件定義
```
/kiro:spec-requirements guppy-scout-mail
```
- [ ] 実行完了
- [ ] 承認

#### 3.3 設計
```
/kiro:spec-design guppy-scout-mail -y
```
- [ ] 実行完了
- [ ] 承認

#### 3.4 タスク計画
```
/kiro:spec-tasks guppy-scout-mail -y
```
- [ ] 実行完了
- [ ] 承認

#### 3.5 実装
- [ ] 全タスク完了

#### 3.6 検証
- [ ] 検証完了

---

## ステップ4: Phase 1-C 閲覧率アラート

### 概要
閲覧率が30%を超えた場合にDiscord通知を送信する。

### cc-sddフロー
- [ ] spec-init
- [ ] spec-requirements
- [ ] spec-design
- [ ] spec-tasks
- [ ] spec-impl
- [ ] validate-impl

---

## ステップ5: Phase 1-D Bitly連携

### 概要
Bitly APIと連携し、クリニックごとのクリック数を自動取得する。

### cc-sddフロー
- [ ] spec-init
- [ ] spec-requirements
- [ ] spec-design
- [ ] spec-tasks
- [ ] spec-impl
- [ ] validate-impl

---

## ステップ6: Phase 1-E UI更新

### 概要
職種タブ、スカウトメールセクション、アラート表示をダッシュボードUIに追加する。

### cc-sddフロー
- [ ] spec-init
- [ ] spec-requirements
- [ ] spec-design
- [ ] spec-tasks
- [ ] spec-impl
- [ ] validate-impl

---

## コマンド早見表

| コマンド | 用途 |
|----------|------|
| `/kiro:steering` | プロジェクト記憶の確立（初回のみ） |
| `/kiro:spec-init <説明>` | 新機能のワークスペース作成 |
| `/kiro:spec-requirements <機能名>` | 要件定義の詳細化 |
| `/kiro:spec-design <機能名> -y` | 設計書の作成 |
| `/kiro:spec-tasks <機能名> -y` | タスク計画の作成 |
| `/kiro:spec-impl <機能名> <タスク番号> -y` | タスクの実装 |
| `/kiro:validate-impl <機能名>` | 実装の検証 |
| `/kiro:spec-status <機能名>` | 進捗確認 |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-12-30 | cc-sdd導入、進捗管理ファイル作成 |
