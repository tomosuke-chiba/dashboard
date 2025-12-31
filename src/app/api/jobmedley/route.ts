import { NextRequest, NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Clinic slug is required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const primarySelect = 'id, name, jobmedley_clinic_name, jobmedley_search_url';
    let clinicResult = await supabase
      .from('clinics')
      .select(primarySelect)
      .eq('slug', slug)
      .single();

    if (clinicResult.error && (clinicResult.error.code === '42703' || clinicResult.error.code === 'PGRST204')) {
      clinicResult = await supabase
        .from('clinics')
        .select('id, name')
        .eq('slug', slug)
        .single();
    }

    if (clinicResult.error) {
      if (clinicResult.error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Clinic not found' },
          { status: 404 }
        );
      }
      console.error('Failed to load clinic data:', clinicResult.error);
      return NextResponse.json(
        { error: 'Failed to load clinic data' },
        { status: 500 }
      );
    }

    const clinic = clinicResult.data;
    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : parseInt(formatInTimeZone(now, 'Asia/Tokyo', 'yyyy'), 10);
    const month = monthParam ? parseInt(monthParam, 10) : parseInt(formatInTimeZone(now, 'Asia/Tokyo', 'M'), 10);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data: analysisRow } = await supabase
      .from('jobmedley_analysis')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle();

    const { data: scoutRows } = await supabase
      .from('jobmedley_scouts')
      .select('*')
      .eq('clinic_id', clinic.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    const { data: rankRows } = await supabase
      .from('metrics')
      .select('search_rank, date')
      .eq('clinic_id', clinic.id)
      .eq('source', 'jobmedley')
      .is('job_type', null)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(1);

    const analysis = analysisRow ? {
      period: `${analysisRow.period_year}-${String(analysisRow.period_month).padStart(2, '0')}`,
      hireCount: analysisRow.hire_count,
      applicationCount: analysisRow.application_count,
      scoutApplicationCount: analysisRow.scout_application_count,
      pageViewCount: analysisRow.page_view_count,
    } : null;

    const dailyData = scoutRows?.map((row: { date: string; sent_count: number }) => ({
      date: row.date,
      sent_count: row.sent_count,
    })) || [];
    const totalSentCount = dailyData.reduce((sum: number, row: { sent_count: number }) => sum + row.sent_count, 0);
    const scout = {
      totalSentCount,
      dailyData,
    };
    const scoutRow = scoutRows?.[scoutRows.length - 1] || null;

    const rankRow = rankRows?.[0];
    const rank = rankRow ? {
      clinicName: ('jobmedley_clinic_name' in clinic ? (clinic as { jobmedley_clinic_name?: string | null }).jobmedley_clinic_name : null) || clinic.name,
      rank: rankRow.search_rank ?? null,
      searchUrl: ('jobmedley_search_url' in clinic ? (clinic as { jobmedley_search_url?: string | null }).jobmedley_search_url : null) || '',
      checkedAt: new Date(`${rankRow.date}T00:00:00+09:00`).toISOString(),
    } : null;

    const scrapedTimes = [
      analysisRow?.scraped_at,
      scoutRow?.scraped_at,
      rankRow?.date ? `${rankRow.date}T00:00:00+09:00` : null,
    ].filter(Boolean) as string[];

    const scrapedAt = scrapedTimes.length > 0
      ? new Date(scrapedTimes.sort().slice(-1)[0]).toISOString()
      : null;

    return NextResponse.json({
      analysis,
      scout,
      rank,
      scrapedAt,
    });
  } catch (error) {
    console.error('Error scraping JobMedley:', error);
    return NextResponse.json(
      { error: 'Failed to load JobMedley data' },
      { status: 500 }
    );
  }
}
