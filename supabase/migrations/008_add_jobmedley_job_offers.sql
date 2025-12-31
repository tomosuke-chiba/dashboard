-- =============================================
-- Migration: JobMedley求人マスタテーブル追加
-- 実行日: 2025-12-31
-- タスク: 1.2 jobmedley_job_offersテーブルの新規作成
-- =============================================

-- 1. jobmedley_job_offers テーブル作成
CREATE TABLE IF NOT EXISTS jobmedley_job_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  job_offer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hire_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  scout_application_count INTEGER DEFAULT 0,
  page_view_count INTEGER DEFAULT 0,
  days_since_update INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  feature_tags TEXT[] DEFAULT '{}',
  scout_sent_count INTEGER DEFAULT 0,
  search_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, job_offer_id)
);

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobmedley_job_offers_clinic
  ON jobmedley_job_offers(clinic_id);

CREATE INDEX IF NOT EXISTS idx_jobmedley_job_offers_job_offer_id
  ON jobmedley_job_offers(job_offer_id);

-- 3. 更新トリガー追加
DROP TRIGGER IF EXISTS update_jobmedley_job_offers_updated_at ON jobmedley_job_offers;
CREATE TRIGGER update_jobmedley_job_offers_updated_at
  BEFORE UPDATE ON jobmedley_job_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS有効化
ALTER TABLE jobmedley_job_offers ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー追加
CREATE POLICY "Service role can do everything on jobmedley_job_offers"
  ON jobmedley_job_offers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous can read jobmedley_job_offers"
  ON jobmedley_job_offers
  FOR SELECT
  USING (true);

-- 6. コメント追加
COMMENT ON TABLE jobmedley_job_offers IS 'JobMedley求人マスタ（職種別サマリー情報）';
COMMENT ON COLUMN jobmedley_job_offers.job_offer_id IS 'JobMedley上の求人ID';
COMMENT ON COLUMN jobmedley_job_offers.name IS '求人名（職種名）';
COMMENT ON COLUMN jobmedley_job_offers.hire_count IS '採用決定数';
COMMENT ON COLUMN jobmedley_job_offers.application_count IS '応募数（全体）';
COMMENT ON COLUMN jobmedley_job_offers.scout_application_count IS 'スカウト経由応募数';
COMMENT ON COLUMN jobmedley_job_offers.page_view_count IS '求人詳細ページ閲覧数';
COMMENT ON COLUMN jobmedley_job_offers.days_since_update IS '直近の原稿更新からの経過日数';
COMMENT ON COLUMN jobmedley_job_offers.photo_count IS '掲載中の写真の枚数';
COMMENT ON COLUMN jobmedley_job_offers.feature_tags IS 'チェック済みの特徴タグ';
COMMENT ON COLUMN jobmedley_job_offers.scout_sent_count IS 'スカウト送信数（サマリー）';
COMMENT ON COLUMN jobmedley_job_offers.search_url IS '検索順位チェック用URL';
