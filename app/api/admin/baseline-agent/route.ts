import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/client";
import { defaultAgents } from "@/app/lib/ai-agents/default-agents";

/**
 * GET /api/admin/baseline-agent
 *
 * Fetches the baseline lead nurture agent configuration.
 * Falls back to default template if no baseline exists.
 * Super admin only.
 */
export async function GET(request: NextRequest) {
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

    const supabaseAdmin = createAdminClient();

    // Try to fetch existing baseline agent
    const { data: baselineAgent, error: fetchError } = await supabaseAdmin
      .from("ai_agents")
      .select("*")
      .eq("is_baseline", true)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching baseline agent:", fetchError);
    }

    // If no baseline exists, return default template
    if (!baselineAgent) {
      const leadNurtureTemplate = defaultAgents.find(a => a.role === "lead_nurture");

      return NextResponse.json({
        success: true,
        data: {
          agent: {
            ...leadNurtureTemplate,
            is_baseline: true,
            is_template: true, // Flag to indicate this is the default template
          }
        },
        message: "Using default template - no baseline agent configured yet"
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        agent: baselineAgent
      }
    });

  } catch (error: any) {
    console.error("Error in GET /api/admin/baseline-agent:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/baseline-agent
 *
 * Creates or updates the baseline lead nurture agent.
 * Super admin only.
 */
export async function PUT(request: NextRequest) {
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
    const {
      name,
      description,
      system_prompt,
      model_provider,
      model_name,
      temperature,
      max_tokens,
      allowed_tools,
      metadata,
    } = body;

    const supabaseAdmin = createAdminClient();

    // Check if baseline already exists
    const { data: existing } = await supabaseAdmin
      .from("ai_agents")
      .select("id")
      .eq("is_baseline", true)
      .maybeSingle();

    if (existing) {
      // Update existing baseline
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("ai_agents")
        .update({
          name,
          description,
          system_prompt,
          model_provider,
          model_name,
          temperature,
          max_tokens,
          allowed_tools,
          metadata: {
            ...metadata,
            updated_by: user.email,
            updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating baseline agent:", updateError);
        return NextResponse.json(
          { error: "Failed to update baseline agent" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { agent: updated },
        message: "Baseline agent updated successfully"
      });

    } else {
      // Create new baseline (no organization_id for baseline)
      const { data: created, error: createError } = await supabaseAdmin
        .from("ai_agents")
        .insert({
          name,
          description,
          system_prompt,
          model_provider: model_provider || "anthropic",
          model_name: model_name || "claude-3-5-sonnet-20241022",
          temperature: temperature || 0.8,
          max_tokens: max_tokens || 2048,
          allowed_tools: allowed_tools || [],
          is_baseline: true,
          status: "active",
          metadata: {
            ...metadata,
            created_by: user.email,
            is_baseline: true,
          },
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating baseline agent:", createError);
        return NextResponse.json(
          { error: "Failed to create baseline agent" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { agent: created },
        message: "Baseline agent created successfully"
      });
    }

  } catch (error: any) {
    console.error("Error in PUT /api/admin/baseline-agent:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
