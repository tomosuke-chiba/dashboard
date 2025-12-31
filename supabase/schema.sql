-- =============================================
-- 求人媒体ダッシュボード データベーススキーマ
-- =============================================

-- クライアント（歯科医院）テーブル
CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  guppy_login_id TEXT,
  guppy_password TEXT,
  guppy_clinic_name TEXT,        -- GUPPY上の医院名（検索順位マッチング用）
  guppy_search_url TEXT,         -- 検索順位チェック用の地区URL
  jobmedley_login_id TEXT,
  jobmedley_password TEXT,
  jobmedley_clinic_name TEXT,    -- ジョブメドレー上の医院名（検索順位マッチング用）
  jobmedley_search_url TEXT,     -- ジョブメドレー検索順位チェック用の検索URL
  quacareer_login_id TEXT,
  quacareer_password TEXT,
  bitly_url TEXT,                -- Bitly短縮URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メトリクス（日別アクセスデータ）テーブル
CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,                    -- 記録日
  source TEXT DEFAULT 'guppy',           -- 'guppy', 'jobmedley', 'quacareer'
  job_type TEXT,                         -- 職種: 'dr', 'dh', 'da' など（NULLは合計/未分類）
  search_rank INTEGER,                   -- 検索順位（NULL許容: 1日1回更新）
  display_count INTEGER DEFAULT 0,       -- 表示数
  view_count INTEGER DEFAULT 0,          -- 閲覧数
  redirect_count INTEGER DEFAULT 0,      -- 自社サイト誘導数
  application_count INTEGER DEFAULT 0,   -- 応募数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date, source, job_type) -- 複合ユニーク制約
);

-- スカウトメールデータテーブル
CREATE TABLE IF NOT EXISTS scout_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  source TEXT DEFAULT 'guppy',           -- 'guppy', 'jobmedley', 'quacareer'
  sent_count INTEGER DEFAULT 0,          -- 送信数
  reply_count INTEGER DEFAULT 0,         -- 返信数
  open_count INTEGER DEFAULT 0,          -- 開封数（クオキャリアのみ）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date, source)
);

-- Bitlyクリックデータテーブル
CREATE TABLE IF NOT EXISTS bitly_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

-- JobMedley 分析データ（月次）
CREATE TABLE IF NOT EXISTS jobmedley_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  hire_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  scout_application_count INTEGER DEFAULT 0,
  page_view_count INTEGER DEFAULT 0,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, period_year, period_month)
);

-- JobMedley スカウト送信数（日次）
CREATE TABLE IF NOT EXISTS jobmedley_scouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  sent_count INTEGER DEFAULT 0,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

-- Quacareer ダッシュボード（日次）
CREATE TABLE IF NOT EXISTS quacareer_dashboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_applicants INTEGER DEFAULT 0,
  favorites_dh INTEGER DEFAULT 0,
  favorites_dr INTEGER DEFAULT 0,
  scout_mail_open_rate DOUBLE PRECISION DEFAULT 0,
  scout_plus_open_rate DOUBLE PRECISION DEFAULT 0,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

-- Quacareer スカウトメール一覧（スナップショット）
CREATE TABLE IF NOT EXISTS quacareer_scout_mails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  scraped_date DATE NOT NULL,
  delivery_date TEXT,
  target_job_type TEXT,
  message TEXT,
  delivery_count INTEGER DEFAULT 0,
  open_rate DOUBLE PRECISION DEFAULT 0,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_metrics_clinic_id ON metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_source ON metrics(source);
