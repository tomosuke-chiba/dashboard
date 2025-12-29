import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scrapeGuppy } from '@/lib/scraper';
import { sendDiscordNotification } from '@/lib/discord';
import { Clinic } from '@/types';

// Cronジョブまたは手動トリガーでスクレイピングを実行
export async function POST(request: NextRequest) {
  // 認証チェック（CRON_SECRETが設定されている場合のみ）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured', results: [] },
      { status: 503 }
    );
  }

  try {
    // 全クライアントを取得
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('*');

    if (clinicsError) {
      throw clinicsError;
    }

    const results = [];

    for (const clinic of (clinics || []) as Clinic[]) {
      // GUPPYのログイン情報がない場合はスキップ
      if (!clinic.guppy_login_id || !clinic.guppy_password) {
        results.push({
          clinic: clinic.name,
          success: false,
          error: 'GUPPY credentials not configured',
        });
        continue;
      }

      // 前回の応募数を取得
      const { data: prevMetrics } = await supabase
        .from('metrics')
        .select('application_count')
        .eq('clinic_id', clinic.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      const prevApplicationCount = prevMetrics?.application_count || 0;

      // GUPPYからデータをスクレイピング
      const scrapeResult = await scrapeGuppy(
        clinic.id,
        clinic.name,
        clinic.guppy_login_id,
        clinic.guppy_password
      );

      if (scrapeResult) {
        // メトリクスをデータベースに保存
        const { error: insertError } = await supabase.from('metrics').insert({
          clinic_id: clinic.id,
          pv_count: scrapeResult.totalPV,
          application_count: scrapeResult.totalApplications,
          recorded_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error(`Error inserting metrics for ${clinic.name}:`, insertError);
        }

        // 新規応募があればDiscordに通知
        if (scrapeResult.totalApplications > prevApplicationCount) {
          const newApplications = scrapeResult.totalApplications - prevApplicationCount;
          await sendDiscordNotification({
            clinicName: clinic.name,
            message: `${clinic.name}に新規応募が${newApplications}件ありました！`,
          });
        }

        results.push({
          clinic: clinic.name,
          pv: scrapeResult.totalPV,
          applications: scrapeResult.totalApplications,
          success: true,
        });
      } else {
        results.push({
          clinic: clinic.name,
          success: false,
          error: 'Scraping failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ヘルスチェック用
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
