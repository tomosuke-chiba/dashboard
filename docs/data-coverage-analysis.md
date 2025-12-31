# データ取得状況分析

## dashboard-strategy.md で定義した指標の取得状況

---

## ✅ 既に取得・保存できているデータ

### GUPPY

| 指標 | テーブル | カラム | 取得方法 |
|------|---------|--------|---------|
| 表示数 | `metrics` | `display_count` | スクレイピング |
| 閲覧数 | `metrics` | `view_count` | スクレイピング |
| 閲覧率 | - | 計算（閲覧数/表示数） | フロントエンド計算 |
| 自社サイト誘導数 | `metrics` | `redirect_count` | スクレイピング |
| 応募数 | `metrics` | `application_count` | スクレイピング |
| 応募率 | - | 計算（応募数/閲覧数） | フロントエンド計算 |
| スカウト送信数 | `scout_messages` | `sent_count` | 手入力 |
| スカウト返信数 | `scout_messages` | `reply_count` | 手入力 |
| Bitlyクリック数 | `bitly_clicks` | `click_count` | Bitly API |
| Bitlyクリック率 | - | 計算（クリック数/送信数） | フロントエンド計算 |
| 検索順位 | `metrics` | `search_rank` | スクレイピング |

### ジョブメドレー

| 指標 | テーブル | カラム | 取得方法 |
|------|---------|--------|---------|
| 採用決定数 | `jobmedley_analysis` | `hire_count` | API（月次） |
| 応募数（全応募） | `jobmedley_analysis` | `application_count` | API（月次） |
| スカウト経由応募数 | `jobmedley_analysis` | `scout_application_count` | API（月次） |
| 求人詳細ページ閲覧数 | `jobmedley_analysis` | `page_view_count` | API（月次） |
| スカウト送信数（日別） | `jobmedley_scouts` | `sent_count` | 手入力 |
| 検索順位 | `jobmedley_scouts` | `search_rank` | スクレイピング予定 |
| 求人ページ応募数 | - | 計算（全応募 - スカウト経由） | フロントエンド計算 |
| 求人ページ応募率 | - | 計算（求人ページ応募数/閲覧数） | フロントエンド計算 |
| 求人別サマリー | `jobmedley_job_offers` | 各種カラム | スクレイピング予定 |
| - 原稿更新からの日数 | `jobmedley_job_offers` | `days_since_update` | スクレイピング予定 |
| - 写真枚数 | `jobmedley_job_offers` | `photo_count` | スクレイピング予定 |
| - 特徴タグ | `jobmedley_job_offers` | `feature_tags` | スクレイピング予定 |

### Quacareer

| 指標 | テーブル | カラム | 取得方法 |
|------|---------|--------|---------|
| 累計応募者数 | `quacareer_dashboard` | `total_applicants` | スクレイピング |
| お気に入り（歯科衛生士） | `quacareer_dashboard` | `favorites_dh` | スクレイピング |
| お気に入り（歯科医師） | `quacareer_dashboard` | `favorites_dr` | スクレイピング |
| スカウトメール開封率 | `quacareer_dashboard` | `scout_mail_open_rate` | スクレイピング |
| スカウトプラス開封率 | `quacareer_dashboard` | `scout_plus_open_rate` | スクレイピング |
| スカウトメール一覧 | `quacareer_scout_mails` | 各種カラム | スクレイピング |
| - 配信日時 | `quacareer_scout_mails` | `delivery_date` | スクレイピング |
| - 対象職種 | `quacareer_scout_mails` | `target_job_type` | スクレイピング |
| - メッセージ | `quacareer_scout_mails` | `message` | スクレイピング |
| - 配信件数 | `quacareer_scout_mails` | `delivery_count` | スクレイピング |
| - 開封率 | `quacareer_scout_mails` | `open_rate` | スクレイピング |

---

## ❌ 未取得・未保存のデータ（strategy.mdで必要とされているもの）

### GUPPY

