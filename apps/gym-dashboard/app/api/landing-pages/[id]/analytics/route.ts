import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/landing-pages/[id]/analytics
 * Fetch analytics data for a landing page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId } = authUser;
    const pageId = params.id;

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page belongs to organization
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, clarity_project_id, clarity_enabled, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    if (!page.clarity_enabled || !page.clarity_project_id) {
      return NextResponse.json(
        {
          error: 'Analytics not enabled for this page',
          clarityEnabled: false
        },
        { status: 400 }
      );
    }

    // Get analytics data (last 30 days by default)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: analytics, error: analyticsError } = await supabase
      .from('page_analytics')
      .select('*')
      .eq('page_id', pageId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (analyticsError) {
      throw analyticsError;
    }

    // Get latest AI insights
    const { data: insights, error: insightsError } = await supabase
      .from('ai_page_insights')
      .select('*')
      .eq('page_id', pageId)
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insightsError && insightsError.code !== 'PGRST116') {
      throw insightsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        page: {
          id: page.id,
          name: page.name,
          clarityProjectId: page.clarity_project_id,
        },
        analytics: analytics || [],
        latestInsights: insights || null,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0],
          days,
        },
      },
    });
  } catch (error: any) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/landing-pages/[id]/analytics
 * Update analytics data (called by background job or manual refresh)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId } = authUser;
    const pageId = params.id;

    const { analytics, date } = await request.json();

    if (!analytics || !date) {
      return NextResponse.json(
        { error: 'Analytics data and date are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page belongs to organization
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Upsert analytics data
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('page_analytics')
      .upsert(
        {
          page_id: pageId,
          date,
          total_sessions: analytics.sessions || 0,
          avg_session_duration: analytics.avgDuration || 0,
          scroll_depth_avg: analytics.scrollDepth || 0,
          conversion_rate: analytics.conversionRate || 0,
          bounce_rate: analytics.bounceRate || 0,
          top_exit_percentage: analytics.topExitPercentage || 0,
          raw_data: analytics.rawData || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'page_id,date',
        }
      )
      .select()
      .single();

    if (analyticsError) {
      throw analyticsError;
    }

    // Update improvement tracking for key metrics
    await Promise.all([
      supabase.rpc('calculate_metric_improvement', {
        p_page_id: pageId,
        p_metric_name: 'conversion_rate',
        p_new_value: analytics.conversionRate || 0,
      }),
      supabase.rpc('calculate_metric_improvement', {
        p_page_id: pageId,
        p_metric_name: 'scroll_depth',
        p_new_value: analytics.scrollDepth || 0,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: analyticsData,
      message: 'Analytics data updated successfully',
    });
  } catch (error: any) {
    console.error('Analytics update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update analytics' },
      { status: 500 }
    );
  }
}
