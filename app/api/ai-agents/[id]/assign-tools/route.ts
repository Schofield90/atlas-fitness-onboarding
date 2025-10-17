/**
 * API endpoint to assign tools to an AI agent
 * Allows bulk assignment of tools by category or individual tool IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { getToolsFromDatabase } from '@/lib/ai-agents/tools/registry';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    const { id: agentId } = await context.params;
    const body = await request.json();

    const {
      toolIds,          // Array of specific tool IDs
      categories,       // Array of categories ('analytics', 'data', etc.)
      assignAll = false // Assign all available tools
    } = body;

    // Get all available tools from database
    const { tools: allTools, error: toolsError } = await getToolsFromDatabase({
      enabled: true
    });

    if (toolsError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch tools: ${toolsError}`
      }, { status: 500 });
    }

    let toolsToAssign: string[] = [];

    if (assignAll) {
      // Assign all enabled tools
      toolsToAssign = allTools.map(t => t.id);
    } else if (categories && categories.length > 0) {
      // Assign tools by category
      toolsToAssign = allTools
        .filter(t => categories.includes(t.category))
        .map(t => t.id);
    } else if (toolIds && toolIds.length > 0) {
      // Assign specific tools
      toolsToAssign = toolIds;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Must provide toolIds, categories, or assignAll=true'
      }, { status: 400 });
    }

    // Update agent's allowed_tools
    const { data: updatedAgent, error: updateError } = await supabase
      .from('ai_agents')
      .update({
        allowed_tools: toolsToAssign,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: `Failed to update agent: ${updateError.message}`
      }, { status: 500 });
    }

    // Group tools by category for response
    const toolsByCategory = toolsToAssign.reduce((acc, toolId) => {
      const tool = allTools.find(t => t.id === toolId);
      if (tool) {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool.name);
      }
      return acc;
    }, {} as Record<string, string[]>);

    return NextResponse.json({
      success: true,
      data: {
        agentId: updatedAgent.id,
        agentName: updatedAgent.name,
        toolsAssigned: toolsToAssign.length,
        toolsByCategory,
        allToolIds: toolsToAssign
      },
      message: `Successfully assigned ${toolsToAssign.length} tools to agent`
    });

  } catch (error: any) {
    console.error('[Assign Tools] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to view currently assigned tools
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    const { id: agentId } = await context.params;

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('id, name, allowed_tools')
      .eq('id', agentId)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Agent not found: ${error.message}`
      }, { status: 404 });
    }

    const allowedTools = agent.allowed_tools || [];

    // Get details of assigned tools
    const { tools: allTools } = await getToolsFromDatabase();
    const assignedTools = allTools.filter(t => allowedTools.includes(t.id));

    const toolsByCategory = assignedTools.reduce((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push({
        id: tool.id,
        name: tool.name,
        description: tool.description
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        agentId: agent.id,
        agentName: agent.name,
        totalToolsAssigned: allowedTools.length,
        toolsByCategory,
        allToolIds: allowedTools
      }
    });

  } catch (error: any) {
    console.error('[Get Assigned Tools] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
