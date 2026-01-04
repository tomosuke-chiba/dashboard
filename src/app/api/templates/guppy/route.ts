import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookie } from '@/lib/auth';
import {
  getGuppyScoutTemplates,
  createGuppyScoutTemplate,
  updateGuppyScoutTemplate,
  deleteGuppyScoutTemplate,
} from '@/lib/templates';

/**
 * GET /api/templates/guppy?slug=xxx
 * GUPPYスカウト文面一覧を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const activeOnly = searchParams.get('active_only') === 'true';
  const jobType = searchParams.get('job_type');

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

  const templates = await getGuppyScoutTemplates(supabase, clinic.id, {
    activeOnly,
    jobType: jobType as any,
  });

  return NextResponse.json({ templates });
}

/**
 * POST /api/templates/guppy
 * GUPPYスカウト文面を作成（管理者のみ）
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
    const { slug, templateName, jobType, subject, body: templateBody, linkCtaText, usedFrom, usedTo, isActive } = body;

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

    const result = await createGuppyScoutTemplate(supabase, clinic.id, {
      templateName,
      jobType,
      subject,
      body: templateBody,
      linkCtaText,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating GUPPY template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/templates/guppy
 * GUPPYスカウト文面を更新（管理者のみ）
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
    const { id, templateName, jobType, subject, body: templateBody, linkCtaText, usedFrom, usedTo, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const result = await updateGuppyScoutTemplate(supabase, id, {
      templateName,
      jobType,
      subject,
      body: templateBody,
      linkCtaText,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating GUPPY template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/guppy?id=xxx
 * GUPPYスカウト文面を削除（管理者のみ）
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

  const result = await deleteGuppyScoutTemplate(supabase, templateId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
