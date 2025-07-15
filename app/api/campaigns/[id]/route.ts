import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').optional(),
  objective: z.enum(['LEAD_GENERATION', 'REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS', 'BRAND_AWARENESS']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  platform: z.enum(['facebook', 'instagram', 'google', 'other']).optional(),
  budget_type: z.enum(['daily', 'lifetime']).optional(),
  budget_amount: z.number().positive('Budget must be positive').optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  target_audience: z.object({
    age_min: z.number().min(18).max(100).optional(),
    age_max: z.number().min(18).max(100).optional(),
    genders: z.array(z.enum(['male', 'female', 'all'])).optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  ad_creative: z.object({
    headline: z.string().optional(),
    description: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    video_url: z.string().optional(),
    call_to_action: z.string().optional(),
    destination_url: z.string().url().optional(),
  }).optional(),
  lead_form_fields: z.array(z.object({
    field_name: z.string(),
    field_type: z.enum(['text', 'email', 'phone', 'select', 'checkbox']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  user_id: z.string().uuid(),
});

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get('include_metrics') === 'true';
    const includeActivities = searchParams.get('include_activities') === 'true';

    const query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        created_by:user_profiles!campaigns_created_by_fkey(full_name, avatar_url)
      `)
      .eq('id', id);

    const { data: campaign, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      console.error('Error fetching campaign:', error);
      return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
    }

    const result: { campaign: any; metrics?: any; activities?: any } = { campaign };

    // Include metrics if requested
    if (includeMetrics) {
      const { data: metrics } = await supabaseAdmin
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', id)
        .order('date', { ascending: false })
        .limit(30); // Last 30 days

      result.metrics = metrics || [];
    }

    // Include activities if requested
    if (includeActivities) {
      const { data: activities } = await supabaseAdmin
        .from('campaign_activities')
        .select(`
          *,
          user:user_profiles(full_name, avatar_url)
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      result.activities = activities || [];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateCampaignSchema.parse(body);

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

    // Update the campaign
    const { user_id, ...updateData } = validatedData;
    const { data: updatedCampaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        created_by:user_profiles!campaigns_created_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id,
        type: 'updated',
        subject: 'Campaign Updated',
        content: `Campaign "${campaign.name}" was updated`,
        metadata: updateData,
      }]);

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in PUT /api/campaigns/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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
      .eq('id', userId)
      .single();

    if (!userProfile || userProfile.organization_id !== campaign.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete campaign (mark as deleted)
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: id,
        user_id: userId,
        type: 'deleted',
        subject: 'Campaign Deleted',
        content: `Campaign "${campaign.name}" was deleted`,
        metadata: {},
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}