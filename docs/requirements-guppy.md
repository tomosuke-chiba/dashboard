# GUPPY 要件定義書

## 1. 概要

| 項目 | 内容 |
|------|------|
| 媒体名 | GUPPY（グッピー） |
| URL | https://www.guppy.jp |
| 課金体系 | 閲覧課金（100円/閲覧）+ スカウトメール（1,000円/通） |
| 認証方式 | ID + パスワード（2FA/CAPTCHAなし） |
| 実装状況 | **Phase 1の大部分が完了。スカウトメール返信数取得のみ未実装。** |

---

## 2. 採用の流れとKPI

### 2.1 採用ルート

**ルート1: 閲覧経由**
```
表示（検索結果に表示）
  ↓
閲覧（求人ページを閲覧）※ 100円課金
  ↓
申込（応募）
  ↓
採用
```

**ルート2: スカウトメール経由**
```
スカウトメール送信 ※ 1,000円/通
  ↓
開封・Bitlyクリック
  ↓
返信
  ↓
採用
```

### 2.2 KPI指標

| 指標 | 計算式 | 目標/アラート |
|------|--------|---------------|
| 閲覧率 | 閲覧数 / 表示数 | **30%超でアラート（不正アクセス疑い）** |
| 申込率 | 応募数 / 閲覧数 | - |
| 自社サイト誘導率 | 誘導数 / 閲覧数 | - |
| スカウト返信率 | 返信数 / 送信数 | - |

---

## 3. データ取得仕様

### 3.1 閲覧データ

| 項目 | ソースURL | 取得方法 |
|------|-----------|----------|
| 表示数 | `/service/access_logs/YYYY-MM` | テーブルスクレイピング |
| 閲覧数 | 同上 | 同上 |
| 自社サイト誘導数 | 同上 | 同上 |
| 応募数 | 同上 | 同上 |

**職種別取得:**
- アクセスログページのドロップダウンから求人ID一覧を抽出
- 各求人IDごとに `/service/access_logs/YYYY-MM/JOB_ID` にアクセス
- 求人名から職種を自動判定（Dr/DH/DA）
- Phase 1対応職種: Dr / DH / DA
- 職種ごとにデータを個別取得・保存（job_type付与）

**更新頻度:** 1日4回（6時間ごと）

**実装状況:** ✅完了（`scrapeGuppyByJobType`関数で実装済み）

### 3.2 スカウトメールデータ

| 項目 | ソースURL | 取得方法 | 実装状況 |
|------|-----------|----------|----------|
| 送信数 | `/service/message_thread?filter_tab=scout_no_reply` | 「もっと見る」で全件取得、スカウトメモから日時を抽出してカウント | ✅完了 |
| 返信数 | `/service/message_thread` | 返信ありスレッド数をカウント | ❌未実装（現状0固定） |

**既読数:** 不要（取得コスト高のため除外）

**実装詳細:**
- スカウトメモ形式: "1226 DH スカウト" → 日付（MMDD形式）と職種を抽出
- メモ作成日時から年を取得して日付を構築（YYYY-MM-DD形式）
- 日別送信数を集計してDBに保存

### 3.3 検索順位

| 項目 | ソースURL | 取得方法 |
|------|-----------|----------|
| 検索順位 | クリニックごとに指定（例: `/dds/tokyo/103`） | ページ内で医院名マッチング |

**更新頻度:** 1日1回

---

## 4. Bitly連携

### 4.1 運用方法

- クリニックごとに1つの短縮URLを使い回し
- スカウトメール内にInstagram紹介リンクとして挿入
- クリック数 = クリニックへの興味度の指標

### 4.2 技術仕様

| 項目 | 詳細 |
|------|------|
| API | Bitly API v4 |
| エンドポイント | `GET /v4/bitlinks/{bitlink}/clicks/summary` |
| 認証 | Bearer Token（BITLY_ACCESS_TOKEN） |
| プラン | 有料プラン（API利用可能） |

### 4.3 データ取得

```
クリニック.bitly_url → Bitly API → click_count
```

---

## 5. アラート機能

### 5.1 閲覧率30%超アラート

| 項目 | 詳細 |
|------|------|
| トリガー条件 | 閲覧率（閲覧数/表示数）> 30% |
| 通知先 | Discord |
| 通知内容 | クリニック名 + 「閲覧率が30%を超えています。不正アクセスの可能性があります」 |
| 判定タイミング | データ取得時（1日4回） |

