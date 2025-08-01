import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { LookInBodyService } from '@/lib/services/lookinbody/LookInBodyService';

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

    // Check if LookInBody is configured
    const { data: config } = await supabase
      .from('lookinbody_config')
      .select('api_plan, is_active')
      .eq('organization_id', profile.organization_id)
      .single();

    if (!config?.is_active) {
      return NextResponse.json({
        api_calls: 0,
        webhooks: 0,
        scans: 0,
        limit: 0,
        remaining: 0,
        cost: 0
      });
    }

    // Initialize LookInBody service
    const lookInBodyService = new LookInBodyService(profile.organization_id);
    await lookInBodyService.initialize();

    // Get usage statistics
    const usage = await lookInBodyService.getUsageStats();

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}