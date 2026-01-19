import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateSourceParameter } from '../source-validation';
import { applySourceFilter } from '../query-builder';
import type { DailyMetrics } from '@/types';

const dedupeMetricsByDate = (metrics: DailyMetrics[]): DailyMetrics[] => {
  const byKey = new Map<string, DailyMetrics>();

  for (const metric of metrics) {
    const key = `${metric.date}:${metric.job_type ?? 'all'}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, metric);
      continue;
    }

    const existingTime = Date.parse(existing.created_at || existing.updated_at || '');
    const currentTime = Date.parse(metric.created_at || metric.updated_at || '');

    if (!Number.isNaN(currentTime) && (Number.isNaN(existingTime) || currentTime > existingTime)) {
      byKey.set(key, metric);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    const jobTypeA = a.job_type ?? '';
    const jobTypeB = b.job_type ?? '';
    return jobTypeA.localeCompare(jobTypeB);
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // Format: YYYY-MM
  const jobType = searchParams.get('job_type'); // 'dr', 'dh', 'da', or null for all

  // source パラメータのバリデーション
  const sourceParam = searchParams.get('source');
  const sourceValidation = validateSourceParameter(sourceParam);

  if (!sourceValidation.valid) {
    return NextResponse.json({ error: sourceValidation.error }, { status: 400 });
  }

  const source = sourceValidation.source;

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // クライアント情報を取得
    const baseClinicColumns = 'id, name, slug';
    const profileClinicColumns = `${baseClinicColumns}, guppy_profile_completeness, guppy_independence_support, guppy_profile_updated_at, guppy_profile_scraped_at`;
    let { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select(profileClinicColumns)
      .eq('slug', slug)
      .single();

    if (clinicError && clinicError.message?.includes('guppy_profile_')) {
      const { data: fallbackClinic, error: fallbackError } = await supabase
        .from('clinics')
        .select(baseClinicColumns)
        .eq('slug', slug)
        .single();

      if (fallbackError || !fallbackClinic) {
        return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
      }

      clinic = {
        ...fallbackClinic,
        guppy_profile_completeness: null,
        guppy_independence_support: null,
        guppy_profile_updated_at: null,
        guppy_profile_scraped_at: null,
      };
      clinicError = null;
    }

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

    // 日別メトリクスを取得
    let metricsQuery = supabase
      .from('metrics')
      .select('*')
      .eq('clinic_id', clinic.id);

    if (startDate && endDate) {
      metricsQuery = metricsQuery.gte('date', startDate).lte('date', endDate);
    }

    // 職種フィルタリング
    // jobType指定あり → その職種のデータのみ
    // jobType指定なし → 合計データ（job_type = null）のみ
    if (jobType) {
      metricsQuery = metricsQuery.eq('job_type', jobType);
    } else {
      metricsQuery = metricsQuery.is('job_type', null);
    }

    metricsQuery = applySourceFilter(metricsQuery, source);

    const { data: metrics } = await metricsQuery.order('date', { ascending: true });
    const dedupedMetrics = dedupeMetricsByDate((metrics ?? []) as DailyMetrics[]);

    // スカウトメールデータを取得
    let scoutQuery = supabase
      .from('scout_messages')
      .select('*')
      .eq('clinic_id', clinic.id);

    if (startDate && endDate) {
      scoutQuery = scoutQuery.gte('date', startDate).lte('date', endDate);
    }

    scoutQuery = applySourceFilter(scoutQuery, source);

    const { data: scoutMessages } = await scoutQuery.order('date', { ascending: true });

    // Bitlyクリックデータを取得
    let bitlyQuery = supabase
      .from('bitly_clicks')
      .select('*')
      .eq('clinic_id', clinic.id);

    if (startDate && endDate) {
      bitlyQuery = bitlyQuery.gte('date', startDate).lte('date', endDate);
    }

    // bitly_clicks has no source column; keep clinic-level data.
    const { data: bitlyClicks } = await bitlyQuery.order('date', { ascending: true });

    // Bitlyリンク別クリックデータを取得
    let bitlyLinksQuery = supabase
      .from('bitly_links')
      .select(`
        id,
        bitlink,
        source,
        link_id,
        label,
        long_url
      `)
      .eq('clinic_id', clinic.id);

    bitlyLinksQuery = applySourceFilter(bitlyLinksQuery, source);

    const { data: bitlyLinks } = await bitlyLinksQuery;

    // リンク別のクリック数を取得
    let bitlyLinkClicksData: { bitly_link_id: string; source: string; link_id: string; label: string | null; total_clicks: number }[] = [];
    if (bitlyLinks && bitlyLinks.length > 0) {
      for (const link of bitlyLinks) {
        let linkClicksQuery = supabase
          .from('bitly_link_clicks')
          .select('click_count')
          .eq('bitly_link_id', link.id);

        if (startDate && endDate) {
          linkClicksQuery = linkClicksQuery.gte('date', startDate).lte('date', endDate);
        }

        const { data: linkClicks } = await linkClicksQuery;
        const totalClicks = (linkClicks || []).reduce((sum, c) => sum + c.click_count, 0);

        bitlyLinkClicksData.push({
          bitly_link_id: link.id,
          source: link.source,
          link_id: link.link_id,
          label: link.label,
          total_clicks: totalClicks,
        });
      }
    }

    // 選択月の合計を計算
    const totalDisplayCount = dedupedMetrics.reduce((sum, m) => sum + (m.display_count || 0), 0);
    const totalViewCount = dedupedMetrics.reduce((sum, m) => sum + (m.view_count || 0), 0);
    const totalRedirectCount = dedupedMetrics.reduce((sum, m) => sum + (m.redirect_count || 0), 0);
    const totalApplicationCount = dedupedMetrics.reduce((sum, m) => sum + (m.application_count || 0), 0);

    const viewRate = totalDisplayCount > 0 ? totalViewCount / totalDisplayCount : 0;
    const applicationRate = totalViewCount > 0 ? totalApplicationCount / totalViewCount : 0;

    const summary = {
      totalDisplayCount,
      totalViewCount,
      totalRedirectCount,
      totalApplicationCount,
      viewRate,
      applicationRate,
    };

    // 利用可能な月のリストを取得
    let availableMonthsQuery = supabase
      .from('metrics')
      .select('date')
      .eq('clinic_id', clinic.id);

    availableMonthsQuery = applySourceFilter(availableMonthsQuery, source);

    const { data: allDates } = await availableMonthsQuery.order('date', { ascending: false });

    const availableMonths = [...new Set(
      (allDates || []).map(d => d.date.substring(0, 7))
    )];

    return NextResponse.json({
      clinic,
      metrics: dedupedMetrics,
      summary,
      scoutMessages: scoutMessages || [],
      bitlyClicks: bitlyClicks || [],
      bitlyLinkClicks: bitlyLinkClicksData,
      availableMonths,
      currentMonth: month || availableMonths[0] || null,
    });
  } catch (error) {
    console.error('Error fetching clinic data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
