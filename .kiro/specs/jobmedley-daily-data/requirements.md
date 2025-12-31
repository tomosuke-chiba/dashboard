# Requirements Document

## Introduction
ジョブメドレーの分析ページから **API取得 + 一部スクレイピング** により日別データを取得し、**8項目×31行** の日別テーブルとして表示する機能の改修を行う。  
表示は「求人（職種）単位」で切り替え可能とし、求人別サマリー表示も合わせて提供する。

---

## Requirements

### Requirement 1: 日別データのAPI取得（閲覧数・応募系）
**Objective:** As a システム管理者, I want ジョブメドレーのAPIから日別データを自動取得したい, so that 安定的にデータを収集できる

#### Acceptance Criteria
1. When スクレイピングジョブが実行される, the JobMedleyスクレイパー shall ジョブメドレーAPIエンドポイント `/api/customers/statistics/total/` からJSONデータを取得する
2. The JobMedleyスクレイパー shall 以下の3項目を **日別** で取得する：  
   - `pv_data`（求人詳細ページ閲覧数）  
   - `apply_data`（応募数 ※スカウト経由を含む全応募）  
   - `apply_from_scout_data`（スカウト経由応募数）
3. When APIリクエストを送信する, the JobMedleyスクレイパー shall `period_type=2`（月間）パラメータを付与して月間データを取得する
4. The JobMedleyスクレイパー shall 取得した日別データを `jobmedley_daily_metrics` テーブルに保存する（※既存 `jobmedley_scouts` を使用する場合は同等の保存先に統一する）
5. If APIからのレスポンスが失敗した場合, the JobMedleyスクレイパー shall エラーをログに記録し、処理を継続する

---

### Requirement 2: 求人（職種）リストの取得
**Objective:** As a システム管理者, I want 登録されている求人一覧を自動取得したい, so that 求人別のデータを表示できる

#### Acceptance Criteria
1. When スクレイピングジョブが実行される, the JobMedleyスクレイパー shall 分析ページの検索欄サジェストから求人リストを取得する
2. The JobMedleyスクレイパー shall 各求人のID、名称を `jobmedley_job_offers` テーブルに保存する
3. When 新しい求人が検出された場合, the JobMedleyスクレイパー shall 自動的に求人リストに追加する
4. The スクレイピングジョブ shall 毎日自動でバックグラウンド実行される

---

### Requirement 3: 求人別サマリーデータの取得
**Objective:** As a システム管理者, I want 各求人の詳細サマリーを取得したい, so that 求人ごとのパフォーマンスを把握できる

#### Acceptance Criteria
1. When 求人が選択された状態でスクレイピングが実行される, the JobMedleyスクレイパー shall 以下の8項目を取得する：  
   - 採用決定数  
   - 応募数（全応募）  
   - スカウト経由応募数  
   - 求人詳細ページ閲覧数  
   - 直近の原稿更新からの経過日数  
   - 掲載中の写真の枚数  
   - チェック済みの特徴タグ  
   - スカウト送信数（サマリー上の数値）
2. The JobMedleyスクレイパー shall 取得したサマリーデータを `jobmedley_job_offers` テーブルに保存する
3. The サマリーデータ shall 求人IDに紐づけて管理される

---

### Requirement 4: スカウト送信数（日別）の自動計測（ホバー差分）
**Objective:** As a システム管理者, I want 分析ページのホバー値から日別送信数を自動算出したい, so that 手入力なしで送信数を管理できる

#### Acceptance Criteria
1. The JobMedleyスクレイパー shall ジョブメドレー管理画面（分析ページ）にて対象求人（職種）を選択した状態で、**スカウト送信数グラフ** のホバー表示値（**月間累計**）を取得する
2. The 基準時刻は **毎日23:00（JST）** とし、`cum_sent[d]` を「日付 d の23:00時点の月間累計スカウト送信数」と定義する
3. 日別送信数 `sent[d]` は差分で算出する：  
   - 通常：`sent[d] = cum_sent[d] - cum_sent[d-1]`  
   - 月初（1日）またはリセット検知（`cum_sent[d] < cum_sent[d-1]`）：`sent[d] = cum_sent[d]`
4. The JobMedleyスクレイパー shall `cum_sent` と `sent` の両方を日別で保存する（後から再計算できること）
5. The JobMedleyスクレイパー shall 送信数の取得は **職種ごと（求人ごと）** に行う（検索順位の対象職種と同一）

---

### Requirement 5: 求人掲載順位（検索順位）の取得
**Objective:** As a システム管理者, I want 指定URL上で医院名の表示順位を取得したい, so that 求人の露出状況を日別に可視化できる

