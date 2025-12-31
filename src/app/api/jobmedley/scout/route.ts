import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface ScoutEntry {
  date: string;
  sent_count: number;
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
    const { clinic_id, entries } = body as { clinic_id: string; entries: ScoutEntry[] };

    if (!clinic_id) {
      return NextResponse.json(
        { error: 'clinic_id is required' },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'entries must be an array' },
        { status: 400 }
      );
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
      sent_count: entry.sent_count,
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (upsertData.length > 0) {
      const { error: upsertError } = await supabase
        .from('jobmedley_scouts')
        .upsert(upsertData, {
          onConflict: 'clinic_id,date',
        });

      if (upsertError) {
        console.error('Failed to upsert scout data:', upsertError);
        return NextResponse.json(
          { error: 'Failed to save scout data' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: upsertData.length });
  } catch (error) {
    console.error('Error saving scout data:', error);
    return NextResponse.json(
      { error: 'Failed to save scout data' },
      { status: 500 }
    );
  }
}
