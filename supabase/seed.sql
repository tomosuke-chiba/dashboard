-- =============================================
-- テストデータ投入
-- =============================================

-- テスト用クライアント（1〜2件）
INSERT INTO clinics (name, slug, guppy_login_id, guppy_password) VALUES
  ('サンプル歯科医院', 'sample-dental', '0886556471', 'r6p6f67x')
ON CONFLICT (slug) DO UPDATE SET
  guppy_login_id = EXCLUDED.guppy_login_id,
  guppy_password = EXCLUDED.guppy_password;

-- テスト用メトリクスデータ（過去7日分）
DO $$
DECLARE
  clinic_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO clinic_id FROM clinics WHERE slug = 'sample-dental';

  IF clinic_id IS NOT NULL THEN
    FOR i IN 0..6 LOOP
      INSERT INTO metrics (clinic_id, source, pv_count, application_count, recorded_at)
      VALUES (
        clinic_id,
        'guppy',
        100 + (random() * 50)::INTEGER,  -- 100〜150のランダムPV
        (random() * 5)::INTEGER,          -- 0〜5のランダム応募数
        NOW() - (i || ' days')::INTERVAL
      );
    END LOOP;
  END IF;
END $$;
