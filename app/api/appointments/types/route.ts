import { NextRequest, NextResponse } from "next/server";
import { handleApiRoute, supabaseAdmin } from "@/lib/api/middleware";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req;

    // Fetch all programs/appointment types for the organization
    const { data: appointmentTypes, error } = await supabaseAdmin
      .from("programs")
      .select(
        `
        id,
        name,
        description,
        duration_weeks,
        price_pennies,
        max_participants,
        program_type,
        is_active,
        created_at,
        updated_at,
        class_sessions:class_sessions(count)
      `,
      )
      .eq("organization_id", user.organization_id)
      .eq("is_active", true)
      .order("name");

    if (error) {
      throw new Error("Failed to fetch appointment types");
    }

    // Transform the data to include session counts and format pricing
    const typesWithCounts =
      appointmentTypes?.map((type) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        duration_weeks: type.duration_weeks,
        price: {
          amount: type.price_pennies || 0,
          currency: "GBP",
          formatted: type.price_pennies
            ? `£${(type.price_pennies / 100).toFixed(2)}`
            : "Free",
        },
        max_participants: type.max_participants,
        program_type: type.program_type,
        session_count: type.class_sessions?.[0]?.count || 0,
        is_active: type.is_active,
        created_at: type.created_at,
        updated_at: type.updated_at,
      })) || [];

    // Group by program type for easier consumption
    const groupedByType = typesWithCounts.reduce(
      (groups, type) => {
        const programType = type.program_type || "other";
        if (!groups[programType]) {
          groups[programType] = [];
        }
        groups[programType].push(type);
        return groups;
      },
      {} as Record<string, typeof typesWithCounts>,
    );

    return NextResponse.json({
      appointment_types: typesWithCounts,
      grouped_by_type: groupedByType,
      total: typesWithCounts.length,
      summary: {
        by_type: Object.keys(groupedByType).map((type) => ({
          type,
          count: groupedByType[type].length,
        })),
      },
    });
  });
}
