import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ManualInputEntry, Source } from '@/types';

const VALID_SOURCES: Source[] = ['guppy', 'jobmedley', 'quacareer'];

// 日付フォーマット検証（YYYY-MM-DD）
function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateStr);
}

// 未来日チェック
function isFutureDate(dateStr: string): boolean {
  const inputDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate > today;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { clinic_id, source, entries } = body as {
      clinic_id: string;
      source: string;
      entries: ManualInputEntry[];
    };

    // clinic_id検証
    if (!clinic_id) {
      return NextResponse.json(
        { error: 'clinic_id is required' },
        { status: 400 }
      );
    }

    // source検証
    if (!source) {
      return NextResponse.json(
        { error: 'source is required' },
        { status: 400 }
      );
    }

    if (!VALID_SOURCES.includes(source as Source)) {
      return NextResponse.json(
        { error: `Invalid source: ${source}. Must be one of ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }

    // entries検証
    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'entries must be an array' },
        { status: 400 }
      );
    }

    // 各entryの検証
    for (const entry of entries) {
      // 日付フォーマット検証
      if (!isValidDateFormat(entry.date)) {
        return NextResponse.json(
          { error: `Invalid date format: ${entry.date}. Must be YYYY-MM-DD` },
          { status: 400 }
        );
      }

      // 未来日検証
      if (isFutureDate(entry.date)) {
        return NextResponse.json(
          { error: `Future dates are not allowed: ${entry.date}` },
          { status: 400 }
        );
      }

      // 負数検証
      if (entry.scout_reply_count < 0 || entry.interview_count < 0) {
        return NextResponse.json(
          { error: 'Negative values are not allowed' },
          { status: 400 }
        );
      }

      // 整数検証
      if (!Number.isInteger(entry.scout_reply_count) || !Number.isInteger(entry.interview_count)) {
        return NextResponse.json(
          { error: 'Non-integer values are not allowed' },
          { status: 400 }
        );
      }
    }

    // クリニック存在確認
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinic_id)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // 日別データをupsert
    const upsertData = entries.map((entry) => ({
      clinic_id,
      date: entry.date,
      source,
      job_type: null, // 手動入力では職種別集計なし
      display_count: 0,
      view_count: 0,
      redirect_count: 0,
      application_count: 0,
      scout_reply_count: entry.scout_reply_count,
      interview_count: entry.interview_count,
      updated_at: new Date().toISOString(),
    }));

    if (upsertData.length > 0) {
      const { error: upsertError } = await supabase
        .from('metrics')
        .upsert(upsertData, {
          onConflict: 'clinic_id,date,source,job_type',
        });

      if (upsertError) {
        console.error('Failed to upsert metrics data:', upsertError);
        return NextResponse.json(
          { error: 'Failed to save metrics data' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: upsertData.length });
  } catch (error) {
    console.error('Error saving metrics data:', error);
    return NextResponse.json(
      { error: 'Failed to save metrics data' },
      { status: 500 }
    );
  }
}
