-- 011: スカウト文面・バナー管理テーブル
-- Phase C: スカウト文面・バナー管理

-- ============================================
-- 1. GUPPYスカウト文面テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS guppy_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  job_type TEXT,  -- 職種（dr, dh, da等）
  subject TEXT,  -- 件名
  body TEXT,  -- 本文
  link_cta_text TEXT,  -- Bitlyリンク前の訴求文
  used_from DATE,  -- 使用開始日
  used_to DATE,  -- 使用終了日
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_guppy_scout_templates_clinic_id ON guppy_scout_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_guppy_scout_templates_is_active ON guppy_scout_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_guppy_scout_templates_job_type ON guppy_scout_templates(job_type);

-- ============================================
-- 2. ジョブメドレースカウト文面テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS jobmedley_scout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  job_offer_id TEXT,  -- 求人ID（求人ごとに異なる文面を設定可能）
  first_sentence TEXT,  -- 1文目（最も重要）
  body TEXT,  -- 本文
  target_criteria TEXT,  -- 対象条件（例：「経験3年以上」）
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_jobmedley_scout_templates_clinic_id ON jobmedley_scout_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_jobmedley_scout_templates_is_active ON jobmedley_scout_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_jobmedley_scout_templates_job_offer_id ON jobmedley_scout_templates(job_offer_id);

-- ============================================
-- 3. バナー管理テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('guppy', 'jobmedley')),
  banner_name TEXT NOT NULL,
  image_url TEXT,  -- バナー画像URL
  copy_text TEXT,  -- バナーに対応する文言・コピー
  description TEXT,  -- 説明・メモ
  used_from DATE,
  used_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_banners_clinic_id ON banners(clinic_id);
CREATE INDEX IF NOT EXISTS idx_banners_source ON banners(source);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

-- ============================================
-- 4. quacareer_scout_mails テーブル拡張
-- ============================================
-- 既存テーブルへのカラム追加
DO $$
BEGIN
  -- subject カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quacareer_scout_mails' AND column_name = 'subject'
  ) THEN
    ALTER TABLE quacareer_scout_mails ADD COLUMN subject TEXT;
  END IF;

  -- first_sentence カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quacareer_scout_mails' AND column_name = 'first_sentence'
  ) THEN
    ALTER TABLE quacareer_scout_mails ADD COLUMN first_sentence TEXT;
  END IF;

  -- sent_time カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quacareer_scout_mails' AND column_name = 'sent_time'
  ) THEN
    ALTER TABLE quacareer_scout_mails ADD COLUMN sent_time TIME;
  END IF;

  -- is_scout_plus カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quacareer_scout_mails' AND column_name = 'is_scout_plus'
  ) THEN
    ALTER TABLE quacareer_scout_mails ADD COLUMN is_scout_plus BOOLEAN DEFAULT false;
  END IF;

  -- application_count カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quacareer_scout_mails' AND column_name = 'application_count'
  ) THEN
    ALTER TABLE quacareer_scout_mails ADD COLUMN application_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 5. RLSポリシー
-- ============================================
ALTER TABLE guppy_scout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobmedley_scout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage guppy_scout_templates"
  ON guppy_scout_templates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage jobmedley_scout_templates"
  ON jobmedley_scout_templates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage banners"
  ON banners FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 6. updated_at 自動更新トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_guppy_scout_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guppy_scout_templates_updated_at
  BEFORE UPDATE ON guppy_scout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_guppy_scout_templates_updated_at();

CREATE OR REPLACE FUNCTION update_jobmedley_scout_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_jobmedley_scout_templates_updated_at
  BEFORE UPDATE ON jobmedley_scout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_jobmedley_scout_templates_updated_at();

CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

-- ============================================
-- 7. コメント
-- ============================================
COMMENT ON TABLE guppy_scout_templates IS 'GUPPYスカウト文面テンプレート';
COMMENT ON COLUMN guppy_scout_templates.template_name IS 'テンプレート名（例：「夏季キャンペーン用」）';
COMMENT ON COLUMN guppy_scout_templates.job_type IS '対象職種（dr, dh, da等）';
COMMENT ON COLUMN guppy_scout_templates.subject IS 'スカウトメール件名';
COMMENT ON COLUMN guppy_scout_templates.body IS 'スカウトメール本文';
COMMENT ON COLUMN guppy_scout_templates.link_cta_text IS 'Bitlyリンク前の訴求文（例：「詳細はこちら」）';

COMMENT ON TABLE jobmedley_scout_templates IS 'ジョブメドレースカウト文面テンプレート';
COMMENT ON COLUMN jobmedley_scout_templates.template_name IS 'テンプレート名';
COMMENT ON COLUMN jobmedley_scout_templates.job_offer_id IS '紐づく求人ID（任意）';
COMMENT ON COLUMN jobmedley_scout_templates.first_sentence IS '1文目（最も重要、プレビューに表示される）';
COMMENT ON COLUMN jobmedley_scout_templates.body IS '本文';
COMMENT ON COLUMN jobmedley_scout_templates.target_criteria IS '対象条件（例：「経験3年以上の歯科衛生士」）';

COMMENT ON TABLE banners IS 'バナー管理（GUPPY/ジョブメドレー）';
COMMENT ON COLUMN banners.source IS '媒体（guppy, jobmedley）';
COMMENT ON COLUMN banners.banner_name IS 'バナー識別名（例：「メインバナーv2」）';
COMMENT ON COLUMN banners.image_url IS 'バナー画像URL';
COMMENT ON COLUMN banners.copy_text IS 'バナーに対応するコピー・文言';
COMMENT ON COLUMN banners.description IS '説明・メモ';
