import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookie } from '@/lib/auth';
import { getGoalsWithProgress, upsertGoal, deleteGoal } from '@/lib/goals';

/**
 * GET /api/goals?slug=xxx
 * 目標一覧と進捗を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

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

  const progress = await getGoalsWithProgress(supabase, clinic.id);

  return NextResponse.json({ goals: progress });
}

/**
 * POST /api/goals
 * 目標を設定/更新（管理者のみ）
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
    const { slug, jobType, targetCount, contractStartDate, contractDurationMonths } = body;

    if (!slug || !jobType || targetCount === undefined || !contractStartDate) {
      return NextResponse.json(
        { error: 'slug, jobType, targetCount, and contractStartDate are required' },
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

    const result = await upsertGoal(supabase, clinic.id, {
      jobType,
      targetCount,
      contractStartDate,
      contractDurationMonths,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/goals?id=xxx
 * 目標を削除（管理者のみ）
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('id');

  if (!goalId) {
    return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await deleteGoal(supabase, goalId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
