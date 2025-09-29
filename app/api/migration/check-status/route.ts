import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const organizationId =
      userOrg?.organization_id || "63589490-8f55-4157-bd3a-e141594b748e";

    // Get counts
    const { count: clientCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: paymentCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    // Get recent migration job
    const { data: recentJob } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get sample of recent clients
    const { data: recentClients } = await supabase
      .from("clients")
      .select("id, name, email, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get sample of recent bookings
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("id, booking_date, booking_type, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      organizationId,
      counts: {
        clients: clientCount || 0,
        bookings: bookingCount || 0,
        payments: paymentCount || 0,
      },
      recentJob: recentJob
        ? {
            id: recentJob.id,
            status: recentJob.status,
            created: recentJob.created_at,
            completed: recentJob.completed_at,
            metadata: recentJob.metadata,
          }
        : null,
      samples: {
        clients: recentClients || [],
        bookings: recentBookings || [],
      },
    });
  } catch (error: any) {
    console.error("Check status error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to check status",
    });
  }
}
