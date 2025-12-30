import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scrapeGuppyByJobType, scrapeGuppyScoutMessages } from '@/lib/scraper';
import { sendDiscordNotification, sendViewRateAlert, isViewRateAbnormal, calculateViewRate } from '@/lib/discord';
import { fetchAllClinicsBitlyClicks, fetchAndSaveBitlyLinkClicks } from '@/lib/bitly';
import { Clinic } from '@/types';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    for (const clinic of (clinics || []) as Clinic[]) {
      if (!clinic.guppy_login_id || !clinic.guppy_password) {
        results.push({ clinic: clinic.name, success: false, error: 'No credentials' });
        continue;
      }

      // 前回の応募数合計を取得
      const { data: prevMetrics } = await supabase
        .from('metrics')
        .select('application_count')
        .eq('clinic_id', clinic.id);

      const prevTotalApplications = (prevMetrics || []).reduce(
        (sum, m) => sum + (m.application_count || 0), 0
      );

      // スクレイピング実行（職種別データ取得）
      const scrapeResult = await scrapeGuppyByJobType(
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
        const scoutResult = await scrapeGuppyScoutMessages(
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

        results.push({
          clinic: clinic.name,
          daysProcessed: scrapeResult.accessLogs.length,
          scoutData: scoutResult ? { totalSent: scoutResult.totalSent, days: scoutResult.dailyData.length } : null,
          success: true,
        });
      } else {
        results.push({ clinic: clinic.name, success: false, error: 'Scraping failed' });
      }
    }

    // 閲覧率アラートを送信
    for (const alert of viewRateAlerts) {
      await sendViewRateAlert(alert);
    }

    // Bitlyクリック数を取得（従来の単一URL方式）
    const bitlyResults = await fetchAllClinicsBitlyClicks();

    // Bitlyリンク別クリック数を取得（命名規則ベースの自動検出）
    const bitlyLinkResults = await fetchAndSaveBitlyLinkClicks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
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