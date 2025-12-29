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
  jobmedley_login_id TEXT,
  jobmedley_password TEXT,
  quacareer_login_id TEXT,
  quacareer_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メトリクス（PV、応募数）テーブル
CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  source TEXT DEFAULT 'guppy', -- 'guppy', 'jobmedley', 'quacareer'
  pv_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_metrics_clinic_id ON metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_metrics_source ON metrics(source);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);

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

-- =============================================
-- Row Level Security (RLS) 設定
-- =============================================

-- RLSを有効化
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

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

-- 匿名ユーザー用のポリシー（読み取りのみ許可）
CREATE POLICY "Anonymous can read clinics"
  ON clinics
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read metrics"
  ON metrics
  FOR SELECT
  USING (true);
