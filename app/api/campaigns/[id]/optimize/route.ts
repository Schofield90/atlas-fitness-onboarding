import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCampaignOptimizer, CampaignData } from '@/lib/ai/campaign-optimizer';
import { z } from 'zod';

const optimizeRequestSchema = z.object({
  user_id: z.string().uuid(),
  optimization_type: z.enum(['full', 'budget', 'audience', 'creative', 'ab_test']).default('full'),
  include_historical: z.boolean().default(true),
  force_refresh: z.boolean().default(false),
});

// POST /api/campaigns/[id]/optimize - Generate optimization recommendations
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = optimizeRequestSchema.parse(body);

    // Check if campaign exists and user has access
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check user's organization access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', validatedData.user_id)
      .single();

    if (!userProfile || userProfile.organization_id !== campaign.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if we have recent optimization results (less than 1 hour old)
    if (!validatedData.force_refresh) {
      const { data: recentOptimization } = await supabaseAdmin
        .from('campaign_optimizations')
        .select('*')
        .eq('campaign_id', id)
        .eq('optimization_type', validatedData.optimization_type)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentOptimization) {
        return NextResponse.json({
          optimization: recentOptimization,
          cached: true,
        });
      }
    }

    // Get historical campaign data if requested
    let historicalData: CampaignData[] = [];
    if (validatedData.include_historical) {
      const { data: historicalCampaigns } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('organization_id', campaign.organization_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      historicalData = historicalCampaigns || [];
    }

    // Initialize campaign optimizer
    const optimizer = createCampaignOptimizer();

    let optimizationResult;
    
    switch (validatedData.optimization_type) {
      case 'full':
        optimizationResult = await optimizer.optimizeCampaign(campaign, historicalData);
        break;
      
      case 'budget':
        optimizationResult = await optimizer.optimizeCampaign(campaign, historicalData);
        // Filter to only budget-related recommendations
        optimizationResult = {
          ...optimizationResult,
          action_items: optimizationResult.action_items.filter(item => 
            item.action.toLowerCase().includes('budget') || 
            item.action.toLowerCase().includes('bid')
          ),
        };
        break;
      
      case 'audience':
        optimizationResult = await optimizer.optimizeCampaign(campaign, historicalData);
        // Filter to only audience-related recommendations
        optimizationResult = {
          ...optimizationResult,
          action_items: optimizationResult.action_items.filter(item => 
            item.action.toLowerCase().includes('audience') || 
            item.action.toLowerCase().includes('target')
          ),
        };
        break;
      
      case 'creative':
        optimizationResult = await optimizer.optimizeCampaign(campaign, historicalData);
        // Filter to only creative-related recommendations
        optimizationResult = {
          ...optimizationResult,
          action_items: optimizationResult.action_items.filter(item => 
            item.action.toLowerCase().includes('creative') || 
            item.action.toLowerCase().includes('headline') ||
            item.action.toLowerCase().includes('image') ||
            item.action.toLowerCase().includes('video')
          ),
        };
        break;
      
      case 'ab_test':
        const abTestSuggestions = await optimizer.generateABTestSuggestions(campaign);
        optimizationResult = {
          overall_score: optimizer.calculatePerformanceScore(campaign),
          ab_test_suggestions: abTestSuggestions,
          action_items: abTestSuggestions.map((test) => ({
            priority: 'medium' as const,
            action: `Create A/B test: ${test.element}`,
            expected_impact: test.expected_impact,
            effort_required: 'medium' as const,
            timeline: '1-2 weeks',
          })),
        };
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid optimization type' }, { status: 400 });
    }

    // Store optimization results
    const optimizationData = {
      campaign_id: id,
      optimization_type: validatedData.optimization_type,
      results: optimizationResult,
      performance_score: optimizationResult.overall_score,
      created_by: validatedData.user_id,
    };

    const { data: savedOptimization, error } = await supabaseAdmin
      .from('campaign_optimizations')
      .insert([optimizationData])
      .select()
      .single();

    if (error) {
      console.error('Error saving optimization:', error);
      // Continue without storing - don't fail the request
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id: validatedData.user_id,
        type: 'optimization_generated',
        subject: 'Campaign Optimization Generated',
        content: `AI optimization analysis completed (${validatedData.optimization_type})`,
        metadata: {
          optimization_type: validatedData.optimization_type,
          performance_score: optimizationResult.overall_score,
          action_items_count: optimizationResult.action_items?.length || 0,
        },
      }]);

    return NextResponse.json({
      optimization: savedOptimization || optimizationResult,
      cached: false,
    });
  } catch (error) {
    console.error('Error in POST /api/campaigns/[id]/optimize:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/campaigns/[id]/optimize - Get optimization history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const optimizationType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get campaign to check access
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let query = supabaseAdmin
      .from('campaign_optimizations')
      .select(`
        *,
        created_by:user_profiles!campaign_optimizations_created_by_fkey(full_name, avatar_url)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (optimizationType) {
      query = query.eq('optimization_type', optimizationType);
    }

    const { data: optimizations, error } = await query;

    if (error) {
      console.error('Error fetching optimizations:', error);
      return NextResponse.json({ error: 'Failed to fetch optimizations' }, { status: 500 });
    }

    return NextResponse.json({ optimizations: optimizations || [] });
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/optimize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}