| 指標・データ | 必要性 | 保存先提案 | 取得方法提案 | 優先度 |
|------------|-------|-----------|------------|-------|
| **プロフィール情報** | 高（表示数に影響） | `clinics` テーブルに追加 | スクレイピング | **高** |
| - プロフィール充実度 | - | `guppy_profile_completeness` (%) | - | - |
| - 独立応援資金設定有無 | - | `guppy_independence_support` (boolean) | - | - |
| - プロフィール最終更新日 | - | `guppy_profile_updated_at` (timestamp) | - | - |
| **スカウトメール文面** | 高（改善に必須） | 新規テーブル `guppy_scout_templates` | 手入力 or スクレイピング | **高** |
| - 件名 | - | `subject` | - | - |
| - 本文 | - | `body` | - | - |
| - Bitlyリンク前の訴求文 | - | `link_cta_text` | - | - |
| - 使用期間 | - | `used_from`, `used_to` | - | - |
| - Bitlyクリック率 | - | 計算値 | - | - |
| **求人タイトル** | 中（閲覧率に影響） | `clinics` に追加 or 別テーブル | スクレイピング | 中 |
| **メイン写真URL** | 中（閲覧率に影響） | `clinics` に追加 or 別テーブル | スクレイピング | 中 |
| **求人原稿最終更新日** | 中（表示数に影響） | `clinics` に追加 | スクレイピング | 中 |
| **返信スピード** | 中（表示数に影響） | `clinics` に追加 | GUPPY管理画面から取得 | 低 |

### ジョブメドレー

| 指標・データ | 必要性 | 保存先提案 | 取得方法提案 | 優先度 |
|------------|-------|-----------|------------|-------|
| **スカウトメール文面** | 高（応募率に影響） | 新規テーブル `jobmedley_scout_templates` | 手入力 | **高** |
| - 1文目 | - | `first_sentence` | - | - |
| - 本文 | - | `body` | - | - |
| - 対象条件 | - | `target_criteria` | - | - |
| - 使用期間 | - | `used_from`, `used_to` | - | - |
| - スカウト応募率 | - | 計算値 | - | - |
| **「スピード返信」アイコン有無** | 高（検索順位に影響） | `jobmedley_job_offers` に追加 | スクレイピング | **高** |
| **「職員の声」登録有無** | 高（検索順位に影響） | `jobmedley_job_offers` に追加 | スクレイピング | **高** |
| **「職場の環境」登録有無** | 高（検索順位に影響） | `jobmedley_job_offers` に追加 | スクレイピング | **高** |
| **写真1枚目のURL・サイズ** | 中（応募率に影響） | `jobmedley_job_offers` に追加 | スクレイピング | 中 |
| **特徴タグの完全性チェック** | 高（検索順位に影響） | 計算値（設定済み/推奨タグ数） | スクレイピング＋ロジック | 中 |
| **求人タイトル** | 中（閲覧率に影響） | `jobmedley_job_offers` に追加 | スクレイピング | 中 |
| **給与情報の詳細度** | 中（検索順位に影響） | `jobmedley_job_offers` に追加 | スクレイピング | 低 |

### Quacareer

| 指標・データ | 必要性 | 保存先提案 | 取得方法提案 | 優先度 |
|------------|-------|-----------|------------|-------|
| **スカウトメール文面（詳細版）** | 高（開封率・応募率に影響） | `quacareer_scout_mails` を拡張 or 新規テーブル | 手入力 | **高** |
| - 件名 | - | `subject`（追加） | - | - |
| - 1文目 | - | `first_sentence`（追加） | - | - |
| - 送信時間帯 | - | `sent_time`（追加） | - | - |
| - スカウトプラス使用有無 | - | `is_scout_plus`（追加） | - | - |
| **応募転換数** | 高（KPI計算に必要） | `quacareer_scout_mails` に追加 | スクレイピング | **高** |
| - 開封後の応募数 | - | `application_count`（追加） | - | - |
| **求人プロフィール充実度** | 中（お気に入り登録に影響） | `clinics` に追加 | スクレイピング | 低 |

### 全媒体共通

| 指標・データ | 必要性 | 保存先提案 | 取得方法提案 | 優先度 |
|------------|-------|-----------|------------|-------|
| **目標採用人数（職種別）** | 高（進捗管理に必須） | 新規テーブル `recruitment_goals` | 手入力（管理画面） | **高** |
| - クリニックID | - | `clinic_id` | - | - |
| - 契約開始日 | - | `contract_start_date` | - | - |
| - 契約期間（月） | - | `contract_duration_months` | - | - |
| - 職種 | - | `job_type` | - | - |
| - 目標人数 | - | `target_count` | - | - |
| - 現在の採用人数 | - | `current_count` | - | - |
| **実際の採用決定日** | 中（進捗追跡） | 新規テーブル `hires` | 手入力（管理画面） | 中 |
| - 採用日 | - | `hire_date` | - | - |
| - 職種 | - | `job_type` | - | - |
| - 媒体 | - | `source` | - | - |
| - 経路（スカウト/閲覧） | - | `channel` | - | - |
| **施策実行履歴** | 中（効果検証） | 新規テーブル `action_logs` | 手入力（管理画面） | 低 |
| - 実行日 | - | `action_date` | - | - |
| - 媒体 | - | `source` | - | - |
| - 施策内容 | - | `action_type` | - | - |
| - 施策詳細 | - | `action_detail` | - | - |
| - 効果（メモ） | - | `result_memo` | - | - |

