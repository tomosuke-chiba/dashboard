import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getJobOffers } from '@/lib/jobmedley-db';

/**
 * GET /api/jobmedley/job-offers
 * 求人リストAPIエンドポイント
 * Requirements: 10.1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Clinic slug is required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // クリニック情報を取得
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (clinicError) {
      if (clinicError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Clinic not found' },
          { status: 404 }
        );
      }
      console.error('Failed to load clinic data:', clinicError);
      return NextResponse.json(
        { error: 'Failed to load clinic data' },
        { status: 500 }
      );
    }

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // 求人リストを取得
    const jobOffers = await getJobOffers(supabase, clinic.id);

    return NextResponse.json({
      jobOffers,
      clinicId: clinic.id,
      clinicName: clinic.name,
    });
  } catch (error) {
    console.error('Error fetching job offers:', error);
    return NextResponse.json(
      { error: 'Failed to load job offers' },
      { status: 500 }
    );
  }
}