#### Acceptance Criteria
1. The JobMedleyスクレイパー shall 職種ごとに設定された検索一覧URL（例：`https://job-medley.com/dds/designated_city15/`）を用いて検索順位を取得する
2. The 検索順位 shall 「URLを開いた直後のデフォルト表示（並び替え・絞り込み無し）」の一覧において、医院名（例：うえほんまち歯科）を上から探し **見つかった時点の通算順位（1始まり）** と定義する
3. If 対象医院名が複数件存在する場合, the スクレイパー shall **最上位（最初に見つかったもの）** を採用する
4. If 対象医院名が見つからない場合, the スクレイパー shall `rank = null` として保存し、UIでは「圏外」と表示できるようにする
5. If 職種URLが未設定の場合, the ダッシュボード shall 「職種URLを指定してください」と表示し、順位を計測しない

---

### Requirement 6: データベーススキーマの拡張
**Objective:** As a 開発者, I want 日別データと求人データを保存するスキーマを用意したい, so that データを永続化できる

#### Acceptance Criteria
1. 日別データ用テーブル（例：`jobmedley_daily_metrics`）は以下のカラムを持つ：  
   - `clinic_id`, `job_offer_id`, `date`  
   - `page_view_count`（pv）  
   - `application_count_total`（全応募）  
   - `scout_application_count`（スカウト経由応募）  
   - `application_count_job_page`（求人詳細ページ経由応募 = 全応募 - スカウト経由応募）  
   - `cum_scout_sent_count`（23:00時点 月間累計送信数）  
   - `scout_sent_count`（日別送信数 = 差分）  
   - `search_rank`（求人掲載順位）  
   - `scraped_at`, `created_at`, `updated_at`
2. `jobmedley_job_offers` テーブルは求人マスタとして維持し、`clinic_id` と `job_offer_id` の複合ユニーク制約を持つ
3. 既存 `jobmedley_scouts` を利用している場合、上記に相当するカラムへ拡張し、日別キー（date）と求人キー（job_offer_id）で一意に管理する

---

### Requirement 7: 日別テーブルUI（8項目×31行）
**Objective:** As a ユーザー, I want 日別データを見やすいテーブル形式で確認したい, so that 日ごとの推移を把握できる

#### Acceptance Criteria
1. The ジョブメドレーダッシュボード shall 31行（日付）×8項目のテーブルを表示する
2. The テーブル shall 以下の項目を持つ：  
   - 日付  
   - 送信数（自動計測：scout_sent_count）  
   - スカウト経由応募数（scout_application_count）  
   - スカウト応募率（自動計算：スカウト経由応募数 / 送信数）  
   - 求人掲載順位（search_rank）  
   - 求人詳細ページ閲覧数（page_view_count）  
   - 求人詳細ページ経由応募数（application_count_job_page = 全応募 - スカウト経由応募）  
   - 求人ページ経由応募率（自動計算：求人詳細ページ経由応募数 / 求人詳細ページ閲覧数）
3. The ダッシュボード shall ゼロ除算回避のため、分母が0の場合は `0` または `—` を表示できる
4. While データが存在しない日付の場合, the テーブル shall 該当セルを空欄または0で表示する

---

### Requirement 8: 求人切り替え機能
**Objective:** As a ユーザー, I want 求人を選択して表示データを切り替えたい, so that 求人別のパフォーマンスを確認できる

#### Acceptance Criteria
1. The ジョブメドレーダッシュボード shall 求人選択ドロップダウンを表示する
2. When ユーザーが求人を選択する, the ダッシュボード shall 選択した求人の日別テーブルとサマリーを表示する
3. The ダッシュボード shall デフォルトで「全求人合算」を表示する  
   - 合算は日別の同日をSUM（率は合算後に再計算）
4. When 求人が切り替えられた, the ダッシュボード shall APIから該当求人のデータを取得して表示を更新する

---

### Requirement 9: 求人別サマリーカード表示
**Objective:** As a ユーザー, I want 各求人のサマリー情報をカード形式で確認したい, so that 求人の状態を一目で把握できる

#### Acceptance Criteria
1. The ジョブメドレーダッシュボード shall 求人別サマリーカードセクションを表示する
2. The サマリーカード shall 以下の8項目を表示する：採用決定数、応募数、スカウト経由応募数、求人詳細ページ閲覧数、直近の原稿更新からの経過日数、掲載中の写真の枚数、チェック済みの特徴タグ、スカウト送信数
3. When 求人が選択される, the サマリーカード shall 選択した求人の情報を表示する
4. The サマリーカード shall ダーク/ライトモードに対応する

---

### Requirement 10: APIルートの拡張
**Objective:** As a 開発者, I want 日別データと求人データを取得するAPIを用意したい, so that フロントエンドからデータを取得できる

#### Acceptance Criteria
1. The `/api/jobmedley` エンドポイント shall 日別データを返却する（8項目に必要な生値 + 表示用に計算可能な値）
2. The `/api/jobmedley` エンドポイント shall `job_offer_id` パラメータで求人別フィルタリングをサポートする
3. The APIレスポンス shall 率計算（スカウト応募率、求人ページ経由応募率）をフロントエンドで計算可能な形式で返却する（分母0対策含む）
4. When `job_offer_id` が指定されない場合, the API shall 全求人合算のデータを返却する
