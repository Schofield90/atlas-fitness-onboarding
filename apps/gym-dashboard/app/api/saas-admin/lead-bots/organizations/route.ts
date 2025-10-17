import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/organizations
 * List all organizations with lead bot statistics
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for platform admins

    const supabaseAdmin = createAdminClient();

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .order('name');

    if (orgsError) throw orgsError;

    // Get AI agents for each organization
    const { data: agents } = await supabaseAdmin
      .from('ai_agents')
      .select('organization_id, enabled')
      .eq('role', 'lead_qualification');

    // Get lead counts per organization
    const { data: leadCounts } = await supabaseAdmin
      .from('leads')
      .select('organization_id')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((lead: any) => {
          counts[lead.organization_id] = (counts[lead.organization_id] || 0) + 1;
        });
        return { data: counts };
      });

    // Get conversation counts per organization
    const { data: conversationCounts } = await supabaseAdmin
      .from('ai_agent_conversations')
      .select('organization_id')
      .eq('status', 'active')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((conv: any) => {
          counts[conv.organization_id] = (counts[conv.organization_id] || 0) + 1;
        });
        return { data: counts };
      });

    // Get booking counts per organization
    const { data: bookingCounts } = await supabaseAdmin
      .from('sales_call_bookings')
      .select('organization_id')
      .in('status', ['scheduled', 'confirmed'])
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((booking: any) => {
          counts[booking.organization_id] = (counts[booking.organization_id] || 0) + 1;
        });
        return { data: counts };
      });

    // Build response with stats for each organization
    const organizations = (orgs || []).map((org) => {
      const agent = agents?.find((a) => a.organization_id === org.id);
      const agentEnabled = agent?.enabled || false;

      return {
        id: org.id,
        name: org.name,
        agentEnabled,
        totalLeads: leadCounts?.[org.id] || 0,
        activeConversations: conversationCounts?.[org.id] || 0,
        callsBooked: bookingCounts?.[org.id] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      organizations,
      total: organizations.length,
    });
  } catch (error: any) {
    console.error('[Lead Bot Organizations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error.message },
      { status: 500 }
    );
  }
}
