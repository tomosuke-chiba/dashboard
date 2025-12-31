-- =============================================
-- Migration: JobMedley/Quacareer 保存テーブル追加
-- 実行日: 2025-12-31
-- =============================================

-- 1. JobMedley 分析データ（月次）
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

CREATE INDEX IF NOT EXISTS idx_jobmedley_analysis_clinic_id ON jobmedley_analysis(clinic_id);
CREATE INDEX IF NOT EXISTS idx_jobmedley_analysis_period ON jobmedley_analysis(period_year, period_month);

-- 2. JobMedley スカウト送信数（日次）
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

CREATE INDEX IF NOT EXISTS idx_jobmedley_scouts_clinic_id ON jobmedley_scouts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_jobmedley_scouts_date ON jobmedley_scouts(date);

-- 3. Quacareer ダッシュボード（日次）
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

CREATE INDEX IF NOT EXISTS idx_quacareer_dashboard_clinic_id ON quacareer_dashboard(clinic_id);
CREATE INDEX IF NOT EXISTS idx_quacareer_dashboard_date ON quacareer_dashboard(date);

-- 4. Quacareer スカウトメール一覧（スナップショット）
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

CREATE INDEX IF NOT EXISTS idx_quacareer_scout_mails_clinic_id ON quacareer_scout_mails(clinic_id);
CREATE INDEX IF NOT EXISTS idx_quacareer_scout_mails_scraped_date ON quacareer_scout_mails(scraped_date);

-- 5. 更新トリガー追加
DROP TRIGGER IF EXISTS update_jobmedley_analysis_updated_at ON jobmedley_analysis;
CREATE TRIGGER update_jobmedley_analysis_updated_at
  BEFORE UPDATE ON jobmedley_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobmedley_scouts_updated_at ON jobmedley_scouts;
CREATE TRIGGER update_jobmedley_scouts_updated_at
  BEFORE UPDATE ON jobmedley_scouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quacareer_dashboard_updated_at ON quacareer_dashboard;
CREATE TRIGGER update_quacareer_dashboard_updated_at
  BEFORE UPDATE ON quacareer_dashboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quacareer_scout_mails_updated_at ON quacareer_scout_mails;
CREATE TRIGGER update_quacareer_scout_mails_updated_at
  BEFORE UPDATE ON quacareer_scout_mails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS有効化
ALTER TABLE jobmedley_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobmedley_scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quacareer_dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE quacareer_scout_mails ENABLE ROW LEVEL SECURITY;

-- 7. RLSポリシー追加
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
