ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS jobmedley_login_id TEXT,
  ADD COLUMN IF NOT EXISTS jobmedley_password TEXT;