CREATE INDEX IF NOT EXISTS idx_metrics_job_type ON metrics(job_type);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_scout_messages_clinic_id ON scout_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_scout_messages_date ON scout_messages(date);
CREATE INDEX IF NOT EXISTS idx_bitly_clicks_clinic_id ON bitly_clicks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bitly_clicks_date ON bitly_clicks(date);
CREATE INDEX IF NOT EXISTS idx_jobmedley_analysis_clinic_id ON jobmedley_analysis(clinic_id);
CREATE INDEX IF NOT EXISTS idx_jobmedley_analysis_period ON jobmedley_analysis(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_jobmedley_scouts_clinic_id ON jobmedley_scouts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_jobmedley_scouts_date ON jobmedley_scouts(date);
CREATE INDEX IF NOT EXISTS idx_quacareer_dashboard_clinic_id ON quacareer_dashboard(clinic_id);
CREATE INDEX IF NOT EXISTS idx_quacareer_dashboard_date ON quacareer_dashboard(date);
CREATE INDEX IF NOT EXISTS idx_quacareer_scout_mails_clinic_id ON quacareer_scout_mails(clinic_id);
CREATE INDEX IF NOT EXISTS idx_quacareer_scout_mails_scraped_date ON quacareer_scout_mails(scraped_date);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- clinicsテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_clinics_updated_at ON clinics;
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- scout_messagesテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_scout_messages_updated_at ON scout_messages;
CREATE TRIGGER update_scout_messages_updated_at
  BEFORE UPDATE ON scout_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- bitly_clicksテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_bitly_clicks_updated_at ON bitly_clicks;
CREATE TRIGGER update_bitly_clicks_updated_at
  BEFORE UPDATE ON bitly_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- jobmedley_analysisテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_jobmedley_analysis_updated_at ON jobmedley_analysis;
CREATE TRIGGER update_jobmedley_analysis_updated_at
  BEFORE UPDATE ON jobmedley_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- jobmedley_scoutsテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_jobmedley_scouts_updated_at ON jobmedley_scouts;
CREATE TRIGGER update_jobmedley_scouts_updated_at
  BEFORE UPDATE ON jobmedley_scouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- quacareer_dashboardテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_quacareer_dashboard_updated_at ON quacareer_dashboard;
CREATE TRIGGER update_quacareer_dashboard_updated_at
  BEFORE UPDATE ON quacareer_dashboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- quacareer_scout_mailsテーブルの更新トリガー
DROP TRIGGER IF EXISTS update_quacareer_scout_mails_updated_at ON quacareer_scout_mails;
CREATE TRIGGER update_quacareer_scout_mails_updated_at
  BEFORE UPDATE ON quacareer_scout_mails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) 設定
-- =============================================

-- RLSを有効化
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitly_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobmedley_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobmedley_scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quacareer_dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE quacareer_scout_mails ENABLE ROW LEVEL SECURITY;

-- サービスロール用のポリシー（すべての操作を許可）
CREATE POLICY "Service role can do everything on clinics"
  ON clinics
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on metrics"
  ON metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on scout_messages"
  ON scout_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on bitly_clicks"
  ON bitly_clicks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on jobmedley_analysis"
  ON jobmedley_analysis
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on jobmedley_scouts"
  ON jobmedley_scouts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on quacareer_dashboard"
  ON quacareer_dashboard
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on quacareer_scout_mails"
  ON quacareer_scout_mails
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 匿名ユーザー用のポリシー（読み取りのみ許可）
CREATE POLICY "Anonymous can read clinics"
  ON clinics
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read metrics"
  ON metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read scout_messages"
  ON scout_messages
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read bitly_clicks"
  ON bitly_clicks
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read jobmedley_analysis"
  ON jobmedley_analysis
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read jobmedley_scouts"
  ON jobmedley_scouts
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read quacareer_dashboard"
  ON quacareer_dashboard
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read quacareer_scout_mails"
  ON quacareer_scout_mails
  FOR SELECT
  USING (true);

-- =============================================
-- マイグレーション用SQL（既存DBへの適用）
-- =============================================
-- 以下は既存のDBに変更を適用する場合に使用

/*
-- clinicsテーブルにbitly_urlカラム追加
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bitly_url TEXT;

-- metricsテーブルにjob_typeカラム追加
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS job_type TEXT;

-- 既存のユニーク制約を削除して新しい制約を追加
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_clinic_id_date_key;
ALTER TABLE metrics ADD CONSTRAINT metrics_clinic_date_source_job_type_key
  UNIQUE (clinic_id, date, source, job_type);

-- 新規テーブル作成（scout_messages, bitly_clicks）は上記のCREATE TABLE文を実行
*/
