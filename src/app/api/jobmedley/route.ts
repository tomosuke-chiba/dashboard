import { NextRequest, NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDailyMetrics, getJobOffers, getJobOfferSummary, getJobOfferIndicators } from '@/lib/jobmedley-db';

/**
 * GET /api/jobmedley
 * 日別データAPIエンドポイント
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');
  const slug = searchParams.get('slug');
  const jobOfferIdParam = searchParams.get('job_offer_id');

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
    // クリニック情報を取得
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

    // 年月の決定
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : parseInt(formatInTimeZone(now, 'Asia/Tokyo', 'yyyy'), 10);
    const month = monthParam ? parseInt(monthParam, 10) : parseInt(formatInTimeZone(now, 'Asia/Tokyo', 'M'), 10);

    // job_offer_id の解釈
    // - 未指定: 全求人合算（job_offer_id = null）
    // - "all": 全データ（フィルタなし）
    // - その他: 指定された求人ID
    const jobOfferId = jobOfferIdParam === 'all' ? undefined
      : jobOfferIdParam || null;

    // 日別メトリクスを取得
    const dailyMetricsRaw = await getDailyMetrics(supabase, clinic.id, year, month, jobOfferId);

    // 日別データをレスポンス形式に変換（8項目）
    const dailyData = dailyMetricsRaw.map((row) => {
      // 求人詳細ページ経由応募数 = 全応募 - スカウト経由応募
      const applicationCountJobPage = Math.max(0, row.applicationCountTotal - row.scoutApplicationCount);

      // スカウト応募率（分母0対策）
      const scoutApplicationRate = row.sentCount > 0
        ? row.scoutApplicationCount / row.sentCount
        : null;

      // 求人ページ経由応募率（分母0対策）
      const jobPageApplicationRate = row.pageViewCount > 0
        ? applicationCountJobPage / row.pageViewCount
        : null;

      return {
        date: row.date,
        scoutSentCount: row.sentCount,
        scoutApplicationCount: row.scoutApplicationCount,
        scoutApplicationRate,
        searchRank: row.searchRank,
        pageViewCount: row.pageViewCount,
        applicationCountJobPage,
        jobPageApplicationRate,
      };
    });

    // 求人リストを取得
    const jobOffers = await getJobOffers(supabase, clinic.id);

    // 求人サマリーを取得（job_offer_idが指定されている場合）
    let summary = null;
    if (jobOfferIdParam && jobOfferIdParam !== 'all') {
      summary = await getJobOfferSummary(supabase, clinic.id, jobOfferIdParam);
    }

    // 求人重要指標を取得（全件 or 指定求人）
    const indicatorFilter = jobOfferIdParam && jobOfferIdParam !== 'all' ? jobOfferIdParam : undefined;
    const indicators = await getJobOfferIndicators(supabase, clinic.id, indicatorFilter);

    // 最新のscraped_atを取得
    const { data: latestScout } = await supabase
      .from('jobmedley_scouts')
      .select('scraped_at')
      .eq('clinic_id', clinic.id)
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const scrapedAt = latestScout?.scraped_at || null;

    // 後方互換性のために既存のanalysis, scout, rankも返す
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data: analysisRow } = await supabase
      .from('jobmedley_analysis')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle();

    const analysis = analysisRow ? {
      period: `${analysisRow.period_year}-${String(analysisRow.period_month).padStart(2, '0')}`,
      hireCount: analysisRow.hire_count,
      applicationCount: analysisRow.application_count,
      scoutApplicationCount: analysisRow.scout_application_count,
      pageViewCount: analysisRow.page_view_count,
    } : null;

    // スカウト合計
    const totalSentCount = dailyData.reduce((sum, row) => sum + row.scoutSentCount, 0);
    const scout = {
      totalSentCount,
      dailyData: dailyData.map(d => ({
        date: d.date,
        sent_count: d.scoutSentCount,
      })),
    };

    // 検索順位（最新）
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

    const rankRow = rankRows?.[0];
    const rank = rankRow ? {
      clinicName: ('jobmedley_clinic_name' in clinic ? (clinic as { jobmedley_clinic_name?: string | null }).jobmedley_clinic_name : null) || clinic.name,
      rank: rankRow.search_rank ?? null,
      searchUrl: ('jobmedley_search_url' in clinic ? (clinic as { jobmedley_search_url?: string | null }).jobmedley_search_url : null) || '',
      checkedAt: new Date(`${rankRow.date}T00:00:00+09:00`).toISOString(),
    } : null;

    return NextResponse.json({
      // 新規: 日別データ（8項目対応）
      dailyData,
      summary,
      jobOffers,
      indicators,
      // 後方互換
      analysis,
      scout,
      rank,
      scrapedAt,
    });
  } catch (error) {
    console.error('Error fetching JobMedley data:', error);
    return NextResponse.json(
      { error: 'Failed to load JobMedley data' },
      { status: 500 }
    );
  }
}
