# 要件定義書

## プロジェクト概要

**プロジェクト名**: 求人媒体ダッシュボード
**クライアント**: 株式会社KOU
**作成日**: 2024年12月29日
**最終更新日**: 2026年1月1日

---

## 1. 事業背景

### 1.1 株式会社KOUについて

| 項目 | 内容 |
|------|------|
| 会社名 | 株式会社KOU |
| 代表 | 千葉共将 |
| 事業内容 | 歯科医院向け採用支援サービス |
| サービス名 | SNS × 求人媒体 ハイブリッド採用支援サービス |

### 1.2 事業KPI

**最重要指標: 採用性効率（コスト対効果）**

### 1.3 ダッシュボード閲覧者

- ~~貴社担当者のみ~~ → **御社担当者 + クライアント（歯科医院）の両方**
- 詳細は [12.2 利用者とアクセス権限](#122-利用者とアクセス権限更新) を参照

---

## 2. 対象媒体と課金体系

### 2.1 媒体一覧

| 媒体 | 課金体系 | 採用決定の流れ |
|------|----------|----------------|
| **GUPPY** | 閲覧課金（100円/閲覧）+ スカウトメール（1,000円/通） | 表示→閲覧→申込 or スカウト→返信→採用 |
| **ジョブメドレー** | 閲覧無料 + スカウト月100通無料 | 検索順位上位化→閲覧→申込 |
| **クオキャリア** | プロフィール変更不可 | スカウトメール最適化が重要 |

### 2.2 職種

**対象職種（全9職種）:**
1. Dr（歯科医師）
2. DH（歯科衛生士）
3. DA（歯科助手）
4. 受付
5. 歯科技工士
6. 管理栄養士
7. 保育士
8. 幼稚園教諭
9. 医療事務

**開発優先度:**
- **Phase 1**: Dr / DH / DA（主要3職種）
- **Phase 2**: 残り6職種

### 2.3 データ管理の粒度

**3軸管理: クリニック × 媒体 × 職種**

**閲覧したいデータ階層:**
1. **個別詳細:** 各クリニック × 各媒体 × 各職種
2. **媒体合計:** 各クリニック × 各媒体
3. **全体集計:** 全クリニック × 各職種 の総合計

→ **ドリルダウン可能な構造**が必要

---

## 3. 開発フェーズ

### Phase 1: GUPPY追加機能（最優先）

| 機能 | 詳細 | ステータス |
|------|------|------------|
| 職種別データ取得 | Dr / DH / DA のタブ/フィルター切り替えで取得 | ✅実装済み |
| スカウトメール送信数 | `/service/message_thread?filter_tab=scout_no_reply` から取得 | ✅実装済み |
| スカウトメール返信数 | 差分計算（全スカウト - 未返信 = 返信あり） | ✅実装済み |
| 閲覧率30%超アラート | Discord通知で警告 | ✅実装済み |
| Bitly連携 | API連携でクリック数自動取得 | ✅実装済み |

### Phase 2: ジョブメドレー対応

| 機能 | 詳細 | ステータス |
|------|------|------------|
| 検索順位取得 | 検索順位の上位化が最重要 | ✅実装済み（検索URL設定時） |
| スカウトメール効果指標 | 月100通無料スカウトの効果計測 | 一部実装（送信数・スカウト経由応募数） |
| 職種別データ | クリニックごとに異なる職種を出稿 | 未実装 |

### Phase 3: クオキャリア対応

| 機能 | 詳細 | ステータス |
|------|------|------------|
| スカウトメール開封率 | プラットフォームから取得可能 | ✅実装済み（開封率のみ） |
| スカウトメール返信率 | どのスカウト文面が効果的か最適化 | 未実装 |

---

## 4. 機能要件（詳細）

### 4.1 GUPPY

#### 4.1.1 閲覧データ（実装済み → 職種別に拡張必要）

| 項目 | ソース | 更新頻度 | 職種別 |
|------|--------|----------|--------|
| 表示数 | `/service/access_logs/YYYY-MM` | 6時間ごと（1日4回） | 要対応 |
| 閲覧数 | 同上 | 6時間ごと | 要対応 |
| 自社サイト誘導数 | 同上 | 6時間ごと | 要対応 |
| 応募数 | 同上 | 6時間ごと | 要対応 |

**計算項目:**
- 閲覧率 = 閲覧数 / 表示数
- **アラート条件: 閲覧率 > 30% で不正アクセス疑い → Discord通知**

#### 4.1.2 スカウトメール（新規実装）

| 項目 | ソース | 備考 |
|------|--------|------|
| 送信数 | `/service/message_thread?filter_tab=scout_no_reply` | 「もっと見る」で全データ取得、日時から集計 |
| 返信数 | `/service/message_thread` | 返信ありのスレッド数 |
| 既読数 | - | **不要**（取得コスト高） |

**計算項目:**
- 返信率 = 返信数 / 送信数

#### 4.1.3 Bitly連携（新規実装）

| 項目 | 詳細 |
|------|------|
| プラン | 有料プラン利用中 → API連携可能 |
| URL管理 | クリニックごとに1つの短縮URLを使い回し |
| 現状管理 | Bitly管理画面で個別確認中 |
| 対応方針 | クリニックごとのBitly URLをDB登録し、API経由でクリック数取得 |

### 4.2 ジョブメドレー

| 項目 | 重要度 | 備考 |
|------|--------|------|
| 検索順位 | **最重要** | 閲覧無料のため、順位上位化が命題 |
| スカウトメール返信率 | 重要 | 月100通無料、競合優位性は低い |

**現状取得できている指標:**
- 分析: 採用決定数 / 応募数 / スカウト経由応募数 / 求人詳細ページ閲覧数
- スカウト送信数（ダッシュボードで日別手入力に切り替え予定）
- 検索順位（`jobmedley_search_url` 設定時）

**取得方針:**
- 分析データは `https://customers.job-medley.com/customers/analysis` の期間選択で該当月を指定して取得
- スカウト送信数はダッシュボードから日付ごとに手入力

### 4.3 クオキャリア

| 項目 | 重要度 | 備考 |
|------|--------|------|
| スカウトメール開封率 | 重要 | プラットフォームから取得可能 |
| スカウトメール返信率 | 重要 | どの文面が効果的か最適化 |
| プロフィール変更 | - | **不可**（唯一変更できない媒体） |

**現状取得できている指標:**
- ダッシュボードサマリー（累計応募者数 / お気に入り登録者数 / 開封率）
- スカウトメール一覧（配信日時 / 対象職種 / 文面 / 配信件数 / 開封率）

---

## 5. アラート・通知機能

### 5.1 通知一覧

| トリガー | 通知先 | 内容 | ステータス |
|----------|--------|------|------------|
| 新規応募 | Discord | クライアント名 + 「新規応募あり」 | 実装済み |
| 閲覧率30%超 | Discord | クライアント名 + 「不正アクセス疑い」警告 | **未実装** |

---

## 6. データ更新頻度

| 項目 | 頻度 |
|------|------|
| 閲覧データ（表示数・閲覧数など） | **1日4回**（6時間ごと） |
| 検索順位 | 1日1回 |

---

## 7. データベース設計（更新版）

### 7.1 テーブル構成

#### clinics（クライアント情報）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| name | TEXT | クライアント名（歯科医院名） |
| slug | TEXT | URL用スラッグ（ユニーク） |
| guppy_login_id | TEXT | GUPPYログインID |
| guppy_password | TEXT | GUPPYパスワード |
| guppy_clinic_name | TEXT | GUPPY上の医院名（検索順位マッチング用） |
| guppy_search_url | TEXT | 検索順位チェック用の地区URL |
| jobmedley_login_id | TEXT | ジョブメドレーログインID |
| jobmedley_password | TEXT | ジョブメドレーパスワード |
| jobmedley_clinic_name | TEXT | ジョブメドレー上の医院名（検索順位マッチング用） |
| jobmedley_search_url | TEXT | ジョブメドレー検索順位チェック用の検索URL |
| quacareer_login_id | TEXT | クオキャリアログインID |
| quacareer_password | TEXT | クオキャリアパスワード |
| **bitly_url** | TEXT | **Bitly短縮URL（新規追加）** |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### metrics（メトリクスデータ）- 更新版

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| clinic_id | UUID | クライアントID（外部キー） |
| date | DATE | 記録日 |
| source | TEXT | 媒体（'guppy', 'jobmedley', 'quacareer'） |
| **job_type** | TEXT | **職種（'dr', 'dh', 'da' など）（新規追加）** |
| search_rank | INTEGER | 検索順位 |
| display_count | INTEGER | 表示数 |
| view_count | INTEGER | 閲覧数 |
| redirect_count | INTEGER | 自社サイト誘導数 |
| application_count | INTEGER | 応募数 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**ユニーク制約: clinic_id + date + source + job_type**

#### scout_messages（スカウトメールデータ）- 新規テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| clinic_id | UUID | クライアントID（外部キー） |
| date | DATE | 記録日 |
| source | TEXT | 媒体（'guppy', 'jobmedley', 'quacareer'） |
| sent_count | INTEGER | 送信数 |
| reply_count | INTEGER | 返信数 |
| open_count | INTEGER | 開封数（クオキャリアのみ） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**ユニーク制約: clinic_id + date + source**

#### bitly_clicks（Bitlyクリックデータ）- 新規テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| clinic_id | UUID | クライアントID（外部キー） |
| date | DATE | 記録日 |
| click_count | INTEGER | クリック数 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

**ユニーク制約: clinic_id + date**

#### jobmedley_analysis（ジョブメドレー月次分析）

| カラム | 型 | 説明 |
|--------|-----|------|
| clinic_id | UUID | クライアントID |
| period_year | INTEGER | 対象年 |
| period_month | INTEGER | 対象月 |
| hire_count | INTEGER | 採用決定数 |
| application_count | INTEGER | 応募数 |
| scout_application_count | INTEGER | スカウト経由応募数 |
| page_view_count | INTEGER | 求人詳細ページ閲覧数 |
| scraped_at | TIMESTAMP | 取得日時 |

**ユニーク制約: clinic_id + period_year + period_month**

#### jobmedley_scouts（ジョブメドレースカウト送信数）

| カラム | 型 | 説明 |
|--------|-----|------|
| clinic_id | UUID | クライアントID |
| date | DATE | 取得日 |
| sent_count | INTEGER | 送信数（手入力） |
| scraped_at | TIMESTAMP | 更新日時 |

**ユニーク制約: clinic_id + date**

#### quacareer_dashboard（クオキャリアダッシュボード）

| カラム | 型 | 説明 |
|--------|-----|------|
| clinic_id | UUID | クライアントID |
| date | DATE | 取得日 |
| total_applicants | INTEGER | 累計応募者数 |
| favorites_dh | INTEGER | お気に入り登録者数（歯科衛生士） |
| favorites_dr | INTEGER | お気に入り登録者数（歯科医師） |
| scout_mail_open_rate | DOUBLE PRECISION | スカウトメール平均開封率 |
| scout_plus_open_rate | DOUBLE PRECISION | スカウトプラス平均開封率 |
| scraped_at | TIMESTAMP | 取得日時 |

**ユニーク制約: clinic_id + date**

#### quacareer_scout_mails（クオキャリアスカウト一覧）

| カラム | 型 | 説明 |
|--------|-----|------|
| clinic_id | UUID | クライアントID |
| scraped_date | DATE | 取得日 |
| delivery_date | TEXT | 配信日時 |
| target_job_type | TEXT | 対象職種 |
| message | TEXT | メッセージ |
| delivery_count | INTEGER | 配信件数 |
| open_rate | DOUBLE PRECISION | 開封率 |
| scraped_at | TIMESTAMP | 取得日時 |

---

## 8. 現状の実装状況

### 8.1 実装済み

- [x] GUPPYからのデータ取得（表示数・閲覧数・誘導数・応募数）
- [x] クライアント別ダッシュボード（`/clinic/[slug]/guppy`）
- [x] 社内管理ページ（`/admin`、パスワード認証）
- [x] Discord通知（新規応募時）
- [x] 履歴データ保存・月別表示
- [x] 17クリニック登録済み
- [x] ジョブメドレー スクレイパー/ダッシュボード（分析・検索順位）
- [x] クオキャリア スクレイパー/ダッシュボード（サマリー・スカウト一覧）
- [x] ジョブメドレー/クオキャリアのデータをDB保存してUIに反映

### 8.2 Phase 1 実装済み

- [x] 職種別データ取得（Dr / DH / DA）
- [x] スカウトメール送信数・返信数
- [x] 閲覧率30%超アラート（Discord通知）
- [x] Bitly API連携
- [ ] 更新頻度を1日4回に変更（Vercel Cron設定）

### 8.3 未実装（Phase 2以降）

- [ ] ジョブメドレー職種別データ対応
- [ ] ジョブメドレーのスカウト送信数（ダッシュボード日別手入力UI）
- [ ] ジョブメドレーのスカウト返信数取得
- [ ] クオキャリアの開封数/返信数取得・DB保存
- [ ] 残り6職種の対応
- [ ] 全クリニック×全職種の集計ダッシュボード

---

## 9. 画面構成

```
/                           → トップページ（リダイレクト）
/admin                      → 社内管理ページ（パスワード認証）
/clinic                     → クライアント一覧
/clinic/[slug]              → クライアント別サマリー
/clinic/[slug]/guppy        → GUPPYダッシュボード（職種別タブ追加予定）
/clinic/[slug]/job-medley   → ジョブメドレーダッシュボード（実装済み）
/clinic/[slug]/quacareer    → クオキャリアダッシュボード（実装済み）
/api/scrape                 → スクレイピング実行API
/api/clinics                → クライアント一覧API
/api/clinics/[slug]         → クライアント詳細API
```

---

## 10. 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 16 + React 19 + Tailwind CSS |
| バックエンド | Next.js API Routes |
| スクレイピング | Playwright |
| データベース | Supabase (PostgreSQL) |
| 定期実行 | Vercel Cron（6時間ごと = 1日4回） |
| ホスティング | Vercel |
| 通知 | Discord Webhook |
| URL短縮 | Bitly API |

---

## 11. 環境変数

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DISCORD_WEBHOOK_URL
ADMIN_PASSWORD
CRON_SECRET
NEXT_PUBLIC_BASE_URL
BITLY_ACCESS_TOKEN          # 新規追加
```

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-29 | 初版作成 |
| 2024-12-29 | GUPPY取得項目を8項目に確定 |
| 2025-12-30 | 大幅更新: 職種別対応、スカウトメール機能、Bitly連携、閲覧率アラート、3媒体の詳細要件追加 |
| 2025-12-31 | ジョブメドレー/クオキャリアの実装状況と設定項目を更新 |
| 2025-12-31 | ジョブメドレーのスカウト送信数を日別手入力に変更 |
| 2026-01-01 | 採用成功率100%達成のための戦略・KPI・認証機能・目標管理機能を追加 |

---

## 12. 採用成功率100%達成のための追加要件（2026-01-01追加）

### 12.1 プロジェクトゴールの再定義

**採用成功の定義**：
> クリニック別の目標採用人数を、契約から12ヶ月以内に全員採用すること

**ダッシュボードのゴール**：
> 各媒体での重要な指標を把握し、どのような問題が起きているかを一目で確認でき、その問題を改善するための施策が明確にわかるダッシュボードを提供する

### 12.2 利用者とアクセス権限（更新）

**利用者の変更**：
- ~~貴社担当者のみ~~ → **御社担当者 + クライアント（歯科医院）の両方**

| ロール | 説明 | 想定人数 |
|--------|------|---------|
| 管理者（御社担当者） | 全クリニックのデータを閲覧・編集可能 | 数名 |
| クライアント（歯科医院） | 自院のデータのみ閲覧可能 | 10-50件 |

**認証方式**：シンプル方式
- クリニックごとに1つのパスワードを設定
- パスワードを知っている人は該当クリニックのデータにアクセス可能
- 管理者は別の管理者パスワードで全クリニックにアクセス可能

**アクセス権限マトリクス**：

| 機能 | 管理者 | クライアント |
|------|--------|-------------|
| 自院のデータ閲覧 | ✅ | ✅ |
| 他院のデータ閲覧 | ✅ | ❌ |
| 全クリニック一覧 | ✅ | ❌ |
| データ入力・編集 | ✅ | ❌ |
| 目標採用人数設定 | ✅ | ❌ |
| スカウト文面登録 | ✅ | ❌ |
| KPIアラート閲覧 | ✅ | ✅ |
| 施策対応表閲覧 | ✅ | ✅ |

### 12.3 新規機能要件

#### 12.3.1 認証機能【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| AUTH-01 | クリニック別パスワード認証 | URLアクセス時にパスワード入力画面を表示 |
| AUTH-02 | 管理者認証 | 管理者パスワードで全クリニックにアクセス可能 |
| AUTH-03 | セッション管理 | ログイン状態を一定時間維持 |
| AUTH-04 | パスワード管理画面 | 管理者がクリニック別パスワードを設定・変更 |

#### 12.3.2 目標採用人数管理【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| GOAL-01 | 目標設定画面 | クリニック別・職種別に目標人数を設定 |
| GOAL-02 | 契約期間設定 | 契約開始日・契約期間（月数）を設定 |
| GOAL-03 | 進捗率表示 | 目標に対する現在の採用人数・進捗率を表示 |
| GOAL-04 | 進捗アラート | 残期間に対して進捗が遅い場合にアラート表示 |

#### 12.3.3 スカウト文面管理【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| SCOUT-01 | GUPPY文面登録 | 件名・本文・Bitlyリンク前訴求文を手入力で登録 |
| SCOUT-02 | ジョブメドレー文面登録 | 1文目・本文・対象条件を手入力で登録 |
| SCOUT-03 | Quacareer文面拡張 | 既存テーブルに件名・1文目・送信時間帯を追加 |
| SCOUT-04 | 文面履歴管理 | 使用期間を記録し、効果比較可能に |
| SCOUT-05 | 文面一覧表示 | ダッシュボード上で文面を閲覧可能 |

#### 12.3.4 KPIアラート機能【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| KPI-01 | KPIサマリーカード | 各指標を色分け（赤/黄/緑）で表示 |
| KPI-02 | 警告アラート | 閾値を下回った場合に改善施策を表示 |
| KPI-03 | 優良アラート | 閾値を上回った場合にさらなる改善提案を表示 |
| KPI-04 | アラート一覧 | 現在のアラートを一覧表示 |
| KPI-05 | データ色付け | テーブル内の数値を閾値に基づき色付け |

#### 12.3.5 プロフィール情報取得【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| PROF-01 | GUPPYプロフィール情報 | 充実度・独立応援資金設定・更新日を取得 |
| PROF-02 | ジョブメドレー重要指標 | スピード返信アイコン・職員の声・職場環境の有無を取得 |

#### 12.3.6 採用決定管理【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| HIRE-01 | 採用決定登録 | 採用日・職種・媒体・経路を登録 |
| HIRE-02 | 目標進捗自動更新 | 採用決定登録時に進捗率を自動更新 |

#### 12.3.7 バナー管理【新規開発】

| ID | 機能 | 詳細 |
|----|------|------|
| BANNER-01 | GUPPYバナー登録 | バナー画像URL・対応する文言を手入力で登録 |
| BANNER-02 | ジョブメドレーバナー登録 | バナー画像URL・対応する文言を手入力で登録 |
| BANNER-03 | バナー履歴管理 | 使用期間を記録し、効果比較可能に |
| BANNER-04 | バナー一覧表示 | ダッシュボード上でバナーと文言を閲覧可能 |

### 12.4 新規テーブル設計

#### clinic_auth（クリニック認証）

```sql
CREATE TABLE clinic_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### recruitment_goals（目標採用人数）

```sql
CREATE TABLE recruitment_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_duration_months INTEGER DEFAULT 12,
  job_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, job_type)
);
```

#### guppy_scout_templates（GUPPYスカウト文面）

```sql
CREATE TABLE guppy_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT,
  subject TEXT,
  body TEXT,
  link_cta_text TEXT,
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### jobmedley_scout_templates（ジョブメドレースカウト文面）

```sql
CREATE TABLE jobmedley_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  job_offer_id TEXT,
  template_name TEXT,
  first_sentence TEXT,
  body TEXT,
  target_criteria TEXT,
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### hires（採用決定記録）

```sql
CREATE TABLE hires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  hire_date DATE NOT NULL,
  job_type TEXT NOT NULL,
  source TEXT NOT NULL,
  channel TEXT,
  name TEXT,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### banners（バナー管理）

```sql
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,  -- 'guppy', 'jobmedley'
  banner_name TEXT,  -- バナーの識別名（例：「メインバナーv1」）
  image_url TEXT,  -- バナー画像URL
  copy_text TEXT,  -- バナーに対応する文言・コピー
  description TEXT,  -- 説明・メモ
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12.5 既存テーブル拡張

#### clinics テーブルに追加

```sql
ALTER TABLE clinics ADD COLUMN guppy_profile_completeness INTEGER;
ALTER TABLE clinics ADD COLUMN guppy_independence_support BOOLEAN;
ALTER TABLE clinics ADD COLUMN guppy_profile_updated_at TIMESTAMP WITH TIME ZONE;
```

#### jobmedley_job_offers テーブルに追加

```sql
ALTER TABLE jobmedley_job_offers ADD COLUMN has_speed_reply_badge BOOLEAN DEFAULT false;
ALTER TABLE jobmedley_job_offers ADD COLUMN has_staff_voice BOOLEAN DEFAULT false;
ALTER TABLE jobmedley_job_offers ADD COLUMN has_workplace_info BOOLEAN DEFAULT false;
ALTER TABLE jobmedley_job_offers ADD COLUMN main_photo_url TEXT;
ALTER TABLE jobmedley_job_offers ADD COLUMN title TEXT;
```

#### quacareer_scout_mails テーブルに追加

```sql
ALTER TABLE quacareer_scout_mails ADD COLUMN subject TEXT;
ALTER TABLE quacareer_scout_mails ADD COLUMN first_sentence TEXT;
ALTER TABLE quacareer_scout_mails ADD COLUMN sent_time TIME;
ALTER TABLE quacareer_scout_mails ADD COLUMN is_scout_plus BOOLEAN DEFAULT false;
ALTER TABLE quacareer_scout_mails ADD COLUMN application_count INTEGER DEFAULT 0;
```

---

## 13. 開発マイルストーン（2026-01-01追加）

### Phase A: 認証基盤【優先度：高】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| A-1 | `clinic_auth` テーブル作成 | 未着手 |
| A-2 | クリニック別パスワード認証API実装 | 未着手 |
| A-3 | 管理者認証API実装 | 未着手 |
| A-4 | ログイン画面UI実装 | 未着手 |
| A-5 | セッション管理（Cookie/JWT） | 未着手 |
| A-6 | 認証ミドルウェア実装 | 未着手 |

### Phase B: 目標採用人数管理【優先度：高】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| B-1 | `recruitment_goals` テーブル作成 | 未着手 |
| B-2 | `hires` テーブル作成 | 未着手 |
| B-3 | 目標設定API実装 | 未着手 |
| B-4 | 採用決定登録API実装 | 未着手 |
| B-5 | 進捗率計算ロジック実装 | 未着手 |
| B-6 | 目標設定画面UI実装 | 未着手 |
| B-7 | 進捗カード表示UI実装 | 未着手 |

### Phase C: スカウト文面・バナー管理【優先度：高】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| C-1 | `guppy_scout_templates` テーブル作成 | 未着手 |
| C-2 | `jobmedley_scout_templates` テーブル作成 | 未着手 |
| C-3 | `quacareer_scout_mails` テーブル拡張 | 未着手 |
| C-4 | `banners` テーブル作成 | 未着手 |
| C-5 | 文面登録API実装 | 未着手 |
| C-6 | 文面一覧API実装 | 未着手 |
| C-7 | バナー登録・一覧API実装 | 未着手 |
| C-8 | 文面管理画面UI実装 | 未着手 |
| C-9 | バナー管理画面UI実装 | 未着手 |
| C-10 | ダッシュボードへの文面・バナー表示追加 | 未着手 |

### Phase D: KPIアラート機能【優先度：高】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| D-1 | KPI閾値設定（定数定義） | 未着手 |
| D-2 | アラート判定ロジック実装 | 未着手 |
| D-3 | KPIサマリーカードUI実装 | 未着手 |
| D-4 | アラート一覧UI実装 | 未着手 |
| D-5 | テーブル数値の色付け実装 | 未着手 |
| D-6 | 施策対応表の表示実装 | 未着手 |

### Phase E: プロフィール・重要指標取得【優先度：中】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| E-1 | `clinics` テーブル拡張（GUPPY項目） | 未着手 |
| E-2 | `jobmedley_job_offers` テーブル拡張 | 未着手 |
| E-3 | GUPPYスクレイパー拡張 | 未着手 |
| E-4 | ジョブメドレースクレイパー拡張 | 未着手 |
| E-5 | 取得データの表示UI実装 | 未着手 |

### Phase F: 管理者専用機能【優先度：中】

| タスク | 概要 | ステータス |
|--------|------|-----------|
| F-1 | 全クリニック一覧画面 | 未着手 |
| F-2 | パスワード管理画面 | 未着手 |
| F-3 | 横断レポート画面（任意） | 未着手 |

---

## 14. 関連ドキュメント

- [dashboard-strategy.md](./dashboard-strategy.md) - 戦略・KPI定義・施策対応表
- [data-coverage-analysis.md](./data-coverage-analysis.md) - データ取得状況分析
