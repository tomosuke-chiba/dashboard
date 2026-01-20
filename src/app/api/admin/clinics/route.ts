import { NextRequest, NextResponse } from 'next/server';
// import { getAuthFromCookie } from '@/lib/auth'; // 認証無効化中
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/clinics
 * 管理者向け - 全クリニック一覧（KPIサマリー付き）
 */
export async function GET(request: NextRequest) {
  // 1. 管理者認証チェック（一時的に無効化）
  // const auth = await getAuthFromCookie();
  // if (!auth.success || !auth.isAdmin) {
  //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  // }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // 2. クエリパラメータ取得
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const month = searchParams.get('month') || getCurrentMonth();
  const [periodYear, periodMonth] = month.split('-').map((value) => Number(value));
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  try {
    // 3. クリニック一覧取得
    let query = supabase
      .from('clinics')
      .select('id, name, slug, created_at');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: clinics, error } = await query.order('name');
    if (error) throw error;

    // 4. 各クリニックのサマリーを取得
    const clinicsWithSummary = await Promise.all(
      (clinics || []).map(async (clinic) => {
        // メトリクス集計（GUPPY）
        const { data: guppyMetrics } = await supabase
          .from('metrics')
          .select('application_count, view_count, display_count, redirect_count, date, search_rank')
          .eq('clinic_id', clinic.id)
          .eq('source', 'guppy')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // JobMedley 日別メトリクス（PV/応募/送信/検索順位）
        const { data: jobmedleyDaily } = await supabase
          .from('jobmedley_scouts')
          .select('application_count_total, page_view_count, sent_count, search_rank, date')
          .eq('clinic_id', clinic.id)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // Quacareer メトリクス
        const { data: quacareerMetrics } = await supabase
          .from('metrics')
          .select('application_count, view_count, display_count, redirect_count, date, search_rank')
          .eq('clinic_id', clinic.id)
          .eq('source', 'quacareer')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // スカウト送信数（GUPPY/Quacareer）
        const { data: scoutMessages } = await supabase
          .from('scout_messages')
          .select('sent_count, source, date')
          .eq('clinic_id', clinic.id)
          .in('source', ['guppy', 'quacareer'])
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // 手動入力メトリクス（返信/面接）
        const { data: manualMetrics } = await supabase
          .from('metrics')
          .select('scout_reply_count, interview_count, date')
          .eq('clinic_id', clinic.id)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // JobMedley 採用決定数（月次）
        const { data: jobmedleyAnalysis } = await supabase
          .from('jobmedley_analysis')
          .select('hire_count')
          .eq('clinic_id', clinic.id)
          .eq('period_year', periodYear)
          .eq('period_month', periodMonth)
          .maybeSingle();

        // メトリクス合計
        const guppySum = (guppyMetrics || []).reduce(
          (acc, m) => ({
            applicationCount: acc.applicationCount + (m.application_count || 0),
            viewCount: acc.viewCount + (m.view_count || 0),
            displayCount: acc.displayCount + (m.display_count || 0),
            redirectCount: acc.redirectCount + (m.redirect_count || 0),
          }),
          { applicationCount: 0, viewCount: 0, displayCount: 0, redirectCount: 0 }
        );

        const jobmedleySum = (jobmedleyDaily || []).reduce(
          (acc, m) => ({
            applicationCount: acc.applicationCount + (m.application_count_total || 0),
            viewCount: acc.viewCount + (m.page_view_count || 0),
            scoutSentCount: acc.scoutSentCount + (m.sent_count || 0),
          }),
          { applicationCount: 0, viewCount: 0, scoutSentCount: 0 }
        );

        const quacareerSum = (quacareerMetrics || []).reduce(
          (acc, m) => ({
            applicationCount: acc.applicationCount + (m.application_count || 0),
            viewCount: acc.viewCount + (m.view_count || 0),
          }),
          { applicationCount: 0, viewCount: 0 }
        );

        const scoutSentSum = (scoutMessages || []).reduce(
          (acc, m) => acc + (m.sent_count || 0),
          0
        );

        const totalScoutReplyCount = (manualMetrics || []).reduce(
          (acc, m) => acc + (m.scout_reply_count ?? 0),
          0
        );

        const totalInterviewCount = (manualMetrics || []).reduce(
          (acc, m) => acc + (m.interview_count ?? 0),
          0
        );

        const missingManualMetrics = !(manualMetrics || []).some(
          (m) => m.scout_reply_count !== null || m.interview_count !== null
        );

        const searchRanks = {
          guppy: getLatestSearchRank(guppyMetrics || []),
          jobmedley: getLatestSearchRank(jobmedleyDaily || []),
          quacareer: getLatestSearchRank(quacareerMetrics || []),
        };

        const totalHireCount = jobmedleyAnalysis?.hire_count || 0;

        const metricsSummary = {
          totalApplicationCount:
            guppySum.applicationCount +
            jobmedleySum.applicationCount +
            quacareerSum.applicationCount,
          totalViewCount:
            guppySum.viewCount +
            jobmedleySum.viewCount +
            quacareerSum.viewCount,
          totalDisplayCount: guppySum.displayCount,
          totalRedirectCount: guppySum.redirectCount,
          totalScoutSentCount: scoutSentSum + jobmedleySum.scoutSentCount,
          totalScoutReplyCount: missingManualMetrics ? null : totalScoutReplyCount,
          totalInterviewCount: missingManualMetrics ? null : totalInterviewCount,
          totalHireCount,
          missingManualMetrics,
          searchRanks,
        };

        // 目標進捗取得
        const { data: goals } = await supabase
          .from('recruitment_goals')
          .select('target_count, current_count')
          .eq('clinic_id', clinic.id);

        let goalProgress = null;
        if (goals && goals.length > 0) {
          const totalTarget = goals.reduce((sum, g) => sum + g.target_count, 0);
          const totalCurrent = goals.reduce((sum, g) => sum + g.current_count, 0);
          goalProgress = {
            totalTargetCount: totalTarget,
            totalCurrentCount: totalCurrent,
            progressRate: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
            isOnTrack: totalTarget > 0 ? totalCurrent / totalTarget >= 0.5 : true,
          };
        }

        // パスワード設定確認
        const { data: authData } = await supabase
          .from('clinic_auth')
          .select('id')
          .eq('clinic_id', clinic.id)
          .single();

        // 最新データ日付
        const allDates = [
          ...(guppyMetrics || []).map((m) => m.date),
          ...(jobmedleyDaily || []).map((m) => m.date),
          ...(quacareerMetrics || []).map((m) => m.date),
          ...(manualMetrics || []).map((m) => m.date),
          ...(scoutMessages || []).map((m) => m.date),
        ].filter(Boolean);
        const latestDate = allDates.length > 0 ? allDates.sort().reverse()[0] : null;

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          createdAt: clinic.created_at,
          metrics: metricsSummary,
          goalProgress,
          hasPassword: !!authData,
          latestDataDate: latestDate,
        };
      })
    );

    return NextResponse.json({
      clinics: clinicsWithSummary,
      total: clinicsWithSummary.length,
    });
  } catch (error) {
    console.error('Admin clinics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLatestSearchRank<T extends { date: string; search_rank: number | null }>(
  rows: T[]
): number | null {
  if (rows.length === 0) return null;
  let latest = rows[0];
  for (const row of rows) {
    if (row.date > latest.date) {
      latest = row;
    }
  }
  return latest.search_rank ?? null;
}
