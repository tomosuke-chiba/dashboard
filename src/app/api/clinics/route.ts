import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 全クライアント一覧を取得（社内管理用）
export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured', clinics: [] },
      { status: 503 }
    );
  }

  try {
    // クライアント一覧を取得
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, name, slug, created_at')
      .order('name');

    if (clinicsError) {
      throw clinicsError;
    }

    // 各クライアントの最新メトリクスを取得
    const clinicsWithMetrics = await Promise.all(
      (clinics || []).map(async (clinic) => {
        const { data: metrics } = await supabase
          .from('metrics')
          .select('pv_count, application_count, recorded_at')
          .eq('clinic_id', clinic.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...clinic,
          currentMetrics: metrics || {
            pv_count: 0,
            application_count: 0,
            recorded_at: null,
          },
        };
      })
    );

    return NextResponse.json({ clinics: clinicsWithMetrics });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return NextResponse.json(
      { error: 'Internal server error', clinics: [] },
      { status: 500 }
    );
  }
}
