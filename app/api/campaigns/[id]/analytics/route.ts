import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Schema for analytics request validation (reserved for future use)
const _analyticsRequestSchema = z.object({
  date_range: z.object({
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
  }),
  metrics: z.array(z.enum([
    'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'spend', 
    'leads', 'cost_per_lead', 'conversions', 'cost_per_conversion', 
    'roas', 'reach', 'frequency'
  ])).optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
  compare_to: z.enum(['previous_period', 'previous_year', 'none']).default('none'),
});

// GET /api/campaigns/[id]/analytics - Get campaign analytics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const granularity = searchParams.get('granularity') || 'day';
    const compareTo = searchParams.get('compare_to') || 'none';
    const _metrics = searchParams.get('metrics')?.split(',') || ['impressions', 'clicks', 'spend', 'leads', 'ctr', 'cpc', 'cost_per_lead'];

    // Check if campaign exists
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get campaign metrics data
    const { data: metricsData, error: metricsError } = await supabaseAdmin
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (metricsError) {
      console.error('Error fetching campaign metrics:', metricsError);
      return NextResponse.json({ error: 'Failed to fetch campaign metrics' }, { status: 500 });
    }

    // Process metrics data based on granularity
    const processedMetrics = processMetricsByGranularity(metricsData || [], granularity);

    // Get comparison data if requested
    let comparisonData = null;
    if (compareTo !== 'none') {
      const comparisonPeriod = calculateComparisonPeriod(startDate, endDate, compareTo);
      const { data: comparisonMetrics } = await supabaseAdmin
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', id)
        .gte('date', comparisonPeriod.start)
        .lte('date', comparisonPeriod.end)
        .order('date', { ascending: true });

      comparisonData = processMetricsByGranularity(comparisonMetrics || [], granularity);
    }

    // Calculate summary statistics
    const summaryStats = calculateSummaryStats(processedMetrics);

    // Get lead attribution data
    const { data: leadAttribution } = await supabaseAdmin
      .from('leads')
      .select('id, created_at, status, qualification_score, converted_to_client')
      .eq('campaign_id', id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: true });

    // Get conversion funnel data
    const conversionFunnel = await getConversionFunnel(id, startDate, endDate);

    // Get top performing elements
    const topPerforming = await getTopPerformingElements(id, startDate, endDate);

    // Get A/B test results
    const { data: abTestResults } = await supabaseAdmin
      .from('campaign_ab_tests')
      .select(`
        *,
        metrics:ab_test_metrics(*)
      `)
      .eq('campaign_id', id)
      .in('status', ['running', 'completed']);

    const result = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        platform: campaign.platform,
        status: campaign.status,
        budget_amount: campaign.budget_amount,
        budget_type: campaign.budget_type,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
      },
      date_range: {
        start_date: startDate,
        end_date: endDate,
        granularity,
      },
      metrics: {
        data: processedMetrics,
        summary: summaryStats,
        comparison: comparisonData,
      },
      lead_attribution: leadAttribution || [],
      conversion_funnel: conversionFunnel,
      top_performing: topPerforming,
      ab_test_results: abTestResults || [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function processMetricsByGranularity(metrics: Array<Record<string, any>>, granularity: string) {
  if (granularity === 'day') {
    return metrics;
  }

  const grouped: { [key: string]: Array<Record<string, any>> } = {};
  
  metrics.forEach(metric => {
    const date = new Date(metric.date);
    let key: string;
    
    if (granularity === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (granularity === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      key = metric.date;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(metric);
  });

  return Object.entries(grouped).map(([date, metrics]) => {
    const aggregated = metrics.reduce((acc, metric) => {
      acc.impressions += metric.impressions;
      acc.clicks += metric.clicks;
      acc.spend += metric.spend;
      acc.leads += metric.leads;
      acc.conversions += metric.conversions;
      return acc;
    }, {
      date,
      impressions: 0,
      clicks: 0,
      spend: 0,
      leads: 0,
      conversions: 0,
    });

    // Calculate derived metrics
    aggregated.ctr = aggregated.impressions > 0 ? aggregated.clicks / aggregated.impressions : 0;
    aggregated.cpc = aggregated.clicks > 0 ? aggregated.spend / aggregated.clicks : 0;
    aggregated.cpm = aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0;
    aggregated.cost_per_lead = aggregated.leads > 0 ? aggregated.spend / aggregated.leads : 0;
    aggregated.cost_per_conversion = aggregated.conversions > 0 ? aggregated.spend / aggregated.conversions : 0;

    return aggregated;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function calculateComparisonPeriod(startDate: string, endDate: string, compareTo: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();

  if (compareTo === 'previous_period') {
    return {
      start: new Date(start.getTime() - duration).toISOString().split('T')[0],
      end: new Date(start.getTime() - 1).toISOString().split('T')[0],
    };
  } else if (compareTo === 'previous_year') {
    return {
      start: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()).toISOString().split('T')[0],
      end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()).toISOString().split('T')[0],
    };
  }

  return { start: startDate, end: endDate };
}

function calculateSummaryStats(metrics: Array<Record<string, any>>) {
  if (!metrics || metrics.length === 0) {
    return {
      total_impressions: 0,
      total_clicks: 0,
      total_spend: 0,
      total_leads: 0,
      total_conversions: 0,
      avg_ctr: 0,
      avg_cpc: 0,
      avg_cpm: 0,
      avg_cost_per_lead: 0,
      avg_cost_per_conversion: 0,
    };
  }

  const totals = metrics.reduce((acc, metric) => {
    acc.impressions += metric.impressions;
    acc.clicks += metric.clicks;
    acc.spend += metric.spend;
    acc.leads += metric.leads;
    acc.conversions += metric.conversions;
    return acc;
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    leads: 0,
    conversions: 0,
  });

  return {
    total_impressions: totals.impressions,
    total_clicks: totals.clicks,
    total_spend: totals.spend,
    total_leads: totals.leads,
    total_conversions: totals.conversions,
    avg_ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
    avg_cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    avg_cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    avg_cost_per_lead: totals.leads > 0 ? totals.spend / totals.leads : 0,
    avg_cost_per_conversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
  };
}

async function getConversionFunnel(campaignId: string, startDate: string, endDate: string) {
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, status, qualification_score, converted_to_client')
    .eq('campaign_id', campaignId)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (!leads) return null;

  const funnel = {
    total_leads: leads.length,
    qualified_leads: leads.filter(l => l.qualification_score && l.qualification_score >= 60).length,
    contacted_leads: leads.filter(l => l.status === 'contacted').length,
    interested_leads: leads.filter(l => l.status === 'interested').length,
    converted_leads: leads.filter(l => l.converted_to_client).length,
  };

  return {
    ...funnel,
    qualification_rate: funnel.total_leads > 0 ? funnel.qualified_leads / funnel.total_leads : 0,
    contact_rate: funnel.total_leads > 0 ? funnel.contacted_leads / funnel.total_leads : 0,
    interest_rate: funnel.contacted_leads > 0 ? funnel.interested_leads / funnel.contacted_leads : 0,
    conversion_rate: funnel.total_leads > 0 ? funnel.converted_leads / funnel.total_leads : 0,
  };
}

async function getTopPerformingElements(campaignId: string, startDate: string, endDate: string) {
  // Get campaign creative elements
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('ad_creative, target_audience')
    .eq('id', campaignId)
    .single();

  if (!campaign) return null;

  // Get metrics for the period
  const { data: metrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (!metrics || metrics.length === 0) return null;

  const totalMetrics = metrics.reduce((acc, metric) => {
    acc.impressions += metric.impressions;
    acc.clicks += metric.clicks;
    acc.spend += metric.spend;
    acc.leads += metric.leads;
    acc.conversions += metric.conversions;
    return acc;
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    leads: 0,
    conversions: 0,
  });

  return {
    creative_elements: {
      headline: campaign.ad_creative?.headline || 'Not set',
      description: campaign.ad_creative?.description || 'Not set',
      call_to_action: campaign.ad_creative?.call_to_action || 'Not set',
      has_image: !!(campaign.ad_creative?.image_urls?.length),
      has_video: !!(campaign.ad_creative?.video_url),
    },
    audience_segments: {
      age_range: `${campaign.target_audience?.age_min || 18}-${campaign.target_audience?.age_max || 65}`,
      genders: campaign.target_audience?.genders || ['all'],
      locations: campaign.target_audience?.locations || [],
      interests: campaign.target_audience?.interests || [],
    },
    performance_metrics: {
      ctr: totalMetrics.impressions > 0 ? totalMetrics.clicks / totalMetrics.impressions : 0,
      cpc: totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0,
      cost_per_lead: totalMetrics.leads > 0 ? totalMetrics.spend / totalMetrics.leads : 0,
      conversion_rate: totalMetrics.leads > 0 ? totalMetrics.conversions / totalMetrics.leads : 0,
    },
  };
}