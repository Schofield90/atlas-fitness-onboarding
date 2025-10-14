import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';

export const runtime = 'nodejs';

/**
 * POST /api/saas-admin/lead-bots/agents
 * Create a new AI agent
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get their organization
    const user = await requireAuthWithOrg();
    console.log('[Create Agent] Authenticated user:', { userId: user.id, organizationId: user.organizationId });

    const body = await request.json();

    const {
      name,
      description,
      role,
      system_prompt,
      model,
      temperature,
      max_tokens,
      enabled,
      metadata,
    } = body;

    // Validate required fields
    if (!name || !system_prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, system_prompt' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Build insert object - use authenticated user's organization
    const insertData = {
      name,
      description,
      role: role || 'lead_qualification',
      system_prompt,
      model: model || 'gpt-5',
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 500,
      enabled: enabled !== undefined ? enabled : true,
      metadata: metadata || {},
      organization_id: user.organizationId, // Always use authenticated user's organization
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
