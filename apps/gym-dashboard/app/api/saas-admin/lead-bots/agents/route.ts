import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAuthWithOptionalOrg } from '@/app/lib/api/auth-check-admin';

export const runtime = 'nodejs';

/**
 * POST /api/saas-admin/lead-bots/agents
 * Create a new AI agent
 *
 * For super admins: organizationId must be provided in request body
 * For regular users: organizationId is automatically determined from membership
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      description,
      role,
      system_prompt,
      sop_ids, // Array of SOP IDs to link
      model,
      temperature,
      max_tokens,
      enabled,
      metadata,
      organization_id, // Super admins pass this explicitly
    } = body;

    // Authenticate user and get organization context
    const auth = await requireAuthWithOptionalOrg(organization_id);
    console.log('[Create Agent] Authenticated:', {
      userId: auth.user.id,
      email: auth.user.email,
      organizationId: auth.organizationId,
      isSuperAdmin: auth.isSuperAdmin
    });

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Build insert object
    const insertData = {
      name,
      description,
      role: role || 'lead_qualification',
      system_prompt: system_prompt || '', // Can be empty if using SOPs
      model: model || 'gpt-5',
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 500,
      enabled: enabled !== undefined ? enabled : true,
      metadata: metadata || {},
      organization_id: auth.organizationId, // From auth context
    };

    // Create the agent
    console.log('[Create Agent] Inserting data:', insertData);
    const { data: agent, error} = await supabaseAdmin
      .from('ai_agents')
      .insert(insertData)
      .select('id, name, organization_id, enabled')
      .single();

    if (error) {
      console.error('[Create Agent] Database error:', error);
      throw error;
    }
    console.log('[Create Agent] Agent created successfully:', agent);

    // Link SOPs to agent if provided
    if (sop_ids && Array.isArray(sop_ids) && sop_ids.length > 0) {
      console.log('[Create Agent] Linking SOPs:', sop_ids);
      const sopLinks = sop_ids.map((sopId, index) => ({
        agent_id: agent.id,
        sop_id: sopId,
        sort_order: index, // Maintain order of selection
      }));

      const { error: sopError } = await supabaseAdmin
        .from('agent_sops')
        .insert(sopLinks);

      if (sopError) {
        console.error('[Create Agent] Error linking SOPs:', sopError);
        // Don't fail the whole operation, just log the error
      } else {
        console.log('[Create Agent] SOPs linked successfully');
      }
    }

    // Generate webhook URL for GoHighLevel integration
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://login.gymleadhub.co.uk';
    const webhookUrl = `${baseUrl}/api/webhooks/ghl-bot/${agent.id}`;

    return NextResponse.json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        ...agent,
        webhookUrl,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Create Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/saas-admin/lead-bots/agents
 * List all AI agents across organizations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgFilter = searchParams.get('org');

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('ai_agents')
      .select(`
        id,
        name,
        description,
        role,
        system_prompt,
        model,
        temperature,
        max_tokens,
        enabled,
        allowed_tools,
        organization_id,
        metadata,
        organizations(name)
      `)
      .order('created_at', { ascending: false });

    if (orgFilter) {
      query = query.eq('organization_id', orgFilter);
    }

    // Only show lead qualification agents
    query = query.eq('role', 'lead_qualification');

    const { data: agents, error } = await query;

    if (error) throw error;

    const transformedAgents = (agents || []).map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      organizationName: agent.organizations?.name || 'No Organization',
      systemPrompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
      enabled: agent.enabled,
      role: agent.role,
      allowedTools: agent.allowed_tools || [],
      ghlLocationId: agent.metadata?.gohighlevel_location_id || '',
      ghlApiKey: agent.metadata?.gohighlevel_api_key || '',
      ghlCalendarId: agent.metadata?.gohighlevel_calendar_id || '',
      ghlPrivateIntegrationKey: agent.metadata?.gohighlevel_private_integration_key || '',
    }));

    return NextResponse.json({
      success: true,
      agents: transformedAgents,
      total: transformedAgents.length,
    });
  } catch (error: any) {
    console.error('[Agents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error.message },
      { status: 500 }
    );
  }
}
