-- 010: 目標採用人数と採用決定記録テーブル
-- Phase B: 目標採用人数管理

-- recruitment_goals テーブル（目標採用人数）
CREATE TABLE IF NOT EXISTS recruitment_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_duration_months INTEGER DEFAULT 12,
  job_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, job_type)
);

-- hires テーブル（採用決定記録）
CREATE TABLE IF NOT EXISTS hires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  hire_date DATE NOT NULL,
  job_type TEXT NOT NULL,
  source TEXT NOT NULL,
  channel TEXT,
  name TEXT,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_recruitment_goals_clinic_id ON recruitment_goals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_goals_job_type ON recruitment_goals(job_type);
CREATE INDEX IF NOT EXISTS idx_hires_clinic_id ON hires(clinic_id);
CREATE INDEX IF NOT EXISTS idx_hires_hire_date ON hires(hire_date);
CREATE INDEX IF NOT EXISTS idx_hires_job_type ON hires(job_type);

-- RLSを有効化
ALTER TABLE recruitment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hires ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（service_roleのみ）
CREATE POLICY "Service role can manage recruitment_goals"
  ON recruitment_goals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage hires"
  ON hires
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_recruitment_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recruitment_goals_updated_at
  BEFORE UPDATE ON recruitment_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_recruitment_goals_updated_at();

CREATE OR REPLACE FUNCTION update_hires_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hires_updated_at
  BEFORE UPDATE ON hires
  FOR EACH ROW
  EXECUTE FUNCTION update_hires_updated_at();

-- 採用決定時にcurrent_countを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_goal_current_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE recruitment_goals
    SET current_count = current_count + 1
    WHERE clinic_id = NEW.clinic_id AND job_type = NEW.job_type;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE recruitment_goals
    SET current_count = GREATEST(0, current_count - 1)
    WHERE clinic_id = OLD.clinic_id AND job_type = OLD.job_type;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_on_hire
  AFTER INSERT OR DELETE ON hires
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_count();

-- コメント追加
COMMENT ON TABLE recruitment_goals IS '目標採用人数（クリニック×職種）';
COMMENT ON TABLE hires IS '採用決定記録';
COMMENT ON COLUMN recruitment_goals.contract_start_date IS '契約開始日';
COMMENT ON COLUMN recruitment_goals.contract_duration_months IS '契約期間（月数）';
COMMENT ON COLUMN recruitment_goals.target_count IS '目標人数';
COMMENT ON COLUMN recruitment_goals.current_count IS '現在の採用人数（自動更新）';
COMMENT ON COLUMN hires.source IS '媒体（guppy, jobmedley, quacareer）';
COMMENT ON COLUMN hires.channel IS '経路（scout, application, direct）';
