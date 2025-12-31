-- =============================================
-- Migration: Quacareer認証情報カラム追加
-- 実行日: 2025-12-31
-- =============================================

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS quacareer_login_id TEXT,
  ADD COLUMN IF NOT EXISTS quacareer_password TEXT;