---

## 6. データベース設計

### 6.1 metrics テーブル（拡張）

```sql
-- 既存カラム + 新規カラム
ALTER TABLE metrics ADD COLUMN job_type TEXT;

-- ユニーク制約の更新
ALTER TABLE metrics DROP CONSTRAINT metrics_clinic_id_date_key;
ALTER TABLE metrics ADD CONSTRAINT metrics_unique
  UNIQUE (clinic_id, date, source, job_type);
```

**job_type の値:**
- `dr` - 歯科医師
- `dh` - 歯科衛生士
- `da` - 歯科助手
- `null` - 職種未分類（既存データ互換）

### 6.2 scout_messages テーブル（新規）

```sql
CREATE TABLE scout_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT DEFAULT 'guppy',
  sent_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, date, source)
);

CREATE INDEX idx_scout_messages_clinic_id ON scout_messages(clinic_id);
CREATE INDEX idx_scout_messages_date ON scout_messages(date);
```

### 6.3 bitly_clicks テーブル（新規）

```sql
CREATE TABLE bitly_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

CREATE INDEX idx_bitly_clicks_clinic_id ON bitly_clicks(clinic_id);
CREATE INDEX idx_bitly_clicks_date ON bitly_clicks(date);
```

### 6.4 clinics テーブル（拡張）

```sql
ALTER TABLE clinics ADD COLUMN bitly_url TEXT;
```

---

## 7. スクレイピング処理フロー

### 7.1 閲覧データ取得 ✅実装済み

```
1. ログイン（ID/Password）
2. 最初の月のアクセスログページにアクセス
3. ドロップダウンから求人ID一覧を抽出
4. 各求人IDごとに /service/access_logs/YYYY-MM/JOB_ID にアクセス
5. テーブルから日別データを抽出
6. 求人名から職種を自動判定（Dr/DH/DA）
7. 合計データ（job_type=null）と職種別データ（job_type=dr/dh/da）をDB保存
8. 閲覧率チェック → 30%超ならDiscord通知
```

**実装関数:** `scrapeGuppyByJobType`（`src/lib/scraper.ts`）

### 7.2 スカウトメール取得 🚧一部実装済み

```
1. ログイン（ID/Password）
2. /service/message_thread?filter_tab=scout_no_reply にアクセス
3. 「もっと見る」を繰り返しクリックして全件表示
4. スカウトメモを抽出（.scout-memo-list内のli.list-memo-body）
5. メモ形式 "1226 DH スカウト" から日付と職種を抽出
6. 日別送信数を集計してDB保存
7. （未実装）返信ありスレッド数をカウント
```

**実装関数:** `scrapeGuppyScoutMessages`（`src/lib/scraper.ts`）

**未実装:**
- 返信数の取得（`/service/message_thread`から返信ありスレッドを抽出する機能）

---

## 8. ダッシュボードUI

### 8.1 画面構成

```
/clinic/[slug]/guppy
├── 月選択ボタン
├── 職種タブ（Dr / DH / DA / 合計）  ← 新規追加
├── サマリーカード
│   ├── 表示数
│   ├── 閲覧数（閲覧率表示、30%超は警告色）
│   ├── 自社サイト誘導数
│   └── 応募数
├── スカウトメールセクション  ← 新規追加
│   ├── 送信数
│   ├── 返信数
│   ├── 返信率
│   └── Bitlyクリック数
└── 日別データテーブル
```

### 8.2 アラート表示

- 閲覧率30%超の場合、該当カードを赤色背景で強調
- ツールチップで「不正アクセスの可能性があります」と表示

---

## 9. 実装タスク

### Phase 1-A: DB・基盤整備 ✅完了

- [x] metricsテーブルにjob_typeカラム追加
- [x] metricsテーブルにsourceカラム追加
- [x] ユニーク制約の更新
- [x] scout_messagesテーブル作成
- [x] bitly_clicksテーブル作成
- [x] clinicsテーブルにbitly_urlカラム追加
- [x] bitly_linksテーブル作成（命名規則ベースのリンク管理）
- [x] bitly_link_clicksテーブル作成（リンク別クリック数管理）

### Phase 1-B: Bitly連携 ✅完了

