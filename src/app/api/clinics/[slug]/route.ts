import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // Format: YYYY-MM

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // クライアント情報を取得
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // 月別フィルタリング用の日付範囲を計算
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      endDate = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`;
    }

    // 日別メトリクスを取得（日付降順 = 最新が上）
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('clinic_id', clinic.id);

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: metrics } = await query.order('date', { ascending: true });

    // 選択月の合計を計算
    const summary = (metrics || []).reduce(
      (acc, m) => ({
        totalDisplayCount: acc.totalDisplayCount + (m.display_count || 0),
        totalViewCount: acc.totalViewCount + (m.view_count || 0),
        totalRedirectCount: acc.totalRedirectCount + (m.redirect_count || 0),
        totalApplicationCount: acc.totalApplicationCount + (m.application_count || 0),
      }),
      { totalDisplayCount: 0, totalViewCount: 0, totalRedirectCount: 0, totalApplicationCount: 0 }
    );

    // 利用可能な月のリストを取得
    const { data: allDates } = await supabase
      .from('metrics')
      .select('date')
      .eq('clinic_id', clinic.id)
      .order('date', { ascending: false });

    const availableMonths = [...new Set(
      (allDates || []).map(d => d.date.substring(0, 7))
    )];

    return NextResponse.json({
      clinic,
      metrics: metrics || [],
      summary,
      availableMonths,
      currentMonth: month || availableMonths[0] || null,
    });
  } catch (error) {
    console.error('Error fetching clinic data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
