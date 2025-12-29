import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 特定クライアントのデータを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // クライアント情報を取得
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // 最新のメトリクスを取得
    const { data: latestMetrics } = await supabase
      .from('metrics')
      .select('pv_count, application_count, recorded_at')
      .eq('clinic_id', clinic.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // 過去1年分の履歴を取得（日別に集計）
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: history } = await supabase
      .from('metrics')
      .select('pv_count, application_count, recorded_at')
      .eq('clinic_id', clinic.id)
      .gte('recorded_at', oneYearAgo.toISOString())
      .order('recorded_at', { ascending: true });

    // 日別に集計（1日の最後のデータを使用）
    const dailyHistory = aggregateDailyMetrics(history || []);

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
      },
      currentMetrics: latestMetrics || {
        pv_count: 0,
        application_count: 0,
        recorded_at: null,
      },
      history: dailyHistory,
    });
  } catch (error) {
    console.error('Error fetching clinic data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface MetricsRecord {
  pv_count: number;
  application_count: number;
  recorded_at: string;
}

function aggregateDailyMetrics(metrics: MetricsRecord[]) {
  const dailyMap = new Map<string, MetricsRecord>();

  for (const metric of metrics) {
    const date = metric.recorded_at.split('T')[0];
    // 同じ日の最後のデータで上書き
    dailyMap.set(date, metric);
  }

  return Array.from(dailyMap.entries()).map(([date, metric]) => ({
    date,
    pv: metric.pv_count,
    applications: metric.application_count,
  }));
}
