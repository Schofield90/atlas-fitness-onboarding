import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  requireAuthWithOrg,
  createErrorResponse,
} from "@/app/lib/api/auth-check-org";
import {
  secureDelete,
  secureUpdate,
  createSecureResponse,
} from "@/app/lib/api/secure-delete";
import { z } from "zod";

// Input validation schemas
const updateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  lead_score: z.number().min(0).max(100).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg();

    const supabase = createClient();
    const { id } = await params;

    // Validate UUID format to prevent injection
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid lead ID format" },
        { status: 400 },
      );
    }

    // Fetch the specific lead - CRITICAL: Include organization check
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("organization_id", user.organizationId) // SECURITY: Only get lead from user's org
      .single();

    if (error || !lead) {
      // Don't reveal if lead exists in another organization
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg();

    const supabase = createClient();
    const { id } = await params;
    const body = await request.json();

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid lead ID format" },
        { status: 400 },
      );
    }

    // Validate input data
    const validatedData = updateLeadSchema.parse(body);

    // Use secure update to ensure organization ownership
    const result = await secureUpdate({
      table: "leads",
      id,
      organizationId: user.organizationId,
      data: {
        ...validatedData,
        updated_at: new Date().toISOString(),
      },
      supabase,
    });

    return createSecureResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and get organization
    const user = await requireAuthWithOrg();

    const supabase = createClient();
    const { id } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid lead ID format" },
        { status: 400 },
      );
    }

    // Use secure delete to ensure organization ownership
    const result = await secureDelete({
      table: "leads",
      id,
      organizationId: user.organizationId,
      supabase,
    });

    return createSecureResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
