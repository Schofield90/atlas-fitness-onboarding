import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();
    console.log("[GET /api/customer-memberships/[id]] Auth successful:", {
      userId: user.id,
      organizationId: user.organizationId,
    });

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    const { id: membershipId } = await params;

    console.log("[GET /api/customer-memberships/[id]] Fetching membership:", {
      membershipId,
      organizationId: user.organizationId,
    });

    // Fetch membership with related data
    const { data, error } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plan:membership_plans(*),
        client:clients(first_name, last_name, email)
      `,
      )
      .eq("id", membershipId)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .single();

    if (error) {
      console.error(
        "[GET /api/customer-memberships/[id]] Query error:",
        error,
      );
      return NextResponse.json(
        { error: "Membership not found or unauthorized" },
        { status: 404 },
      );
    }

    console.log("[GET /api/customer-memberships/[id]] Membership found:", {
      membershipId: data.id,
      planName: data.membership_plan?.name,
      clientName: `${data.client?.first_name} ${data.client?.last_name}`,
    });

    return NextResponse.json({ membership: data });
  } catch (error) {
    console.error(
      "[GET /api/customer-memberships/[id]] Error fetching membership:",
      error,
    );
    return createErrorResponse(error);
  }
}
