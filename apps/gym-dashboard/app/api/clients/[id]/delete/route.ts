import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check if the record exists in clients table first
    let { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, user_id, org_id")
      .eq("id", params.id)
      .eq("org_id", userOrg.organization_id)
      .single();

    // If not in clients, check leads table
    let isLead = false;
    if (clientError || !client) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id, user_id, organization_id")
        .eq("id", params.id)
        .eq("organization_id", userOrg.organization_id)
        .single();

      if (leadError || !lead) {
        return NextResponse.json(
          { error: "Member not found or access denied" },
          { status: 404 },
        );
      }

      // Map lead data to client structure
      client = {
        id: lead.id,
        user_id: lead.user_id,
        org_id: lead.organization_id,
      };
      isLead = true;
    }

    // Create admin client for auth user deletion
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Delete auth user if exists
    if (client.user_id) {
      try {
        const { error: deleteAuthError } =
          await supabaseAdmin.auth.admin.deleteUser(client.user_id);
        if (deleteAuthError) {
          console.error("Error deleting auth user:", deleteAuthError);
          // Continue even if auth user deletion fails
        }
      } catch (error) {
        console.error("Error deleting auth user:", error);
        // Continue even if auth user deletion fails
      }
    }

    // Delete related data in order (handle foreign key constraints)

    // Delete account claim tokens
    await supabase
      .from("account_claim_tokens")
      .delete()
      .eq("client_id", params.id);

    // Delete body composition records
    await supabase.from("body_composition").delete().eq("client_id", params.id);

    // Get all bookings for this client to update class session counts
    const { data: clientBookings } = await supabase
      .from("bookings")
      .select("class_session_id")
      .eq("client_id", params.id)
      .eq("status", "confirmed");

    const { data: classBookings } = await supabase
      .from("class_bookings")
      .select("class_session_id")
      .or(`client_id.eq.${params.id},customer_id.eq.${params.id}`)
      .eq("booking_status", "confirmed");

    // Delete bookings from the bookings table (uses client_id)
    await supabase.from("bookings").delete().eq("client_id", params.id);

    // Delete bookings from class_bookings table (uses either client_id or customer_id)
    await supabase.from("class_bookings").delete().eq("client_id", params.id);
    await supabase.from("class_bookings").delete().eq("customer_id", params.id);

    // Delete recurring bookings if they exist
    await supabase
      .from("recurring_bookings")
      .delete()
      .eq("client_id", params.id);
    await supabase
      .from("recurring_bookings")
      .delete()
      .eq("customer_id", params.id);

    // Delete class attendance records if they exist
    await supabase.from("class_attendance").delete().eq("client_id", params.id);
    await supabase
      .from("class_attendance")
      .delete()
      .eq("customer_id", params.id);

    // Update class session booking counts for any sessions this client was booked in
    const sessionIds = new Set<string>();

    // Collect all affected session IDs
    if (clientBookings) {
      clientBookings.forEach((booking) => {
        if (booking.class_session_id) {
          sessionIds.add(booking.class_session_id);
        }
      });
    }

    if (classBookings) {
      classBookings.forEach((booking) => {
        if (booking.class_session_id) {
          sessionIds.add(booking.class_session_id);
        }
      });
    }

    // Update the booking counts for affected sessions
    for (const sessionId of sessionIds) {
      // Count remaining bookings for this session
      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("class_session_id", sessionId)
        .eq("status", "confirmed");

      const { count: classBookingCount } = await supabase
        .from("class_bookings")
        .select("*", { count: "exact", head: true })
        .eq("class_session_id", sessionId)
        .eq("booking_status", "confirmed");

      const totalBookings = (bookingCount || 0) + (classBookingCount || 0);

      // Update the session with the new count
      await supabase
        .from("class_sessions")
        .update({ current_bookings: totalBookings })
        .eq("id", sessionId);
    }

    // Delete activity logs
    await supabase.from("activity_logs").delete().eq("lead_id", params.id);

    // Delete customer notes - check both customer_id and client_id
    await supabase.from("customer_notes").delete().eq("customer_id", params.id);
    await supabase.from("customer_notes").delete().eq("client_id", params.id);

    // Delete customer memberships
    await supabase
      .from("customer_memberships")
      .delete()
      .eq("customer_id", params.id);
    await supabase
      .from("customer_memberships")
      .delete()
      .eq("client_id", params.id);

    // Delete customer waivers
    await supabase
      .from("customer_waivers")
      .delete()
      .eq("customer_id", params.id);
    await supabase.from("customer_waivers").delete().eq("client_id", params.id);

    // Delete client portal access
    await supabase
      .from("client_portal_access")
      .delete()
      .eq("client_id", params.id);

    // Finally, delete the client or lead record
    if (isLead) {
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .eq("id", params.id)
        .eq("organization_id", userOrg.organization_id);

      if (deleteError) {
        console.error("Error deleting lead:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete member", details: deleteError },
          { status: 500 },
        );
      }
    } else {
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", params.id)
        .eq("org_id", userOrg.organization_id);

      if (deleteError) {
        console.error("Error deleting client:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete member", details: deleteError },
          { status: 500 },
        );
      }
    }

    // Log the deletion
    await supabase.from("activity_logs").insert({
      organization_id: userOrg.organization_id,
      type: isLead ? "lead_deleted" : "client_deleted",
      description: `${isLead ? "Lead" : "Client"} deleted by ${user.email}`,
      metadata: {
        record_id: params.id,
        record_type: isLead ? "lead" : "client",
        deleted_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    console.error("Error in delete client API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
