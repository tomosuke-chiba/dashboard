/**
 * JobMedley データベース保存処理
 * タスク 3.2: 日別メトリクスと求人マスタのUPSERT処理
 * Requirements: 1.4, 6.1, 6.2, 6.3
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  DailyMetricComplete,
  DailyScrapingResult,
  JobOfferSummary,
} from './jobmedley-scraper';

/**
 * 日別メトリクスをUPSERT
 * Requirements: 1.4, 6.1
 */
export async function upsertDailyMetrics(
  supabase: SupabaseClient,
  clinicId: string,
  metrics: DailyMetricComplete[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  for (const metric of metrics) {
    try {
      const { error } = await supabase
        .from('jobmedley_scouts')
        .upsert(
          {
            clinic_id: clinicId,
            date: metric.date,
            job_offer_id: metric.jobOfferId,
            sent_count: metric.sentCount,
            page_view_count: metric.pageViewCount,
            application_count_total: metric.applicationCountTotal,
            scout_application_count: metric.scoutApplicationCount,
            cum_scout_sent_count: metric.cumSentCount,
            search_rank: metric.searchRank,
            scraped_at: new Date().toISOString(),
          },
          {
            onConflict: 'clinic_id,job_offer_id,date',
          }
        );

      if (error) {
        errors.push(`Date ${metric.date}, JobOffer ${metric.jobOfferId}: ${error.message}`);
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push(`Date ${metric.date}, JobOffer ${metric.jobOfferId}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}

/**
 * 求人マスタをUPSERT
 * Requirements: 6.2
 */
export async function upsertJobOffers(
  supabase: SupabaseClient,
  clinicId: string,
  summaries: JobOfferSummary[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  for (const summary of summaries) {
    try {
      const { error } = await supabase
        .from('jobmedley_job_offers')
        .upsert(
          {
            clinic_id: clinicId,
            job_offer_id: summary.jobOfferId,
            name: summary.name,
            hire_count: summary.hireCount,
            application_count: summary.applicationCount,
            scout_application_count: summary.scoutApplicationCount,
            page_view_count: summary.pageViewCount,
            days_since_update: summary.daysSinceUpdate,
            photo_count: summary.photoCount,
            feature_tags: summary.featureTags,
            scout_sent_count: summary.scoutSentCount,
            scraped_at: new Date().toISOString(),
          },
          {
            onConflict: 'clinic_id,job_offer_id',
          }
        );

      if (error) {
        errors.push(`JobOffer ${summary.jobOfferId}: ${error.message}`);
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push(`JobOffer ${summary.jobOfferId}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}

/**
 * スクレイピング結果をデータベースに保存
 * Requirements: 1.4, 6.1, 6.2, 6.3
 */
export async function saveDailyScrapingResult(
  supabase: SupabaseClient,
  result: DailyScrapingResult
): Promise<{
  success: boolean;
  metricsCount: number;
  jobOffersCount: number;
  errors: string[];
}> {
  const allErrors: string[] = [];

  // 1. 日別メトリクスを保存
  console.log(`Saving ${result.dailyMetrics.length} daily metrics for clinic ${result.clinicId}...`);
  const metricsResult = await upsertDailyMetrics(
    supabase,
    result.clinicId,
    result.dailyMetrics
  );

  if (!metricsResult.success) {
    allErrors.push(...metricsResult.errors);
    console.error('Some daily metrics failed to save:', metricsResult.errors);
  }

  // 2. 求人マスタを保存
  console.log(`Saving ${result.summaries.length} job offer summaries for clinic ${result.clinicId}...`);
  const jobOffersResult = await upsertJobOffers(
    supabase,
    result.clinicId,
    result.summaries
  );

  if (!jobOffersResult.success) {
    allErrors.push(...jobOffersResult.errors);
    console.error('Some job offers failed to save:', jobOffersResult.errors);
  }

  console.log(`Save completed: ${metricsResult.count} metrics, ${jobOffersResult.count} job offers`);

  return {
    success: allErrors.length === 0,
    metricsCount: metricsResult.count,
    jobOffersCount: jobOffersResult.count,
    errors: allErrors,
  };
}

/**
 * 日別データを取得
 * Requirements: 10.1, 10.2, 10.3
 */
export async function getDailyMetrics(
  supabase: SupabaseClient,
  clinicId: string,
  year: number,
  month: number,
  jobOfferId?: string | null
): Promise<{
  date: string;
  jobOfferId: string | null;
  sentCount: number;
  cumSentCount: number;
  scoutApplicationCount: number;
  pageViewCount: number;
  applicationCountTotal: number;
  searchRank: number | null;
}[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  let query = supabase
    .from('jobmedley_scouts')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // job_offer_idでフィルタリング
  if (jobOfferId === null) {
    query = query.is('job_offer_id', null);
  } else if (jobOfferId) {
    query = query.eq('job_offer_id', jobOfferId);
  }
  // jobOfferIdがundefinedの場合は全データを返す

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily metrics:', error);
    return [];
  }

  return (data || []).map((row) => ({
    date: row.date,
    jobOfferId: row.job_offer_id,
    sentCount: row.sent_count || 0,
    cumSentCount: row.cum_scout_sent_count || 0,
    scoutApplicationCount: row.scout_application_count || 0,
    pageViewCount: row.page_view_count || 0,
    applicationCountTotal: row.application_count_total || 0,
    searchRank: row.search_rank,
  }));
}

/**
 * 求人リストを取得
 * Requirements: 10.1
 */
export async function getJobOffers(
  supabase: SupabaseClient,
  clinicId: string
): Promise<{ jobOfferId: string; name: string }[]> {
  const { data, error } = await supabase
    .from('jobmedley_job_offers')
    .select('job_offer_id, name')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching job offers:', error);
    return [];
  }

  return (data || []).map((row) => ({
    jobOfferId: row.job_offer_id,
    name: row.name,
  }));
}

/**
 * 求人サマリーを取得
 */
export async function getJobOfferSummary(
  supabase: SupabaseClient,
  clinicId: string,
  jobOfferId: string
): Promise<JobOfferSummary | null> {
  const { data, error } = await supabase
    .from('jobmedley_job_offers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('job_offer_id', jobOfferId)
    .single();

  if (error || !data) {
    console.error('Error fetching job offer summary:', error);
    return null;
  }

  let featureTags: string[] = [];
  const rawTags = (data as { feature_tags?: unknown }).feature_tags;

  if (Array.isArray(rawTags)) {
    featureTags = rawTags.filter((tag): tag is string => typeof tag === 'string');
  } else if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        featureTags = parsed.filter((tag: unknown): tag is string => typeof tag === 'string');
      }
    } catch {
      featureTags = [];
    }
  }

  return {
    jobOfferId: data.job_offer_id,
    name: data.name,
    hireCount: data.hire_count || 0,
    applicationCount: data.application_count || 0,
    scoutApplicationCount: data.scout_application_count || 0,
    pageViewCount: data.page_view_count || 0,
    daysSinceUpdate: data.days_since_update || 0,
    photoCount: data.photo_count || 0,
    featureTags,
    scoutSentCount: data.scout_sent_count || 0,
  };
}

/**
 * 求人重要指標を取得
 * Requirements: PROF-02
 */
export async function getJobOfferIndicators(
  supabase: SupabaseClient,
  clinicId: string,
  jobOfferId?: string
): Promise<{
  jobOfferId: string;
  name: string;
  hasSpeedReplyBadge: boolean;
  hasStaffVoice: boolean;
  hasWorkplaceInfo: boolean;
  photoCount: number;
  daysSinceUpdate: number | null;
  featureTags: string[];
  scrapedAt: string | null;
}[]> {
  let query = supabase
    .from('jobmedley_job_offers')
    .select('job_offer_id, name, has_speed_reply_badge, has_staff_voice, has_workplace_info, photo_count, days_since_update, feature_tags, indicators_scraped_at')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });

  if (jobOfferId) {
    query = query.eq('job_offer_id', jobOfferId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching job offer indicators:', error);
    return [];
  }

  return (data || []).map((row) => {
    let featureTags: string[] = [];
    const rawTags = (row as { feature_tags?: unknown }).feature_tags;

    if (Array.isArray(rawTags)) {
      featureTags = rawTags.filter((tag): tag is string => typeof tag === 'string');
    } else if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          featureTags = parsed.filter((tag: unknown): tag is string => typeof tag === 'string');
        }
      } catch {
        featureTags = [];
      }
    }

    return {
      jobOfferId: row.job_offer_id,
      name: row.name,
      hasSpeedReplyBadge: !!row.has_speed_reply_badge,
      hasStaffVoice: !!row.has_staff_voice,
      hasWorkplaceInfo: !!row.has_workplace_info,
      photoCount: row.photo_count || 0,
      daysSinceUpdate: row.days_since_update ?? null,
      featureTags,
      scrapedAt: row.indicators_scraped_at || null,
    };
  });
}
