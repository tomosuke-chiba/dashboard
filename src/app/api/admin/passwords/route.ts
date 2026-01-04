import { NextRequest, NextResponse } from 'next/server';
import { setClinicPassword } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/passwords
 * パスワード設定状況一覧取得
 */
export async function GET() {
  // 管理者認証チェック（一時的に無効化）
  // const auth = await getAuthFromCookie();
  // if (!auth.success || !auth.isAdmin) {
  //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  // }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // クリニック一覧取得
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, name, slug')
      .order('name');

    if (clinicsError) throw clinicsError;

    // パスワード設定状況を結合
    const clinicsWithStatus = await Promise.all(
      (clinics || []).map(async (clinic) => {
        const { data: authData } = await supabase
          .from('clinic_auth')
          .select('updated_at')
          .eq('clinic_id', clinic.id)
          .single();

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          hasPassword: !!authData,
          passwordUpdatedAt: authData?.updated_at || null,
        };
      })
    );

    return NextResponse.json({ clinics: clinicsWithStatus });
  } catch (error) {
    console.error('Password status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/passwords
 * パスワード設定/更新
 */
export async function POST(request: NextRequest) {
  // 管理者認証チェック（一時的に無効化）
  // const auth = await getAuthFromCookie();
  // if (!auth.success || !auth.isAdmin) {
  //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  // }

  try {
    const { clinicId, password } = await request.json();

    // バリデーション
    if (!clinicId || !password) {
      return NextResponse.json(
        { error: 'clinicId and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // パスワード設定
    const result = await setClinicPassword(clinicId, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
