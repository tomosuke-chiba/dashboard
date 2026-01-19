-- 013: metricsテーブルに手動入力メトリクスカラム追加
-- Phase: 手動入力機能実装（スカウト返信数・面接設定数）

-- ============================================
-- 1. metricsテーブルへのカラム追加
-- ============================================
DO $$
BEGIN
  -- scout_reply_count: スカウト返信数（手動入力）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'metrics' AND column_name = 'scout_reply_count'
  ) THEN
    ALTER TABLE metrics ADD COLUMN scout_reply_count INTEGER;
  END IF;

  -- interview_count: 面接設定数（手動入力）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'metrics' AND column_name = 'interview_count'
  ) THEN
    ALTER TABLE metrics ADD COLUMN interview_count INTEGER;
  END IF;
END $$;

-- ============================================
-- 2. コメント追加
-- ============================================
COMMENT ON COLUMN metrics.scout_reply_count IS 'スカウト返信数（手動入力、NULL=未入力）';
COMMENT ON COLUMN metrics.interview_count IS '面接設定数（手動入力、NULL=未入力）';
