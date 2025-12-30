-- =============================================
-- Migration: 職種別対応 + 新規テーブル追加
-- 実行日: 2025-12-30
-- =============================================

-- 1. clinicsテーブルにbitly_urlカラム追加
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bitly_url TEXT;

-- 2. metricsテーブルにsourceカラム追加（存在しない場合）
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'guppy';

-- 3. metricsテーブルにjob_typeカラム追加
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS job_type TEXT;

-- 4. 既存のユニーク制約を削除して新しい制約を追加
-- 注意: 既存データがある場合、job_type=NULLで重複が発生しないよう確認が必要
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_clinic_id_date_key;
ALTER TABLE metrics ADD CONSTRAINT metrics_clinic_date_source_job_type_key
  UNIQUE (clinic_id, date, source, job_type);

-- 4. job_type用インデックス追加
CREATE INDEX IF NOT EXISTS idx_metrics_job_type ON metrics(job_type);

-- 5. スカウトメールデータテーブル作成
CREATE TABLE IF NOT EXISTS scout_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  source TEXT DEFAULT 'guppy',
  sent_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date, source)
);

CREATE INDEX IF NOT EXISTS idx_scout_messages_clinic_id ON scout_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_scout_messages_date ON scout_messages(date);

-- 6. Bitlyクリックデータテーブル作成
CREATE TABLE IF NOT EXISTS bitly_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bitly_clicks_clinic_id ON bitly_clicks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bitly_clicks_date ON bitly_clicks(date);

-- 7. 更新日時を自動更新するトリガー関数（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 更新トリガー追加
DROP TRIGGER IF EXISTS update_scout_messages_updated_at ON scout_messages;
CREATE TRIGGER update_scout_messages_updated_at
  BEFORE UPDATE ON scout_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bitly_clicks_updated_at ON bitly_clicks;
CREATE TRIGGER update_bitly_clicks_updated_at
  BEFORE UPDATE ON bitly_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS有効化
ALTER TABLE scout_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitly_clicks ENABLE ROW LEVEL SECURITY;

-- 9. RLSポリシー追加
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

CREATE POLICY "Anonymous can read scout_messages"
  ON scout_messages
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read bitly_clicks"
  ON bitly_clicks
  FOR SELECT
  USING (true);