import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  objective: z.enum(['LEAD_GENERATION', 'REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS', 'BRAND_AWARENESS']),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  platform: z.enum(['facebook', 'instagram', 'google', 'other']).default('facebook'),
  budget_type: z.enum(['daily', 'lifetime']).default('daily'),
  budget_amount: z.number().positive('Budget must be positive'),
  start_date: z.string().min(1, 'Start date is required'),
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
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().omit({ organization_id: true });

// GET /api/campaigns - Get all campaigns for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        created_by:user_profiles!campaigns_created_by_fkey(full_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Get campaign statistics
    const campaignIds = campaigns?.map(c => c.id) || [];
    const { data: stats } = await supabaseAdmin
      .from('campaign_metrics')
      .select('*')
      .in('campaign_id', campaignIds);

    // Merge campaign data with stats
    const campaignsWithStats = campaigns?.map(campaign => ({
      ...campaign,
      metrics: stats?.find(s => s.campaign_id === campaign.id) || null,
    })) || [];

    return NextResponse.json({ campaigns: campaignsWithStats });
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCampaignSchema.parse(body);

    // Check if user belongs to the organization
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', validatedData.user_id)
      .single();

    if (!userProfile || userProfile.organization_id !== validatedData.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the campaign
    const campaignData = {
      ...validatedData,
      created_by: validatedData.user_id,
      meta_campaign_id: null, // Will be set when synced with Meta
      metrics: {
        impressions: 0,
        clicks: 0,
        spend: 0,
        leads: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cost_per_lead: 0,
        cost_per_conversion: 0,
        roas: 0,
      },
    };

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert([campaignData])
      .select(`
        *,
        created_by:user_profiles!campaigns_created_by_fkey(full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('campaign_activities')
      .insert([{
        campaign_id: campaign.id,
        user_id: validatedData.user_id,
        type: 'created',
        subject: 'Campaign Created',
        content: `Campaign "${campaign.name}" was created`,
        metadata: {
          objective: campaign.objective,
          platform: campaign.platform,
          budget_amount: campaign.budget_amount,
          budget_type: campaign.budget_type,
        },
      }]);

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns - Bulk update campaigns
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_ids, updates, user_id } = body;

    if (!Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json({ error: 'Campaign IDs are required' }, { status: 400 });
    }

    const validatedUpdates = updateCampaignSchema.parse(updates);

    // Verify user has access to all campaigns
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, organization_id, name')
      .in('id', campaign_ids);

    if (!campaigns || campaigns.length !== campaign_ids.length) {
      return NextResponse.json({ error: 'Some campaigns not found' }, { status: 404 });
    }

    // Check user's organization access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user_id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const unauthorizedCampaigns = campaigns.filter(c => c.organization_id !== userProfile.organization_id);
    if (unauthorizedCampaigns.length > 0) {
      return NextResponse.json({ error: 'Unauthorized access to some campaigns' }, { status: 403 });
    }

    // Update campaigns
    const { data: updatedCampaigns, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        ...validatedUpdates,
        updated_at: new Date().toISOString(),
      })
      .in('id', campaign_ids)
      .select('*');

    if (error) {
      console.error('Error updating campaigns:', error);
      return NextResponse.json({ error: 'Failed to update campaigns' }, { status: 500 });
    }

    // Create activity records for bulk updates
    const activityRecords = campaigns.map(campaign => ({
      campaign_id: campaign.id,
      user_id,
      type: 'updated',
      subject: 'Campaign Updated',
      content: `Campaign "${campaign.name}" was updated`,
      metadata: validatedUpdates,
    }));

    await supabaseAdmin
      .from('campaign_activities')
      .insert(activityRecords);

    return NextResponse.json({ campaigns: updatedCampaigns });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in PUT /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns - Bulk delete campaigns
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignIds = searchParams.get('ids')?.split(',') || [];
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (campaignIds.length === 0) {
      return NextResponse.json({ error: 'Campaign IDs are required' }, { status: 400 });
    }

    // Verify user has access to all campaigns
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, organization_id, name')
      .in('id', campaignIds);

    if (!campaigns || campaigns.length !== campaignIds.length) {
      return NextResponse.json({ error: 'Some campaigns not found' }, { status: 404 });
    }

    // Check user's organization access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const unauthorizedCampaigns = campaigns.filter(c => c.organization_id !== userProfile.organization_id);
    if (unauthorizedCampaigns.length > 0) {
      return NextResponse.json({ error: 'Unauthorized access to some campaigns' }, { status: 403 });
    }

    // Soft delete campaigns (mark as deleted)
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', campaignIds);

    if (error) {
      console.error('Error deleting campaigns:', error);
      return NextResponse.json({ error: 'Failed to delete campaigns' }, { status: 500 });
    }

    // Create activity records for deletions
    const activityRecords = campaigns.map(campaign => ({
      campaign_id: campaign.id,
      user_id: userId,
      type: 'deleted',
      subject: 'Campaign Deleted',
      content: `Campaign "${campaign.name}" was deleted`,
      metadata: {},
    }));

    await supabaseAdmin
      .from('campaign_activities')
      .insert(activityRecords);

    return NextResponse.json({ success: true, deleted_count: campaigns.length });
  } catch (error) {
    console.error('Error in DELETE /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}