import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scrapeGuppy } from '@/lib/scraper';
import { sendDiscordNotification } from '@/lib/discord';
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

      // スクレイピング実行
      const scrapeResult = await scrapeGuppy(
        clinic.id,
        clinic.name,
        clinic.guppy_login_id,
        clinic.guppy_password
      );

      if (scrapeResult) {
        // 日別データをUPSERT
        for (const log of scrapeResult.accessLogs) {
          const { error: upsertError } = await supabase
            .from('metrics')
            .upsert({
              clinic_id: clinic.id,
              date: log.date,
              display_count: log.displayCount,
              view_count: log.viewCount,
              redirect_count: log.redirectCount,
              application_count: log.applicationCount,
            }, {
              onConflict: 'clinic_id,date'
            });

          if (upsertError) {
            console.error(`Error upserting metrics for ${clinic.name} on ${log.date}:`, upsertError);
          }
        }

        // 新規応募があればDiscord通知
        const newTotalApplications = scrapeResult.accessLogs.reduce(
          (sum, log) => sum + log.applicationCount, 0
        );

        if (newTotalApplications > prevTotalApplications) {
          const newApplications = newTotalApplications - prevTotalApplications;
          await sendDiscordNotification({
            clinicName: clinic.name,
            message: `${clinic.name}に新規応募が${newApplications}件ありました！`,
          });
        }

        results.push({
          clinic: clinic.name,
          daysProcessed: scrapeResult.accessLogs.length,
          success: true,
        });
      } else {
        results.push({ clinic: clinic.name, success: false, error: 'Scraping failed' });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
