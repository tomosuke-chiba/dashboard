-- 012: プロフィール情報・重要指標テーブル拡張
-- Phase E: プロフィール・重要指標取得

-- ============================================
-- 1. clinicsテーブルへのGUPPYプロフィール項目追加
-- ============================================
DO $$
BEGIN
  -- guppy_profile_completeness: プロフィール充実度（%）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'guppy_profile_completeness'
  ) THEN
    ALTER TABLE clinics ADD COLUMN guppy_profile_completeness INTEGER;
  END IF;

  -- guppy_independence_support: 独立応援資金設定の有無
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'guppy_independence_support'
  ) THEN
    ALTER TABLE clinics ADD COLUMN guppy_independence_support BOOLEAN DEFAULT false;
  END IF;

  -- guppy_profile_updated_at: プロフィール最終更新日時
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'guppy_profile_updated_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN guppy_profile_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- guppy_profile_scraped_at: プロフィール情報スクレイピング日時
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'guppy_profile_scraped_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN guppy_profile_scraped_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 2. jobmedley_job_offersテーブルへの重要指標追加
-- ============================================
DO $$
BEGIN
  -- has_speed_reply_badge: スピード返信アイコンの有無
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'has_speed_reply_badge'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN has_speed_reply_badge BOOLEAN DEFAULT false;
  END IF;

  -- has_staff_voice: 職員の声の有無
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'has_staff_voice'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN has_staff_voice BOOLEAN DEFAULT false;
  END IF;

  -- has_workplace_info: 職場環境情報の有無
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'has_workplace_info'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN has_workplace_info BOOLEAN DEFAULT false;
  END IF;

  -- main_photo_url: メイン写真URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'main_photo_url'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN main_photo_url TEXT;
  END IF;

  -- title: 求人タイトル
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'title'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN title TEXT;
  END IF;

  -- last_updated_at: 原稿最終更新日
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'last_updated_at'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN last_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- days_since_update: 原稿更新からの経過日数
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'days_since_update'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN days_since_update INTEGER;
  END IF;

  -- photo_count: 写真枚数
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'photo_count'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN photo_count INTEGER DEFAULT 0;
  END IF;

  -- feature_tags: 特徴タグ（JSON配列）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'feature_tags'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN feature_tags JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- indicators_scraped_at: 重要指標スクレイピング日時
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobmedley_job_offers' AND column_name = 'indicators_scraped_at'
  ) THEN
    ALTER TABLE jobmedley_job_offers ADD COLUMN indicators_scraped_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 3. コメント追加
-- ============================================
COMMENT ON COLUMN clinics.guppy_profile_completeness IS 'GUPPYプロフィール充実度（0-100%）';
COMMENT ON COLUMN clinics.guppy_independence_support IS 'GUPPY独立応援資金設定の有無';
COMMENT ON COLUMN clinics.guppy_profile_updated_at IS 'GUPPYプロフィール最終更新日時';
COMMENT ON COLUMN clinics.guppy_profile_scraped_at IS 'GUPPYプロフィール情報取得日時';

COMMENT ON COLUMN jobmedley_job_offers.has_speed_reply_badge IS 'スピード返信アイコンの有無（24時間以内返信）';
COMMENT ON COLUMN jobmedley_job_offers.has_staff_voice IS '職員の声の登録有無';
COMMENT ON COLUMN jobmedley_job_offers.has_workplace_info IS '職場環境情報の登録有無';
COMMENT ON COLUMN jobmedley_job_offers.main_photo_url IS 'メイン写真URL（1枚目）';
COMMENT ON COLUMN jobmedley_job_offers.title IS '求人タイトル';
COMMENT ON COLUMN jobmedley_job_offers.last_updated_at IS '原稿最終更新日';
COMMENT ON COLUMN jobmedley_job_offers.days_since_update IS '原稿更新からの経過日数';
COMMENT ON COLUMN jobmedley_job_offers.photo_count IS '掲載写真枚数';
COMMENT ON COLUMN jobmedley_job_offers.feature_tags IS '特徴タグ（JSON配列）';
COMMENT ON COLUMN jobmedley_job_offers.indicators_scraped_at IS '重要指標スクレイピング日時';
