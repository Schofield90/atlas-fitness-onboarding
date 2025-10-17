import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/stats
 * Platform-wide statistics for lead qualification system
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for platform admins

    const supabaseAdmin = createAdminClient();

    // Get total leads from all organizations
    const { count: totalLeads } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Get active conversations
    const { count: activeConversations } = await supabaseAdmin
      .from('ai_agent_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total calls booked
    const { count: callsBooked } = await supabaseAdmin
      .from('sales_call_bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['scheduled', 'confirmed']);

    // Get qualified leads
    const { data: qualificationData } = await supabaseAdmin
      .from('lead_qualification_history')
      .select('qualification_status')
      .in('qualification_status', ['qualified', 'hot']);

    const qualifiedLeads = qualificationData?.length || 0;

    // Calculate response rate (leads with conversations / total leads)
    const responseRate = totalLeads ?
      Math.round((activeConversations || 0) / totalLeads * 100) : 0;

    // Calculate average qualification score
    const { data: scoresData } = await supabaseAdmin
      .from('lead_qualification_history')
      .select('qualification_score')
      .not('qualification_score', 'is', null);

    const avgQualificationScore = scoresData && scoresData.length > 0 ?
      Math.round(
        scoresData.reduce((sum, item) => sum + (item.qualification_score || 0), 0) / scoresData.length
      ) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalLeads: totalLeads || 0,
        activeConversations: activeConversations || 0,
        callsBooked: callsBooked || 0,
        qualifiedLeads,
        responseRate,
        avgQualificationScore,
      },
    });
  } catch (error: any) {
    console.error('[Lead Bot Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
