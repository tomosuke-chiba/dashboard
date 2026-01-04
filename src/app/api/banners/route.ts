import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookie } from '@/lib/auth';
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '@/lib/templates';

/**
 * GET /api/banners?slug=xxx
 * バナー一覧を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const source = searchParams.get('source') as 'guppy' | 'jobmedley' | null;
  const activeOnly = searchParams.get('active_only') === 'true';

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

  const banners = await getBanners(supabase, clinic.id, {
    source: source || undefined,
    activeOnly,
  });

  return NextResponse.json({ banners });
}

/**
 * POST /api/banners
 * バナーを作成（管理者のみ）
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
    const { slug, source, bannerName, imageUrl, copyText, description, usedFrom, usedTo, isActive } = body;

    if (!slug || !source || !bannerName) {
      return NextResponse.json(
        { error: 'slug, source, and bannerName are required' },
        { status: 400 }
      );
    }

    if (source !== 'guppy' && source !== 'jobmedley') {
      return NextResponse.json(
        { error: 'source must be "guppy" or "jobmedley"' },
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

    const result = await createBanner(supabase, clinic.id, {
      source,
      bannerName,
      imageUrl,
      copyText,
      description,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/banners
 * バナーを更新（管理者のみ）
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
    const { id, source, bannerName, imageUrl, copyText, description, usedFrom, usedTo, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const result = await updateBanner(supabase, id, {
      source,
      bannerName,
      imageUrl,
      copyText,
      description,
      usedFrom,
      usedTo,
      isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/banners?id=xxx
 * バナーを削除（管理者のみ）
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const bannerId = searchParams.get('id');

  if (!bannerId) {
    return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await deleteBanner(supabase, bannerId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
