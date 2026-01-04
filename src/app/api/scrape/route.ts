import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatInTimeZone } from 'date-fns-tz';
import { scrapeGuppyByJobType, scrapeGuppyScoutMessages, scrapeGuppyProfile } from '@/lib/scraper';
import { scrapeAllJobOfferIndicators, scrapeJobMedley } from '@/lib/jobmedley-scraper';
import { scrapeQuacareer } from '@/lib/quacareer-scraper';
import { sendDiscordNotification, sendViewRateAlert, isViewRateAbnormal, calculateViewRate } from '@/lib/discord';
import { fetchAllClinicsBitlyClicks, fetchAndSaveBitlyLinkClicks } from '@/lib/bitly';
import { Clinic } from '@/types';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceParam = searchParams.get('source') || searchParams.get('sources');
  const sources = sourceParam
    ? sourceParam.split(',').map((source) => source.trim().toLowerCase()).filter(Boolean)
    : [];
  const shouldRunAll = sources.length === 0 || sources.includes('all');
  const runGuppy = shouldRunAll || sources.includes('guppy');
  const runJobmedley = shouldRunAll || sources.includes('jobmedley') || sources.includes('job-medley');
  const runQuacareer = shouldRunAll || sources.includes('quacareer');
  const runBitly = shouldRunAll || sources.includes('bitly');

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('*');

    if (clinicsError) throw clinicsError;

    const results = [];
    const viewRateAlerts = [];
    const jstDate = formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    const jstYear = parseInt(formatInTimeZone(new Date(), 'Asia/Tokyo', 'yyyy'), 10);
    const jstMonth = parseInt(formatInTimeZone(new Date(), 'Asia/Tokyo', 'M'), 10);

    for (const clinic of (clinics || []) as Clinic[]) {
      let scrapeResult: Awaited<ReturnType<typeof scrapeGuppyByJobType>> | null = null;
      let scoutResult: Awaited<ReturnType<typeof scrapeGuppyScoutMessages>> | null = null;
      let profileResult: Awaited<ReturnType<typeof scrapeGuppyProfile>> | null = null;
      let guppyStatus: { success: boolean; error?: string } = {
        success: false,
        error: runGuppy ? 'No credentials' : 'Skipped',
      };

      if (runGuppy && clinic.guppy_login_id && clinic.guppy_password) {
        guppyStatus = { success: false, error: 'Scraping failed' };

        // 前回の応募数合計を取得
        const { data: prevMetrics } = await supabase
          .from('metrics')
          .select('application_count')
          .eq('clinic_id', clinic.id);

        const prevTotalApplications = (prevMetrics || []).reduce(
          (sum, m) => sum + (m.application_count || 0), 0
        );

        // スクレイピング実行（職種別データ取得）
        scrapeResult = await scrapeGuppyByJobType(
          clinic.id,
          clinic.name,
          clinic.guppy_login_id,
          clinic.guppy_password
        );

        if (scrapeResult) {
          // 合計データをUPSERT（job_type = null）
          for (const log of scrapeResult.accessLogs) {
            const { error: upsertError } = await supabase
              .from('metrics')
              .upsert({
                clinic_id: clinic.id,
                date: log.date,
                source: 'guppy',
                job_type: null, // 合計値
                display_count: log.displayCount,
                view_count: log.viewCount,
                redirect_count: log.redirectCount,
                application_count: log.applicationCount,
              }, {
                onConflict: 'clinic_id,date,source,job_type'
              });

            if (upsertError) {
              console.error(`Error upserting metrics for ${clinic.name} on ${log.date}:`, upsertError);
            }

            // 閲覧率30%超チェック
            if (isViewRateAbnormal(log.displayCount, log.viewCount)) {
              const viewRate = calculateViewRate(log.displayCount, log.viewCount);
              viewRateAlerts.push({
                clinicId: clinic.id,
                clinicName: clinic.name,
                date: log.date,
                viewRate,
                displayCount: log.displayCount,
                viewCount: log.viewCount,
              });
            }
          }

          // 職種別データをUPSERT
          if (scrapeResult.jobTypeAccessLogs) {
            for (const jobTypeLog of scrapeResult.jobTypeAccessLogs) {
              for (const log of jobTypeLog.accessLogs) {
                const { error: upsertError } = await supabase
                  .from('metrics')
                  .upsert({
                    clinic_id: clinic.id,
                    date: log.date,
                    source: 'guppy',
                    job_type: jobTypeLog.jobType, // 職種別
                    display_count: log.displayCount,
                    view_count: log.viewCount,
                    redirect_count: log.redirectCount,
                    application_count: log.applicationCount,
                  }, {
                    onConflict: 'clinic_id,date,source,job_type'
                  });

                if (upsertError) {
                  console.error(`Error upserting job type metrics for ${clinic.name} (${jobTypeLog.jobType}) on ${log.date}:`, upsertError);
                }
              }
            }
          }

          // 新規応募があればDiscord通知
          const newTotalApplications = scrapeResult.accessLogs.reduce(
            (sum: number, log) => sum + log.applicationCount, 0
          );

          if (newTotalApplications > prevTotalApplications) {
            const newApplications = newTotalApplications - prevTotalApplications;
            await sendDiscordNotification({
              clinicName: clinic.name,
              message: `${clinic.name}に新規応募が${newApplications}件ありました！`,
            });
          }

          // スカウトメールデータ取得（日別）
          scoutResult = await scrapeGuppyScoutMessages(
            clinic.id,
            clinic.name,
            clinic.guppy_login_id,
            clinic.guppy_password
          );

          if (scoutResult && scoutResult.dailyData.length > 0) {
            // 日別データをUPSERT
            for (const dayData of scoutResult.dailyData) {
              const { error: scoutUpsertError } = await supabase
                .from('scout_messages')
                .upsert({
                  clinic_id: clinic.id,
                  date: dayData.date,
                  source: 'guppy',
                  sent_count: dayData.sentCount,
                  reply_count: dayData.replyCount,
                }, {
                  onConflict: 'clinic_id,date,source'
                });

              if (scoutUpsertError) {
                console.error(`Error upserting scout messages for ${clinic.name} on ${dayData.date}:`, scoutUpsertError);
              }
            }
          }

          // プロフィール情報取得
          profileResult = await scrapeGuppyProfile(
            clinic.id,
            clinic.name,
            clinic.guppy_login_id,
            clinic.guppy_password
          );

          if (profileResult) {
            const updateData: Record<string, unknown> = {
              guppy_profile_scraped_at: profileResult.scrapedAt.toISOString(),
              guppy_independence_support: profileResult.independenceSupport,
            };

            if (profileResult.completeness !== null) {
              updateData.guppy_profile_completeness = profileResult.completeness;
            }

            if (profileResult.updatedAt) {
              updateData.guppy_profile_updated_at = profileResult.updatedAt.toISOString();
            }

            const { error: profileError } = await supabase
              .from('clinics')
              .update(updateData)
              .eq('id', clinic.id);

            if (profileError) {
              console.error(`Error updating GUPPY profile for ${clinic.name}:`, profileError);
            }
          }

          guppyStatus = { success: true };
        }
      }

      const jobmedleyStatus: { success: boolean; error?: string } = {
        success: false,
        error: runJobmedley ? 'No credentials' : 'Skipped',
      };
      if (runJobmedley && clinic.jobmedley_login_id && clinic.jobmedley_password) {
        try {
          const jobmedleyResult = await scrapeJobMedley(
            clinic.jobmedley_login_id,
            clinic.jobmedley_password,
            jstYear,
            jstMonth,
            clinic.jobmedley_search_url || undefined,
            clinic.jobmedley_clinic_name || clinic.name
          );

          if (jobmedleyResult.analysis) {
            const { error: analysisError } = await supabase
              .from('jobmedley_analysis')
              .upsert({
                clinic_id: clinic.id,
                period_year: jstYear,
                period_month: jstMonth,
                hire_count: jobmedleyResult.analysis.hireCount,
                application_count: jobmedleyResult.analysis.applicationCount,
                scout_application_count: jobmedleyResult.analysis.scoutApplicationCount,
                page_view_count: jobmedleyResult.analysis.pageViewCount,
                scraped_at: jobmedleyResult.scrapedAt.toISOString(),
              }, {
                onConflict: 'clinic_id,period_year,period_month'
              });

            if (analysisError) {
              console.error(`Error upserting JobMedley analysis for ${clinic.name}:`, analysisError);
            }
          }

          // スカウト送信数は手入力に切替のため、自動保存を停止
          // if (jobmedleyResult.scout) {
          //   const { error: scoutError } = await supabase
          //     .from('jobmedley_scouts')
          //     .upsert({
          //       clinic_id: clinic.id,
          //       date: jstDate,
          //       sent_count: jobmedleyResult.scout.totalSentCount,
          //       scraped_at: jobmedleyResult.scrapedAt.toISOString(),
          //     }, {
          //       onConflict: 'clinic_id,date'
          //     });
          //
          //   if (scoutError) {
          //     console.error(`Error upserting JobMedley scout for ${clinic.name}:`, scoutError);
          //   }
          // }

          if (jobmedleyResult.rank) {
            const { error: rankError } = await supabase
              .from('metrics')
              .upsert({
                clinic_id: clinic.id,
                date: jstDate,
                source: 'jobmedley',
                job_type: null,
                search_rank: jobmedleyResult.rank.rank,
              }, {
                onConflict: 'clinic_id,date,source,job_type'
              });

            if (rankError) {
              console.error(`Error upserting JobMedley rank for ${clinic.name}:`, rankError);
            }
          }

          // 重要指標の取得・保存
          const indicatorsResult = await scrapeAllJobOfferIndicators(
            clinic.jobmedley_login_id,
            clinic.jobmedley_password
          );

          if (indicatorsResult && indicatorsResult.indicators.length > 0) {
            const indicatorRows = indicatorsResult.indicators.map((indicator) => ({
              clinic_id: clinic.id,
              job_offer_id: indicator.jobOfferId,
              name: indicator.name || `求人 ${indicator.jobOfferId}`,
              title: indicator.title,
              has_speed_reply_badge: indicator.hasSpeedReplyBadge,
              has_staff_voice: indicator.hasStaffVoice,
              has_workplace_info: indicator.hasWorkplaceInfo,
              main_photo_url: indicator.mainPhotoUrl,
              photo_count: indicator.photoCount,
              feature_tags: indicator.featureTags,
              days_since_update: indicator.daysSinceUpdate,
              last_updated_at: indicator.lastUpdatedAt ? indicator.lastUpdatedAt.toISOString() : null,
              indicators_scraped_at: indicator.scrapedAt.toISOString(),
            }));

            const { error: indicatorError } = await supabase
              .from('jobmedley_job_offers')
              .upsert(indicatorRows, {
                onConflict: 'clinic_id,job_offer_id',
              });

            if (indicatorError) {
              console.error(`Error upserting JobMedley indicators for ${clinic.name}:`, indicatorError);
            }
          }

          jobmedleyStatus.success = true;
          jobmedleyStatus.error = undefined;
        } catch (error) {
          console.error(`JobMedley scrape failed for ${clinic.name}:`, error);
          jobmedleyStatus.success = false;
          jobmedleyStatus.error = 'Scrape failed';
        }
      }

      const quacareerStatus: { success: boolean; error?: string } = {
        success: false,
        error: runQuacareer ? 'No credentials' : 'Skipped',
      };
      if (runQuacareer && clinic.quacareer_login_id && clinic.quacareer_password) {
        try {
          const quacareerResult = await scrapeQuacareer(
            clinic.quacareer_login_id,
            clinic.quacareer_password
          );

          if (quacareerResult.dashboard) {
            const { error: dashboardError } = await supabase
              .from('quacareer_dashboard')
              .upsert({
                clinic_id: clinic.id,
                date: jstDate,
                total_applicants: quacareerResult.dashboard.totalApplicants,
                favorites_dh: quacareerResult.dashboard.favoritesDH,
                favorites_dr: quacareerResult.dashboard.favoritesDR,
                scout_mail_open_rate: quacareerResult.dashboard.scoutMailOpenRate,
                scout_plus_open_rate: quacareerResult.dashboard.scoutPlusOpenRate,
                scraped_at: quacareerResult.scrapedAt.toISOString(),
              }, {
                onConflict: 'clinic_id,date'
              });

            if (dashboardError) {
              console.error(`Error upserting Quacareer dashboard for ${clinic.name}:`, dashboardError);
            }
          }

          const { error: deleteError } = await supabase
            .from('quacareer_scout_mails')
            .delete()
            .eq('clinic_id', clinic.id)
            .eq('scraped_date', jstDate);

          if (deleteError) {
            console.error(`Error clearing Quacareer scout mails for ${clinic.name}:`, deleteError);
          }

          if (quacareerResult.scoutMails.length > 0) {
            const { error: mailsError } = await supabase
              .from('quacareer_scout_mails')
              .insert(
                quacareerResult.scoutMails.map((mail) => ({
                  clinic_id: clinic.id,
                  scraped_date: jstDate,
                  delivery_date: mail.deliveryDate,
                  target_job_type: mail.targetJobType,
                  message: mail.message,
                  delivery_count: mail.deliveryCount,
                  open_rate: mail.openRate,
                  scraped_at: quacareerResult.scrapedAt.toISOString(),
                }))
              );

            if (mailsError) {
              console.error(`Error inserting Quacareer scout mails for ${clinic.name}:`, mailsError);
            }
          }

          quacareerStatus.success = true;
          quacareerStatus.error = undefined;
        } catch (error) {
          console.error(`Quacareer scrape failed for ${clinic.name}:`, error);
          quacareerStatus.success = false;
          quacareerStatus.error = 'Scrape failed';
        }
      }

      const targetedStatuses = [
        runGuppy ? guppyStatus : null,
        runJobmedley ? jobmedleyStatus : null,
        runQuacareer ? quacareerStatus : null,
      ].filter(Boolean) as { success: boolean; error?: string }[];
      const overallSuccess = targetedStatuses.some((status) => status.success);
      results.push({
        clinic: clinic.name,
        daysProcessed: scrapeResult ? scrapeResult.accessLogs.length : 0,
        scoutData: scoutResult ? {
          totalSent: scoutResult.totalSent,
          totalReply: scoutResult.totalReply,
          days: scoutResult.dailyData.length
        } : null,
        guppy: guppyStatus,
        jobmedley: jobmedleyStatus,
        quacareer: quacareerStatus,
        success: overallSuccess,
        error: overallSuccess ? undefined : (guppyStatus.error || jobmedleyStatus.error || quacareerStatus.error),
      });
    }

    // 閲覧率アラートを送信
    if (runGuppy) {
      for (const alert of viewRateAlerts) {
        await sendViewRateAlert(alert);
      }
    }

    let bitlyResults = null;
    let bitlyLinkResults = null;
    if (runBitly) {
      // Bitlyクリック数を取得（従来の単一URL方式）
      bitlyResults = await fetchAllClinicsBitlyClicks();

      // Bitlyリンク別クリック数を取得（命名規則ベースの自動検出）
      bitlyLinkResults = await fetchAndSaveBitlyLinkClicks();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sources: shouldRunAll ? ['all'] : sources,
      results,
      viewRateAlerts: viewRateAlerts.length,
      bitlyResults,
      bitlyLinkResults,
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
