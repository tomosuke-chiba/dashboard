-- =============================================
-- Bitlyリンク別クリック数管理テーブル
-- 命名規則: bit.ly/{クリニックslug}-{媒体名}-{id}
-- 例: bit.ly/tsutani-guppy-001
-- =============================================

-- Bitlyリンク管理テーブル
CREATE TABLE IF NOT EXISTS bitly_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  bitlink TEXT NOT NULL,                     -- bit.ly/tsutani-guppy-001
  source TEXT NOT NULL,                      -- 'guppy', 'jobmedley', 'quacareer'
  link_id TEXT NOT NULL,                     -- '001', '002' など
  label TEXT,                                -- スカウト文面のラベル（任意）
  long_url TEXT,                             -- リダイレクト先URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bitlink)                            -- bitlinkはグローバルで一意
);

-- Bitlyリンク別クリックデータテーブル
CREATE TABLE IF NOT EXISTS bitly_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bitly_link_id UUID REFERENCES bitly_links(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bitly_link_id, date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_bitly_links_clinic_id ON bitly_links(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bitly_links_source ON bitly_links(source);
CREATE INDEX IF NOT EXISTS idx_bitly_link_clicks_bitly_link_id ON bitly_link_clicks(bitly_link_id);
CREATE INDEX IF NOT EXISTS idx_bitly_link_clicks_date ON bitly_link_clicks(date);

-- 更新トリガー
DROP TRIGGER IF EXISTS update_bitly_links_updated_at ON bitly_links;
CREATE TRIGGER update_bitly_links_updated_at
  BEFORE UPDATE ON bitly_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bitly_link_clicks_updated_at ON bitly_link_clicks;
CREATE TRIGGER update_bitly_link_clicks_updated_at
  BEFORE UPDATE ON bitly_link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS設定
ALTER TABLE bitly_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitly_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on bitly_links"
  ON bitly_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on bitly_link_clicks"
  ON bitly_link_clicks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous can read bitly_links"
  ON bitly_links
  FOR SELECT
  USING (true);

CREATE POLICY "Anonymous can read bitly_link_clicks"
  ON bitly_link_clicks
  FOR SELECT
  USING (true);