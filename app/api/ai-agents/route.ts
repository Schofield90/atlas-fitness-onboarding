import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  role: z.enum(["customer_support", "financial", "social_media", "custom"]),
  system_prompt: z.string().min(1),
  model: z.enum([
    "gpt-5",
    "gpt-5-mini",
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
  ]),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(32000).optional(),
  allowed_tools: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";

    let query = supabase
      .from("ai_agents")
      .select("*")
      .or(`organization_id.eq.${organizationId},is_default.eq.true`)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (enabledOnly) {
      query = query.eq("enabled", true);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error("Error fetching agents:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch agents" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { id: userId, organizationId } = await requireAuth();
    const supabase = createAdminClient();

    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .insert({
        organization_id: organizationId,
        name: validatedData.name,
        description: validatedData.description,
        role: validatedData.role,
        system_prompt: validatedData.system_prompt,
        model: validatedData.model,
        temperature: validatedData.temperature ?? 0.7,
        max_tokens: validatedData.max_tokens ?? 4000,
        allowed_tools: validatedData.allowed_tools ?? [],
        is_default: false,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating agent:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create agent" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/ai-agents:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
