import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const createABTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  element_type: z.enum(['headline', 'description', 'image', 'video', 'cta', 'audience', 'placement']),
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  variation_a: z.object({
    name: z.string().min(1, 'Variation A name is required'),
    content: z.record(z.any()), // Flexible content structure
    traffic_allocation: z.number().min(0).max(100).default(50),
  }),
  variation_b: z.object({
    name: z.string().min(1, 'Variation B name is required'),
    content: z.record(z.any()), // Flexible content structure
    traffic_allocation: z.number().min(0).max(100).default(50),
  }),
  success_metric: z.enum(['ctr', 'cpc', 'cost_per_lead', 'conversion_rate', 'roas']),
  minimum_sample_size: z.number().min(100).default(1000),
  confidence_level: z.number().min(90).max(99).default(95),
  test_duration_days: z.number().min(1).max(30).default(14),
  auto_declare_winner: z.boolean().default(true),
  user_id: z.string().uuid(),
});

const updateABTestSchema = z.object({
  status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).optional(),
  winner_variation: z.enum(['a', 'b', 'inconclusive']).optional(),
  results: z.object({
    statistical_significance: z.number().min(0).max(100).optional(),
    confidence_interval: z.object({
      lower: z.number(),
      upper: z.number(),
    }).optional(),
    effect_size: z.number().optional(),
    p_value: z.number().optional(),
    conclusion: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  user_id: z.string().uuid(),
});

// GET /api/campaigns/[id]/ab-tests - Get A/B tests for campaign
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeResults = searchParams.get('include_results') === 'true';

    let query = supabaseAdmin
      .from('campaign_ab_tests')
      .select(`
        *,
        created_by:user_profiles!campaign_ab_tests_created_by_fkey(full_name, avatar_url)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: abTests, error } = await query;

    if (error) {
      console.error('Error fetching A/B tests:', error);
      return NextResponse.json({ error: 'Failed to fetch A/B tests' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { ab_tests: any[]; metrics?: any } = { ab_tests: abTests || [] };

    if (includeResults) {
      // Get metrics for each test
      const testIds = abTests?.map(t => t.id) || [];
      const { data: metrics } = await supabaseAdmin
        .from('ab_test_metrics')
        .select('*')
        .in('ab_test_id', testIds);

      result.ab_tests = abTests?.map(test => ({
        ...test,
        metrics: metrics?.filter(m => m.ab_test_id === test.id) || [],
      })) || [];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/ab-tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/campaigns/[id]/ab-tests - Create new A/B test
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = createABTestSchema.parse(body);

    // Check if campaign exists and user has access
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, organization_id, name')
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

    // Validate traffic allocation adds up to 100%
    if (validatedData.variation_a.traffic_allocation + validatedData.variation_b.traffic_allocation !== 100) {
      return NextResponse.json({ 
        error: 'Traffic allocation must add up to 100%' 
      }, { status: 400 });
    }

    // Create the A/B test
    const abTestData = {
      campaign_id: id,
      name: validatedData.name,
      element_type: validatedData.element_type,
      hypothesis: validatedData.hypothesis,
      variation_a: validatedData.variation_a,
      variation_b: validatedData.variation_b,
      success_metric: validatedData.success_metric,
      minimum_sample_size: validatedData.minimum_sample_size,
      confidence_level: validatedData.confidence_level,
      test_duration_days: validatedData.test_duration_days,
      auto_declare_winner: validatedData.auto_declare_winner,
      status: 'draft',
      created_by: validatedData.user_id,
    };

    const { data: abTest, error } = await supabaseAdmin
      .from('campaign_ab_tests')
      .insert([abTestData])
      .select(`
        *,
        created_by:user_profiles!campaign_ab_tests_created_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating A/B test:', error);
      return NextResponse.json({ error: 'Failed to create A/B test' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id: validatedData.user_id,
        type: 'ab_test_created',
        subject: 'A/B Test Created',
        content: `A/B test "${validatedData.name}" created for ${validatedData.element_type}`,
        metadata: {
          ab_test_id: abTest.id,
          element_type: validatedData.element_type,
          success_metric: validatedData.success_metric,
          test_duration_days: validatedData.test_duration_days,
        },
      }]);

    return NextResponse.json({ ab_test: abTest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/campaigns/[id]/ab-tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/ab-tests - Update A/B test
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { ab_test_id, ...updateData } = body;
    const validatedData = updateABTestSchema.parse(updateData);

    if (!ab_test_id) {
      return NextResponse.json({ error: 'A/B test ID is required' }, { status: 400 });
    }

    // Check if A/B test exists and user has access
    const { data: abTest } = await supabaseAdmin
      .from('campaign_ab_tests')
      .select(`
        *,
        campaign:campaigns(organization_id)
      `)
      .eq('id', ab_test_id)
      .eq('campaign_id', id)
      .single();

    if (!abTest) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 });
    }

    // Check user's organization access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', validatedData.user_id)
      .single();

    if (!userProfile || userProfile.organization_id !== (abTest.campaign as { organization_id: string }).organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the A/B test
    const { user_id, ...updates } = validatedData;
    const { data: updatedTest, error } = await supabaseAdmin
      .from('campaign_ab_tests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ab_test_id)
      .select(`
        *,
        created_by:user_profiles!campaign_ab_tests_created_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating A/B test:', error);
      return NextResponse.json({ error: 'Failed to update A/B test' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id,
        type: 'ab_test_updated',
        subject: 'A/B Test Updated',
        content: `A/B test "${abTest.name}" updated`,
        metadata: {
          ab_test_id: ab_test_id,
          updates: updates,
        },
      }]);

    return NextResponse.json({ ab_test: updatedTest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in PUT /api/campaigns/[id]/ab-tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/ab-tests - Delete A/B test
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const abTestId = searchParams.get('ab_test_id');
    const userId = searchParams.get('user_id');

    if (!abTestId || !userId) {
      return NextResponse.json({ error: 'A/B test ID and user ID are required' }, { status: 400 });
    }

    // Check if A/B test exists and user has access
    const { data: abTest } = await supabaseAdmin
      .from('campaign_ab_tests')
      .select(`
        *,
        campaign:campaigns(organization_id)
      `)
      .eq('id', abTestId)
      .eq('campaign_id', id)
      .single();

    if (!abTest) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 });
    }

    // Check user's organization access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userProfile || userProfile.organization_id !== (abTest.campaign as { organization_id: string }).organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can't delete running tests
    if (abTest.status === 'running') {
      return NextResponse.json({ 
        error: 'Cannot delete running A/B test. Please pause or complete it first.' 
      }, { status: 400 });
    }

    // Delete the A/B test
    const { error } = await supabaseAdmin
      .from('campaign_ab_tests')
      .delete()
      .eq('id', abTestId);

    if (error) {
      console.error('Error deleting A/B test:', error);
      return NextResponse.json({ error: 'Failed to delete A/B test' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id: userId,
        type: 'ab_test_deleted',
        subject: 'A/B Test Deleted',
        content: `A/B test "${abTest.name}" was deleted`,
        metadata: {
          ab_test_id: abTestId,
          element_type: abTest.element_type,
        },
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]/ab-tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}