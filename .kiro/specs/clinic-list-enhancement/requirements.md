# Requirements Document

## Introduction
クリニック一覧画面のKPI表示を拡張し、検索順位、PV、応募数、スカウト送信数、スカウト返信数、面接設定数、採用決定数の7項目を媒体横断で確認できるようにする。既存の検索・月選択フィルターを維持し、選択月の集計値を一覧で把握できることを目的とする。

## Requirements

### Requirement 1: KPI表示拡張
**Objective:** As a 採用担当者, I want クリニック一覧で7KPIを同時に確認できる, so that クリニック横断で採用状況を素早く把握できる

#### Acceptance Criteria
1. When クリニック一覧画面を表示する, the system shall 表示項目に検索順位（媒体別）、PV、応募数、スカウト送信数、スカウト返信数、面接設定数、採用決定数を含める
2. When 月フィルターが選択されている, the system shall 選択月の集計値を表示する
3. The system shall 既存の検索フィルターとレイアウトを維持したままKPIを追加表示する
4. The system shall 各KPIの単位を表示する（順位/件/通/人/回 など）

### Requirement 2: KPI集計ルール
**Objective:** As a システム開発者, I want KPIの集計定義を明確化する, so that 媒体横断で一貫した数値が表示される

#### Acceptance Criteria
1. When PVを集計する, the system shall GUPPY/Quacareerは`metrics.view_count`、JobMedleyは`jobmedley_scouts.page_view_count`を用いて月次合算する
2. When 応募数を集計する, the system shall GUPPY/Quacareerは`metrics.application_count`、JobMedleyは`jobmedley_scouts.application_count_total`を用いて月次合算する
3. When スカウト送信数を集計する, the system shall `scout_messages.sent_count`（GUPPY/Quacareer）と`jobmedley_scouts.sent_count`（JobMedley）を月次合算する
4. When スカウト返信数を集計する, the system shall `metrics.scout_reply_count`を媒体別に月次合算する
5. When 面接設定数を集計する, the system shall `metrics.interview_count`を媒体別に月次合算する
6. When 採用決定数を集計する, the system shall 媒体別に存在する採用決定数を合算し、現時点では`jobmedley_analysis.hire_count`（月次）を該当月の値として反映する
7. When 検索順位を表示する, the system shall 媒体ごとに選択月の最新日付の検索順位を採用して表示する
8. When 検索順位の媒体別データが存在しない, the system shall その媒体の検索順位を "-" と表示する

### Requirement 3: APIレスポンス拡張
**Objective:** As a フロントエンド開発者, I want 一覧APIに7KPIを含める, so that 一覧画面が追加のクエリ 없이表示できる

#### Acceptance Criteria
1. When `/api/admin/clinics` を呼び出す, the system shall 7KPIの集計値をレスポンスに含める
2. The system shall 既存レスポンスのフィールドを維持し、後方互換を保つ
3. The system shall クリニック単位で選択月の最新データ日付も返却する

### Requirement 4: 欠損データの表示
**Objective:** As a 採用担当者, I want 未入力やデータ欠損を区別して確認できる, so that 入力漏れや取得漏れに気づける

#### Acceptance Criteria
1. When 手動入力メトリクスがすべてNULLの月である, the system shall 「未入力」と表示する
2. When データが存在しないKPIがある, the system shall 0 または "-" をKPIの性質に応じて表示する
3. The system shall 「未入力」と「0件」を区別して表示する
4. The system shall 検索順位は媒体名を併記して表示する（例: GUPPY/JobMedley/Quacareer）

### Requirement 5: 後方互換性
**Objective:** As a システム管理者, I want 一覧画面の既存動作が壊れない, so that 既存運用を継続できる

#### Acceptance Criteria
1. When 追加KPIのデータが未取得でも, the system shall 一覧画面の表示を継続する
2. The system shall APIエラー時の既存エラーハンドリングを維持する
3. The system shall 既存の検索・月フィルターの挙動を変更しない

## 決定事項
- 検索順位は媒体別（GUPPY/JobMedley/Quacareer）で表示する
- 採用決定数は媒体別に存在する値を合算し、現時点ではJobMedley（`jobmedley_analysis.hire_count`）を反映する
- PV/応募数のJobMedley集計元は`jobmedley_scouts`に統一する
