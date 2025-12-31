import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    const { data: dashboardRows } = await supabase
      .from('quacareer_dashboard')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('date', { ascending: false })
      .limit(1);

    const dashboardRow = dashboardRows?.[0] || null;
    let scrapedDate = dashboardRow?.date || null;

    if (!scrapedDate) {
      const { data: mailDateRows } = await supabase
        .from('quacareer_scout_mails')
        .select('scraped_date')
        .eq('clinic_id', clinic.id)
        .order('scraped_date', { ascending: false })
        .limit(1);

      scrapedDate = mailDateRows?.[0]?.scraped_date || null;
    }

    const { data: scoutMailRows } = scrapedDate
      ? await supabase
          .from('quacareer_scout_mails')
          .select('*')
          .eq('clinic_id', clinic.id)
          .eq('scraped_date', scrapedDate)
          .order('delivery_date', { ascending: false })
      : { data: [] };

    const dashboard = dashboardRow ? {
      totalApplicants: dashboardRow.total_applicants,
      favoritesDH: dashboardRow.favorites_dh,
      favoritesDR: dashboardRow.favorites_dr,
      scoutMailOpenRate: dashboardRow.scout_mail_open_rate,
      scoutPlusOpenRate: dashboardRow.scout_plus_open_rate,
    } : null;

    const scoutMails = (scoutMailRows || []).map((mail) => ({
      deliveryDate: mail.delivery_date || '',
      targetJobType: mail.target_job_type || '',
      message: mail.message || '',
      deliveryCount: mail.delivery_count || 0,
      openRate: mail.open_rate || 0,
    }));

    const scrapedAt = dashboardRow?.scraped_at
      || scoutMailRows?.[0]?.scraped_at
      || null;

    return NextResponse.json({
      dashboard,
      scoutMails,
      scrapedAt,
    });
  } catch (error) {
    console.error('Error loading Quacareer:', error);
    return NextResponse.json(
      { error: 'Failed to load Quacareer data' },
      { status: 500 }
    );
  }
}
