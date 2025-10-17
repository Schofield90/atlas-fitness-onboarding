import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/landing-pages/[id]/metrics?days=7
 * Fetch aggregated analytics metrics for a landing page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId } = authUser;
    const pageId = params.id;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page ownership
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch daily metrics
    const { data: dailyMetrics, error: metricsError } = await supabase
      .from('analytics_page_metrics')
      .select('*')
      .eq('page_id', pageId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (metricsError) {
      throw metricsError;
    }

    // If no metrics exist yet, return zeros
    if (!dailyMetrics || dailyMetrics.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            totalSessions: 0,
            uniqueVisitors: 0,
            returningVisitors: 0,
            avgSessionDuration: 0,
            avgScrollDepth: 0,
            bounceRate: 0,
            exitRate: 0,
            totalClicks: 0,
            totalRageClicks: 0,
            avgClicksPerSession: 0,
            totalConversions: 0,
            conversionRate: 0,
            totalConversionValue: 0,
            desktopSessions: 0,
            mobileSessions: 0,
            tabletSessions: 0,
          },
          dateRange: {
            from: startDateStr,
            to: new Date().toISOString().split('T')[0],
            days: days,
          },
        },
      });
    }

    // Aggregate metrics across the date range
    const metrics = {
      totalSessions: 0,
      uniqueVisitors: 0,
      returningVisitors: 0,
      avgSessionDuration: 0,
      avgScrollDepth: 0,
      bounceRate: 0,
      exitRate: 0,
      totalClicks: 0,
      totalRageClicks: 0,
      avgClicksPerSession: 0,
      totalConversions: 0,
      conversionRate: 0,
      totalConversionValue: 0,
      desktopSessions: 0,
      mobileSessions: 0,
      tabletSessions: 0,
    };

    // Sum up daily metrics
    dailyMetrics.forEach((day: any) => {
      metrics.totalSessions += day.total_sessions || 0;
      metrics.uniqueVisitors += day.unique_visitors || 0;
      metrics.returningVisitors += day.returning_visitors || 0;
      metrics.totalClicks += day.total_clicks || 0;
      metrics.totalRageClicks += day.total_rage_clicks || 0;
      metrics.totalConversions += day.total_conversions || 0;
      metrics.totalConversionValue += parseFloat(day.total_conversion_value || 0);
      metrics.desktopSessions += day.desktop_sessions || 0;
      metrics.mobileSessions += day.mobile_sessions || 0;
      metrics.tabletSessions += day.tablet_sessions || 0;
    });

    // Calculate averages
    const daysCount = dailyMetrics.length;
    metrics.avgSessionDuration =
      dailyMetrics.reduce((sum: number, d: any) => sum + (d.avg_session_duration || 0), 0) / daysCount;
    metrics.avgScrollDepth =
      dailyMetrics.reduce((sum: number, d: any) => sum + (d.avg_scroll_depth || 0), 0) / daysCount;
    metrics.bounceRate =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.bounce_rate || 0), 0) / daysCount;
    metrics.exitRate =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.exit_rate || 0), 0) / daysCount;
    metrics.avgClicksPerSession =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.avg_clicks_per_session || 0), 0) / daysCount;

    // Calculate overall conversion rate
    metrics.conversionRate =
      metrics.totalSessions > 0
        ? (metrics.totalConversions / metrics.totalSessions) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        dateRange: {
          from: startDateStr,
          to: new Date().toISOString().split('T')[0],
          days: days,
        },
      },
    });
  } catch (error: any) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
