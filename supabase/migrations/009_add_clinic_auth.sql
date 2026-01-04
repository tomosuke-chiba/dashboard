-- 009: クリニック認証テーブル作成
-- Phase A: 認証基盤

-- clinic_auth テーブル作成
CREATE TABLE IF NOT EXISTS clinic_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_clinic_auth_clinic_id ON clinic_auth(clinic_id);

-- RLSを有効化
ALTER TABLE clinic_auth ENABLE ROW LEVEL SECURITY;

-- service_roleのみアクセス可能（セキュリティのため）
CREATE POLICY "Service role can manage clinic_auth"
  ON clinic_auth
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_clinic_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clinic_auth_updated_at
  BEFORE UPDATE ON clinic_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_clinic_auth_updated_at();

-- コメント追加
COMMENT ON TABLE clinic_auth IS 'クリニック別パスワード認証情報';
COMMENT ON COLUMN clinic_auth.password_hash IS 'bcryptでハッシュ化されたパスワード';
