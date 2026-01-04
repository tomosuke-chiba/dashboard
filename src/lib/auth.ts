/**
 * 認証ユーティリティ
 * Phase A: 認証基盤
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from './supabase';

// 定数
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-secret-key'
);
const COOKIE_NAME = 'clinic_auth_token';
const TOKEN_EXPIRY = '7d'; // 7日間有効

// 認証結果の型
export interface AuthResult {
  success: boolean;
  clinicId?: string;
  clinicSlug?: string;
  isAdmin?: boolean;
  error?: string;
}

// トークンペイロードの型
interface TokenPayload {
  clinicId: string;
  clinicSlug: string;
  isAdmin: boolean;
  exp: number;
}

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * JWTトークンを生成
 */
export async function generateToken(
  clinicId: string,
  clinicSlug: string,
  isAdmin: boolean = false
): Promise<string> {
  return new SignJWT({ clinicId, clinicSlug, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * JWTトークンを検証
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * クリニック別パスワードで認証
 */
export async function authenticateClinic(
  slug: string,
  password: string
): Promise<AuthResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  // 管理者パスワードチェック（全クリニックアクセス可能）
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && password === adminPassword) {
    // クリニック情報を取得
    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('id, slug')
      .eq('slug', slug)
      .single();

    if (error || !clinic) {
      return { success: false, error: 'Clinic not found' };
    }

    return {
      success: true,
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      isAdmin: true,
    };
  }

  // クリニック別パスワードチェック
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (clinicError || !clinic) {
    return { success: false, error: 'Clinic not found' };
  }

  const { data: auth, error: authError } = await supabase
    .from('clinic_auth')
    .select('password_hash')
    .eq('clinic_id', clinic.id)
    .single();

  if (authError || !auth) {
    // パスワード未設定の場合は認証失敗
    return { success: false, error: 'Password not set for this clinic' };
  }

  const isValid = await verifyPassword(password, auth.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid password' };
  }

  return {
    success: true,
    clinicId: clinic.id,
    clinicSlug: clinic.slug,
    isAdmin: false,
  };
}

/**
 * 認証Cookieを設定
 */
export async function setAuthCookie(
  clinicId: string,
  clinicSlug: string,
  isAdmin: boolean = false
): Promise<void> {
  const token = await generateToken(clinicId, clinicSlug, isAdmin);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7日間
    path: '/',
  });
}

/**
 * 認証Cookieを取得して検証
 */
export async function getAuthFromCookie(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { success: false, error: 'Invalid token' };
  }

  return {
    success: true,
    clinicId: payload.clinicId,
    clinicSlug: payload.clinicSlug,
    isAdmin: payload.isAdmin,
  };
}

/**
 * 認証Cookieを削除（ログアウト）
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * 特定のクリニックへのアクセス権を確認
 */
export async function checkClinicAccess(
  targetSlug: string
): Promise<AuthResult> {
  const auth = await getAuthFromCookie();

  if (!auth.success) {
    return auth;
  }

  // 管理者は全クリニックにアクセス可能
  if (auth.isAdmin) {
    return auth;
  }

  // 自分のクリニックのみアクセス可能
  if (auth.clinicSlug !== targetSlug) {
    return { success: false, error: 'Access denied' };
  }

  return auth;
}

/**
 * クリニックのパスワードを設定/更新（管理者専用）
 */
export async function setClinicPassword(
  clinicId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const passwordHash = await hashPassword(password);

  const { error } = await supabase
    .from('clinic_auth')
    .upsert(
      {
        clinic_id: clinicId,
        password_hash: passwordHash,
      },
      {
        onConflict: 'clinic_id',
      }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
