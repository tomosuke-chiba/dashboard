ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS jobmedley_clinic_name TEXT,
  ADD COLUMN IF NOT EXISTS jobmedley_search_url TEXT;
