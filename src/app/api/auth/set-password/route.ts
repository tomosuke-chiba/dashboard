import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie, setClinicPassword } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/auth/set-password
 * クリニックのパスワードを設定（管理者専用）
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者認証チェック
    const auth = await getAuthFromCookie();
    if (!auth.success || !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clinicId, clinicSlug, password } = body;

    if (!password || (!clinicId && !clinicSlug)) {
      return NextResponse.json(
        { error: 'clinicId or clinicSlug and password are required' },
        { status: 400 }
      );
    }

    let targetClinicId = clinicId;

    // slugからclinicIdを取得
    if (!targetClinicId && clinicSlug) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 503 }
        );
      }

      const { data: clinic, error } = await supabase
        .from('clinics')
        .select('id')
        .eq('slug', clinicSlug)
        .single();

      if (error || !clinic) {
        return NextResponse.json(
          { error: 'Clinic not found' },
          { status: 404 }
        );
      }

      targetClinicId = clinic.id;
    }

    const result = await setClinicPassword(targetClinicId, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to set password' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
