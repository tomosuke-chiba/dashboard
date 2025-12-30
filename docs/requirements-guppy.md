# GUPPY 要件定義書

## 1. 概要

| 項目 | 内容 |
|------|------|
| 媒体名 | GUPPY（グッピー） |
| URL | https://www.guppy.jp |
| 課金体系 | 閲覧課金（100円/閲覧）+ スカウトメール（1,000円/通） |
| 認証方式 | ID + パスワード（2FA/CAPTCHAなし） |
| 実装状況 | 基本機能実装済み、追加機能対応中 |

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
- 管理画面内のタブ/フィルターで職種を切り替え
- Phase 1対応職種: Dr / DH / DA
- 職種ごとにデータを個別取得

**更新頻度:** 1日4回（6時間ごと）

### 3.2 スカウトメールデータ

| 項目 | ソースURL | 取得方法 |
|------|-----------|----------|
| 送信数（未返信） | `/service/message_thread?filter_tab=scout_no_reply` | 「もっと見る」で全件取得、日時からカウント |
| 返信数 | `/service/message_thread` | 返信ありスレッド数をカウント |

**既読数:** 不要（取得コスト高のため除外）

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

### 7.1 閲覧データ取得

```
1. ログイン（ID/Password）
2. 職種タブを切り替え（Dr → DH → DA）
3. 各職種で /service/access_logs/YYYY-MM にアクセス
4. テーブルから日別データを抽出
5. job_type を付与してDB保存
6. 閲覧率チェック → 30%超ならDiscord通知
```

### 7.2 スカウトメール取得

```
1. ログイン（ID/Password）
2. /service/message_thread?filter_tab=scout_no_reply にアクセス
3. 「もっと見る」を繰り返しクリックして全件表示
4. 日時から日別送信数をカウント
5. /service/message_thread にアクセス
6. 返信ありスレッド数をカウント
7. DB保存
```

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

### Phase 1-A: 職種別データ取得

- [ ] GUPPYスクレイパーに職種切り替え機能追加
- [ ] metricsテーブルにjob_typeカラム追加
- [ ] ユニーク制約の更新
- [ ] 職種別にデータ保存

### Phase 1-B: スカウトメール機能

- [ ] スカウトメールスクレイパー実装
- [ ] scout_messagesテーブル作成
- [ ] ダッシュボードにスカウトセクション追加

### Phase 1-C: 閲覧率アラート

- [ ] 閲覧率計算ロジック追加
- [ ] 30%超判定処理
- [ ] Discord通知送信

### Phase 1-D: Bitly連携

- [ ] Bitly APIクライアント実装
- [ ] clinicsテーブルにbitly_urlカラム追加
- [ ] bitly_clicksテーブル作成
- [ ] クリック数取得・保存処理

### Phase 1-E: UI更新

- [ ] 職種タブコンポーネント追加
- [ ] スカウトメールセクション追加
- [ ] アラート表示機能追加

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