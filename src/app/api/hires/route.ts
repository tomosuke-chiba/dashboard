import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookie } from '@/lib/auth';
import { createHire, getHires, deleteHire } from '@/lib/goals';

/**
 * GET /api/hires?slug=xxx
 * 採用決定一覧を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const jobType = searchParams.get('job_type');
  const source = searchParams.get('source');
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  if (!slug) {
    return NextResponse.json({ error: 'Clinic slug is required' }, { status: 400 });
  }

  const auth = await getAuthFromCookie();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 自分のクリニックか管理者かチェック
  if (!auth.isAdmin && auth.clinicSlug !== slug) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // クリニックIDを取得
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .single();

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
  }

  const hires = await getHires(supabase, clinic.id, {
    jobType: jobType as any,
    source: source as any,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  return NextResponse.json({ hires });
}

/**
 * POST /api/hires
 * 採用決定を登録（管理者のみ）
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { slug, hireDate, jobType, source, channel, name, memo } = body;

    if (!slug || !hireDate || !jobType || !source) {
      return NextResponse.json(
        { error: 'slug, hireDate, jobType, and source are required' },
        { status: 400 }
      );
    }

    // クリニックIDを取得
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const result = await createHire(supabase, {
      clinicId: clinic.id,
      hireDate,
      jobType,
      source,
      channel,
      name,
      memo,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating hire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/hires?id=xxx
 * 採用決定を削除（管理者のみ）
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const hireId = searchParams.get('id');

  if (!hireId) {
    return NextResponse.json({ error: 'Hire ID is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await deleteHire(supabase, hireId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
