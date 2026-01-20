# Implementation Plan

## Task List

- [x] 1. API集計の拡張
- [x] 1.1 (P) `/api/admin/clinics` に媒体別検索順位を追加
  - GUPPY: `metrics.search_rank` の月内最新日を取得
  - JobMedley: `jobmedley_scouts.search_rank` の月内最新日を取得
  - Quacareer: `metrics.search_rank` の月内最新日を取得
  - `searchRanks: { guppy, jobmedley, quacareer }` をレスポンスに追加
  - 取得できない場合は `null` を返却
  - _Requirements: 1.1, 2.7, 2.8, 3.1_

- [x] 1.2 (P) 7KPI集計の追加
  - PV: `metrics.view_count` + `jobmedley_scouts.page_view_count` 合算
  - 応募数: `metrics.application_count` + `jobmedley_scouts.application_count_total` 合算
  - スカウト送信数: `scout_messages.sent_count` + `jobmedley_scouts.sent_count` 合算
  - スカウト返信数: `metrics.scout_reply_count` を月次合算
  - 面接設定数: `metrics.interview_count` を月次合算
  - 採用決定数: `jobmedley_analysis.hire_count` を月次反映
  - `missingManualMetrics` の判定（返信/面接が全件NULLなら true）
  - _Requirements: 1.1, 2.1-2.6, 4.1-4.3, 5.1_

- [x] 1.3 (P) APIレスポンスの後方互換維持
  - 既存フィールドは変更せず追加のみ
  - `latestDataDate` の計算に検索順位取得日も加味
  - _Requirements: 3.2, 3.3, 5.1-5.3_

- [x] 2. UI表示の拡張
- [x] 2.1 (P) クリニック一覧カードに媒体別検索順位を表示
  - 表示形式例: `G:3位 J:12位 Q:-`
  - `null` は `-`、値は `位` を付与
  - _Requirements: 1.1, 4.2, 4.4_

- [x] 2.2 (P) 7KPIの表示・欠損ルール適用
  - 未入力は「未入力」、欠損は「-」、0は「0」
  - 単位の表示（件/通/人/回 など）
  - _Requirements: 1.4, 4.1-4.3_

- [x] 3. 型定義とデータ整合
- [x] 3.1 (P) 一覧レスポンス用の型を更新/追加
  - `searchRanks`, `totalScoutSentCount`, `totalScoutReplyCount`, `totalInterviewCount`, `totalHireCount`, `missingManualMetrics` を型に追加
  - _Requirements: 3.1, 3.2_

- [x] 4. テストと検証
- [x] 4.1 (P) API集計の単体テスト
  - 検索順位の媒体別取得
  - 手動入力KPIの未入力判定
  - 9テスト合格（[route.test.ts](src/app/api/admin/clinics/__tests__/route.test.ts)）
  - _Requirements: 2.7, 4.1-4.4_

- [x] 4.2 (P) UI表示のスナップショット/レンダリング確認
  - `G: / J: / Q:` の表示と欠損表示
  - 13テスト合格（[page.test.tsx](src/app/clinic/__tests__/page.test.tsx)）
  - _Requirements: 1.1, 4.2_

- [x] 4.3 (P) 手動動作確認
  - `/clinic` で月選択と検索が維持されること
  - KPI表示が要件に沿うこと（検索順位=媒体別、未入力/欠損/0の区別）
  - `/clinic/{slug}/job-medley` でGUPPY相当の項目が確認できること
  - 手動テストチェックリスト作成済み（[manual-test-checklist.md](.kiro/specs/clinic-list-enhancement/manual-test-checklist.md)）
  - 実装レビュー完了（[implementation-review.md](.kiro/specs/clinic-list-enhancement/implementation-review.md)）
  - _Requirements: 1.2, 5.3_

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.1, 1.2, 2.1, 2.2 |
| 1.2 | 1.2, 4.3 |
| 1.3 | 1.3 |
| 1.4 | 2.2 |
| 2.1 | 1.2 |
| 2.2 | 1.2 |
| 2.3 | 1.2 |
| 2.4 | 1.2 |
| 2.5 | 1.2 |
| 2.6 | 1.2 |
| 2.7 | 1.1, 4.1 |
| 2.8 | 1.1 |
| 3.1 | 1.1, 1.2 |
| 3.2 | 1.3, 3.1 |
| 3.3 | 1.3 |
| 4.1 | 2.2 |
| 4.2 | 2.1, 2.2, 4.2 |
| 4.3 | 2.2 |
| 4.4 | 2.1 |
| 5.1 | 1.3 |
| 5.2 | 1.3 |
| 5.3 | 4.3 |

## Task Progression

1. API集計拡張（1.1-1.3）
2. UI拡張（2.1-2.2）
3. 型定義更新（3.1）
4. テスト/検証（4.1-4.3）
