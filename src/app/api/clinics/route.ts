import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured', clinics: [] }, { status: 503 });
  }

  try {
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, name, slug, created_at')
      .order('name');

    if (clinicsError) throw clinicsError;

    const clinicsWithMetrics = await Promise.all(
      (clinics || []).map(async (clinic) => {
        // 全メトリクスを取得して合計を計算
        const { data: metrics } = await supabase
          .from('metrics')
          .select('display_count, view_count, redirect_count, application_count, date')
          .eq('clinic_id', clinic.id)
          .order('date', { ascending: false });

        const summary = (metrics || []).reduce(
          (acc, m) => ({
            totalDisplayCount: acc.totalDisplayCount + (m.display_count || 0),
            totalViewCount: acc.totalViewCount + (m.view_count || 0),
            totalRedirectCount: acc.totalRedirectCount + (m.redirect_count || 0),
            totalApplicationCount: acc.totalApplicationCount + (m.application_count || 0),
          }),
          { totalDisplayCount: 0, totalViewCount: 0, totalRedirectCount: 0, totalApplicationCount: 0 }
        );

        const latestDate = metrics?.[0]?.date || null;

        return {
          ...clinic,
          summary,
          latestDate,
        };
      })
    );

    return NextResponse.json({ clinics: clinicsWithMetrics });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return NextResponse.json({ error: 'Internal server error', clinics: [] }, { status: 500 });
  }
}
