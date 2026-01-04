import { NextRequest, NextResponse } from 'next/server';
import { authenticateClinic, setAuthCookie } from '@/lib/auth';

/**
 * POST /api/auth/login
 * クリニック別パスワード認証
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, password } = body;

    if (!slug || !password) {
      return NextResponse.json(
        { error: 'Slug and password are required' },
        { status: 400 }
      );
    }

    const result = await authenticateClinic(slug, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 認証成功 - Cookieを設定
    await setAuthCookie(result.clinicId!, result.clinicSlug!, result.isAdmin);

    return NextResponse.json({
      success: true,
      clinicSlug: result.clinicSlug,
      isAdmin: result.isAdmin,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