- [x] Bitly APIクライアント実装
- [x] BITLY_ACCESS_TOKEN環境変数設定
- [x] クリニックにBitly URL登録（3クリニック）
- [x] 日別クリック数取得・保存機能
- [x] 命名規則ベースのリンク自動検出・取得機能

### Phase 1-C: 閲覧率アラート ✅完了

- [x] 閲覧率計算ロジック追加
- [x] 30%超判定処理
- [x] Discord通知送信
- [x] UIでのアラート表示（赤色背景・警告アイコン）

### Phase 1-D: 職種別データ取得 ✅完了

- [x] GUPPYスクレイパーに職種切り替え機能追加（求人IDベースで職種判定）
- [x] 職種別にデータ保存（job_type付与してDB保存）
- [x] 職種タブ切り替えで職種別データを表示（API・UI実装済み）

**実装詳細:**
- `scrapeGuppyByJobType`関数で求人IDごとにデータ取得
- 求人名から職種を自動判定（Dr/DH/DA）
- 合計データ（job_type=null）と職種別データ（job_type=dr/dh/da）を分けて保存
- API側で職種フィルタリング対応（`/api/clinics/[slug]?job_type=dr`）
- UI側で職種タブ切り替え時にAPIを呼び出してデータ取得

### Phase 1-E: スカウトメール機能拡張 🚧一部完了

- [x] スカウトメールスクレイパー実装（送信数取得）
- [ ] スカウトメール返信数取得（現状0固定、未実装）
- [x] Bitlyクリック率の計算（クリック数 / 送信数）
- [x] ダッシュボードにスカウトセクション更新

**実装詳細:**
- `scrapeGuppyScoutMessages`関数でスカウトメモから送信数を取得
- スカウトメモ形式: "1226 DH スカウト" → 日付と職種を抽出
- 日別送信数をDBに保存
- UIで送信数・返信数・返信率・Bitlyクリック数・Bitlyクリック率を表示

**未実装:**
- 返信数の取得（`/service/message_thread`から返信ありスレッド数をカウントする機能）

### Phase 1-F: UI更新 ✅完了

- [x] 職種タブコンポーネント追加（Dr/DH/DA/合計）
- [x] スカウトメールセクション追加（送信数・返信数・返信率・Bitlyクリック数・Bitlyクリック率）
- [x] アラート表示機能追加（閲覧率30%超で赤色背景・警告アイコン）
- [x] 職種タブ切り替えでデータをフィルタリング（API連動済み）
- [x] Bitlyクリック率表示追加
- [x] スカウト文面別クリック数表示（命名規則ベースのリンク別表示）

---

## 10. 実装状況サマリー

### ✅ 実装完了項目

1. **データベース設計**
   - metricsテーブルの職種別対応（job_typeカラム）
   - scout_messagesテーブル（スカウトメール送信数・返信数）
   - bitly_clicksテーブル（クリニック別クリック数）
   - bitly_linksテーブル（命名規則ベースのリンク管理）
   - bitly_link_clicksテーブル（リンク別クリック数）

2. **スクレイピング機能**
   - 職種別アクセスログ取得（求人IDベース）
   - スカウトメール送信数取得（スカウトメモ解析）
   - 閲覧率30%超アラート（Discord通知）

3. **Bitly連携**
   - Bitly APIクライアント
   - クリニック別クリック数取得・保存
   - 命名規則ベースのリンク自動検出・取得

4. **ダッシュボードUI**
   - 職種タブ切り替え（Dr/DH/DA/合計）
   - スカウトメールセクション（送信数・返信数・返信率・Bitlyクリック数・Bitlyクリック率）
   - 閲覧率アラート表示（30%超で警告）
   - スカウト文面別クリック数表示

### ❌ 未実装項目

1. **スカウトメール返信数取得**
   - 現状: 返信数は0固定
   - 要件: `/service/message_thread`から返信ありスレッド数をカウント
   - 実装方法: メッセージスレッド一覧から返信ありのスレッドを抽出して日別に集計

2. **検索順位取得**（Phase 1の範囲外）
   - 要件定義には記載されているが、Phase 1の実装タスクには含まれていない
   - 将来の拡張項目として残す

---

## 10. 環境変数

```
# 既存
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DISCORD_WEBHOOK_URL

# 新規追加
BITLY_ACCESS_TOKEN
```

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-12-30 | 初版作成 |
| 2025-01-XX | 実装状況を明確化（完了項目・未実装項目を整理） |