---

## 📊 優先度別実装推奨順序

### 第1優先（すぐに実装すべき）

1. **目標採用人数管理機能**
   - `recruitment_goals` テーブル作成
   - 管理画面での手入力UI
   - 進捗率の自動計算・表示

2. **スカウトメール文面管理（全媒体）**
   - `guppy_scout_templates` テーブル
   - `jobmedley_scout_templates` テーブル
   - `quacareer_scout_mails` の拡張（件名・1文目・送信時間帯・応募数追加）
   - ダッシュボードでの文面表示・編集UI

3. **GUPPYプロフィール情報取得**
   - `clinics` テーブルに以下を追加：
     - `guppy_profile_completeness`
     - `guppy_independence_support`
     - `guppy_profile_updated_at`
   - スクレイピングロジック追加

4. **ジョブメドレー重要指標取得**
   - `jobmedley_job_offers` に以下を追加：
     - `has_speed_reply_badge`
     - `has_staff_voice`
     - `has_workplace_info`
   - スクレイピングロジック追加

### 第2優先（機能拡張として有用）

5. **Quacareer応募転換数取得**
   - `quacareer_scout_mails` に `application_count` 追加
   - スクレイピングロジック追加

6. **求人タイトル・写真管理**
   - 各媒体の求人タイトル・メイン写真を保存
   - 変更履歴を追跡

7. **実際の採用決定管理**
   - `hires` テーブル作成
   - 手入力UI

### 第3優先（将来的に検討）

8. **施策実行履歴管理**
   - `action_logs` テーブル作成
   - 施策と効果の紐付け

9. **返信スピード・給与情報詳細度の取得**

---

## 提案：新規テーブル設計

### 1. `recruitment_goals`（目標採用人数）

```sql
CREATE TABLE recruitment_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_duration_months INTEGER DEFAULT 12,
  job_type TEXT NOT NULL,  -- 'dh', 'dr', 'da' など
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, job_type)
);
```

### 2. `guppy_scout_templates`（GUPPYスカウトメール文面）

```sql
CREATE TABLE guppy_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT,  -- 文面の識別名（例：「標準文面v1」）
  subject TEXT,
  body TEXT,
  link_cta_text TEXT,  -- Bitlyリンク前の訴求文
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `jobmedley_scout_templates`（ジョブメドレースカウト文面）

```sql
CREATE TABLE jobmedley_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  job_offer_id TEXT,  -- 求人ID（NULLは全求人共通）
  template_name TEXT,
  first_sentence TEXT,  -- 1文目（最重要）
  body TEXT,
  target_criteria TEXT,  -- 送信対象条件（例：「経験3年以上、通勤30分以内」）
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `hires`（実際の採用決定記録）

```sql
CREATE TABLE hires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  hire_date DATE NOT NULL,
  job_type TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'guppy', 'jobmedley', 'quacareer', 'other'
  channel TEXT,  -- 'scout', 'organic', 'referral' など
  name TEXT,  -- 採用者名（任意）
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `action_logs`（施策実行履歴）

```sql
CREATE TABLE action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  action_date DATE NOT NULL,
  source TEXT NOT NULL,  -- 'guppy', 'jobmedley', 'quacareer', 'all'
  action_type TEXT NOT NULL,  -- '原稿更新', '写真追加', 'スカウト文面変更' など
  action_detail TEXT,
  result_memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## まとめ

### 現在取得できているデータ
- 基本的な数値データ（表示数、閲覧数、応募数、スカウト送信数など）は概ね取得済み
- Quacareerのスカウトメール一覧（メッセージ含む）は既に取得済み

### 不足している重要データ
1. **スカウトメール文面**（GUPPY、ジョブメドレー）
2. **プロフィール情報**（GUPPY）
3. **検索順位改善に必要な指標**（ジョブメドレー：スピード返信、職員の声、職場環境）
4. **目標採用人数**（全媒体共通）
5. **応募転換数**（Quacareer）

### 推奨アクション
1. 第1優先の項目から順次実装
2. スカウトメール文面管理機能を早期に追加（改善施策の要）
3. 目標採用人数管理を最優先で実装（ダッシュボードの核心機能）
