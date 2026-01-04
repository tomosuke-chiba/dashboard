import { NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/auth';

/**
 * GET /api/auth/me
 * 現在の認証状態を取得
 */
export async function GET() {
  try {
    const auth = await getAuthFromCookie();

    if (!auth.success) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      clinicSlug: auth.clinicSlug,
      isAdmin: auth.isAdmin,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
