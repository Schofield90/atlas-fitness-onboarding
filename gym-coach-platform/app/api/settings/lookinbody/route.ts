import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get LookInBody configuration
    const { data: config, error } = await supabase
      .from('lookinbody_config')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching LookInBody config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check if user has admin permissions
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    
    // Prepare config data
    const configData = {
      organization_id: profile.organization_id,
      api_key: body.api_key,
      account_name: body.account_name,
      region: body.region,
      webhook_secret: body.webhook_secret,
      webhook_enabled: body.webhook_enabled,
      auto_sync_enabled: body.auto_sync_enabled,
      alert_thresholds: body.alert_thresholds,
      api_plan: body.api_plan,
      billing_status: body.billing_status || 'active',
      is_active: body.is_active,
      updated_at: new Date().toISOString()
    };

    // Upsert configuration
    const { data, error } = await supabase
      .from('lookinbody_config')
      .upsert(configData, {
        onConflict: 'organization_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If enabling for the first time, create initial usage record
    if (body.is_active && !body.billing_status) {
      await supabase
        .from('lookinbody_api_usage')
        .insert({
          organization_id: profile.organization_id,
          date: new Date().toISOString().split('T')[0],
          api_calls_count: 0,
          webhooks_received: 0,
          scans_processed: 0,
          api_cost: 0
        });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Error saving LookInBody config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}