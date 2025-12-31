-- =============================================
-- Migration: JobMedley日別データ拡張
-- 実行日: 2025-12-31
-- タスク: 1.1 jobmedley_scoutsテーブルへのカラム追加
-- =============================================

-- 1. jobmedley_scouts テーブルへのカラム追加
-- 求人ID（職種別データ対応）
ALTER TABLE jobmedley_scouts
  ADD COLUMN IF NOT EXISTS job_offer_id TEXT;

-- 日別メトリクスカラム追加
ALTER TABLE jobmedley_scouts
  ADD COLUMN IF NOT EXISTS page_view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS application_count_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scout_application_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cum_scout_sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_rank INTEGER;

-- 2. ユニーク制約の変更
-- 既存制約を削除（clinic_id, date）
ALTER TABLE jobmedley_scouts
  DROP CONSTRAINT IF EXISTS jobmedley_scouts_clinic_id_date_key;

-- 新規制約を追加（clinic_id, job_offer_id, date）
-- job_offer_idがNULLの場合は全求人合算を表す
ALTER TABLE jobmedley_scouts
  ADD CONSTRAINT jobmedley_scouts_clinic_job_date_key
  UNIQUE (clinic_id, job_offer_id, date);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobmedley_scouts_job_offer
  ON jobmedley_scouts(job_offer_id);

-- 4. コメント追加（カラム説明）
COMMENT ON COLUMN jobmedley_scouts.job_offer_id IS '求人ID（NULLは全求人合算）';
COMMENT ON COLUMN jobmedley_scouts.page_view_count IS '求人詳細ページ閲覧数';
COMMENT ON COLUMN jobmedley_scouts.application_count_total IS '応募数（全応募）';
COMMENT ON COLUMN jobmedley_scouts.scout_application_count IS 'スカウト経由応募数';
COMMENT ON COLUMN jobmedley_scouts.cum_scout_sent_count IS '月間累計スカウト送信数（23:00時点）';
COMMENT ON COLUMN jobmedley_scouts.search_rank IS '求人掲載順位（NULLは圏外）';
