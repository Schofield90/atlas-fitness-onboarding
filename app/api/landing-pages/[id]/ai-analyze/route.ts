import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/server';
import { createAILandingPageAnalyzer } from '@/lib/analytics/ai-landing-analyzer';
import type { LandingPageMetrics, PageContext } from '@/lib/analytics/ai-landing-analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // AI analysis can take time

/**
 * POST /api/landing-pages/[id]/ai-analyze
 * Trigger AI analysis of landing page analytics
 */
export async function POST(
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

    // Get page details
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, slug, organization_id, analytics_enabled')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    if (!page.analytics_enabled) {
      return NextResponse.json(
        { error: 'Analytics must be enabled for this page' },
        { status: 400 }
      );
    }

    // Get date range from request (default: last 7 days)
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch aggregated metrics
    const { data: dailyMetrics } = await supabase
      .from('analytics_page_metrics')
      .select('*')
      .eq('page_id', pageId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!dailyMetrics || dailyMetrics.length === 0) {
      return NextResponse.json(
        { error: 'No analytics data available yet. Please wait for data collection.' },
        { status: 400 }
      );
    }

    // Aggregate metrics across the date range
    const aggregatedMetrics: LandingPageMetrics = {
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
      topClickedElements: [],
      topExitElements: [],
      formStarts: 0,
      formCompletions: 0,
      formAbandonmentRate: 0,
    };

    // Sum up daily metrics
    dailyMetrics.forEach((day: any) => {
      aggregatedMetrics.totalSessions += day.total_sessions || 0;
      aggregatedMetrics.uniqueVisitors += day.unique_visitors || 0;
      aggregatedMetrics.returningVisitors += day.returning_visitors || 0;
      aggregatedMetrics.totalClicks += day.total_clicks || 0;
      aggregatedMetrics.totalRageClicks += day.total_rage_clicks || 0;
      aggregatedMetrics.totalConversions += day.total_conversions || 0;
      aggregatedMetrics.totalConversionValue += parseFloat(day.total_conversion_value || 0);
      aggregatedMetrics.desktopSessions += day.desktop_sessions || 0;
      aggregatedMetrics.mobileSessions += day.mobile_sessions || 0;
      aggregatedMetrics.tabletSessions += day.tablet_sessions || 0;
    });

    // Calculate averages
    const daysCount = dailyMetrics.length;
    aggregatedMetrics.avgSessionDuration =
      dailyMetrics.reduce((sum: number, d: any) => sum + (d.avg_session_duration || 0), 0) / daysCount;
    aggregatedMetrics.avgScrollDepth =
      dailyMetrics.reduce((sum: number, d: any) => sum + (d.avg_scroll_depth || 0), 0) / daysCount;
    aggregatedMetrics.bounceRate =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.bounce_rate || 0), 0) / daysCount;
    aggregatedMetrics.exitRate =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.exit_rate || 0), 0) / daysCount;
    aggregatedMetrics.avgClicksPerSession =
      dailyMetrics.reduce((sum: number, d: any) => sum + parseFloat(d.avg_clicks_per_session || 0), 0) / daysCount;
    aggregatedMetrics.conversionRate =
      aggregatedMetrics.totalSessions > 0
        ? (aggregatedMetrics.totalConversions / aggregatedMetrics.totalSessions) * 100
        : 0;

    // Get top clicked elements
    const { data: clickEvents } = await supabase
      .from('analytics_events')
      .select('element_selector, element_text')
      .eq('page_id', pageId)
      .eq('event_type', 'click')
      .gte('timestamp', startDate.toISOString())
      .not('element_selector', 'is', null);

    // Count clicks by element
    const elementClicks = new Map<string, { clicks: number; text?: string }>();
    clickEvents?.forEach((event: any) => {
      const existing = elementClicks.get(event.element_selector) || { clicks: 0 };
      existing.clicks += 1;
      if (event.element_text) existing.text = event.element_text;
      elementClicks.set(event.element_selector, existing);
    });

    aggregatedMetrics.topClickedElements = Array.from(elementClicks.entries())
      .map(([selector, data]) => ({ selector, clicks: data.clicks, text: data.text }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Get form metrics
    const { data: formEvents } = await supabase
      .from('analytics_events')
      .select('event_type')
      .eq('page_id', pageId)
      .in('event_type', ['form_field_change', 'form_submit'])
      .gte('timestamp', startDate.toISOString());

    const formStarts = formEvents?.filter((e: any) => e.event_type === 'form_field_change').length || 0;
    const formCompletions = formEvents?.filter((e: any) => e.event_type === 'form_submit').length || 0;

    aggregatedMetrics.formStarts = formStarts;
    aggregatedMetrics.formCompletions = formCompletions;
    aggregatedMetrics.formAbandonmentRate =
      formStarts > 0 ? ((formStarts - formCompletions) / formStarts) * 100 : 0;

    // Build page context
    const pageContext: PageContext = {
      pageName: page.name,
      pageUrl: `https://yourdomain.com/${page.slug}`, // TODO: Use actual domain
      industry: body.industry || 'fitness',
      pageType: body.pageType || 'landing',
      targetAction: body.targetAction || 'sign-up',
    };

    // Run AI analysis
    const aiAnalyzer = createAILandingPageAnalyzer();
    const analysis = await aiAnalyzer.analyzePage(aggregatedMetrics, pageContext);

    // Store insights in database
    const { data: storedInsights, error: insertError } = await supabase
      .from('analytics_ai_insights')
      .insert({
        page_id: pageId,
        analysis_date: new Date().toISOString().split('T')[0],
        issues: analysis.issues,
        summary: analysis.summary,
        overall_score: analysis.overallScore,
        priority_recommendations: analysis.priorityRecommendations,
        user_journey_insights: analysis.behavioralInsights,
        element_performance: analysis.elementPerformance,
        segment_analysis: analysis.segmentAnalysis,
        model_used: 'claude-sonnet-4-20250514',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store AI insights:', insertError);
    }

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        metrics: aggregatedMetrics,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0],
          days: days,
        },
        storedAt: storedInsights?.created_at,
      },
      message: 'AI analysis completed successfully',
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);

    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI analysis is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to analyze page' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/landing-pages/[id]/ai-analyze
 * Get latest AI insights
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

    // Get latest insights
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1');

    const { data: insights, error: insightsError } = await supabase
      .from('analytics_ai_insights')
      .select('*')
      .eq('page_id', pageId)
      .order('analysis_date', { ascending: false })
      .limit(limit);

    if (insightsError) {
      throw insightsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        insights: insights || [],
        page: {
          id: page.id,
          name: page.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Insights fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
