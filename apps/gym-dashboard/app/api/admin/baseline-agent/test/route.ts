import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/client";
import { AIOrchestrator } from "@/app/lib/ai-agents/orchestrator";

/**
 * POST /api/admin/baseline-agent/test
 *
 * Tests the baseline agent with a sample message.
 * Returns AI response for preview/testing purposes.
 * Super admin only.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check super admin access
    const isSuperAdmin =
      user.email === 'sam@gymleadhub.co.uk' ||
      user.email?.endsWith('@gymleadhub.co.uk') ||
      user.email?.endsWith('@atlas-gyms.co.uk');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, agent_config } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!agent_config) {
      return NextResponse.json(
        { error: "Agent configuration is required" },
        { status: 400 }
      );
    }

    // Create temporary agent config for testing
    const testAgent = {
      id: "test-baseline-agent",
      name: agent_config.name || "Baseline Test Agent",
      system_prompt: agent_config.system_prompt,
      model_provider: agent_config.model_provider || "anthropic",
      model_name: agent_config.model_name || "claude-3-5-sonnet-20241022",
      temperature: agent_config.temperature || 0.8,
      max_tokens: agent_config.max_tokens || 2048,
      allowed_tools: agent_config.allowed_tools || [],
      metadata: {
        is_test: true,
        tested_by: user.email,
        tested_at: new Date().toISOString(),
      },
    };

    // Execute agent with orchestrator
    const orchestrator = new AIOrchestrator();

    try {
      const response = await orchestrator.executeAgent({
        agent: testAgent as any,
        input: message,
        context: {
          is_test: true,
          conversation_history: [],
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          message: response.message,
          tokens_used: response.usage,
          model: testAgent.model_name,
          provider: testAgent.model_provider,
        }
      });

    } catch (execError: any) {
      console.error("Error executing test agent:", execError);
      return NextResponse.json(
        {
          error: "Agent execution failed",
          details: execError.message,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Error in POST /api/admin/baseline-agent/test:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
