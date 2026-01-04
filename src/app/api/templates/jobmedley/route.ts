import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookie } from '@/lib/auth';
import {
  getJobMedleyScoutTemplates,
  createJobMedleyScoutTemplate,
  updateJobMedleyScoutTemplate,
  deleteJobMedleyScoutTemplate,
} from '@/lib/templates';

/**
 * GET /api/templates/jobmedley?slug=xxx
 * ジョブメドレースカウト文面一覧を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const activeOnly = searchParams.get('active_only') === 'true';
  const jobOfferId = searchParams.get('job_offer_id');

  if (!slug) {
    return NextResponse.json({ error: 'Clinic slug is required' }, { status: 400 });
  }

  const auth = await getAuthFromCookie();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auth.isAdmin && auth.clinicSlug !== slug) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .single();

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
  }

  const templates = await getJobMedleyScoutTemplates(supabase, clinic.id, {
    activeOnly,
    jobOfferId: jobOfferId || undefined,
  });

  return NextResponse.json({ templates });
}

/**
 * POST /api/templates/jobmedley
 * ジョブメドレースカウト文面を作成（管理者のみ）
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
    const { slug, templateName, jobOfferId, firstSentence, body: templateBody, targetCriteria, usedFrom, usedTo, isActive } = body;

    if (!slug || !templateName) {
      return NextResponse.json(
        { error: 'slug and templateName are required' },
        { status: 400 }
      );
    }

    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const result = await createJobMedleyScoutTemplate(supabase, clinic.id, {
      templateName,
      jobOfferId,
      firstSentence,
      body: templateBody,
      targetCriteria,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating JobMedley template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/templates/jobmedley
 * ジョブメドレースカウト文面を更新（管理者のみ）
 */
export async function PUT(request: NextRequest) {
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
    const { id, templateName, jobOfferId, firstSentence, body: templateBody, targetCriteria, usedFrom, usedTo, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const result = await updateJobMedleyScoutTemplate(supabase, id, {
      templateName,
      jobOfferId,
      firstSentence,
      body: templateBody,
      targetCriteria,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating JobMedley template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/jobmedley?id=xxx
 * ジョブメドレースカウト文面を削除（管理者のみ）
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('id');

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await deleteJobMedleyScoutTemplate(supabase, templateId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
