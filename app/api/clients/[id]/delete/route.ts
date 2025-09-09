import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    // Check if the client belongs to the user's organization
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, user_id, organization_id")
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 },
      );
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

    // Delete bookings
    await supabase.from("bookings").delete().eq("customer_id", params.id);

    // Delete activity logs
    await supabase.from("activity_logs").delete().eq("lead_id", params.id);

    // Delete client portal access
    await supabase
      .from("client_portal_access")
      .delete()
      .eq("client_id", params.id);

    // Finally, delete the client record
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id);

    if (deleteError) {
      console.error("Error deleting client:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete client", details: deleteError },
        { status: 500 },
      );
    }

    // Log the deletion
    await supabase.from("activity_logs").insert({
      organization_id: userOrg.organization_id,
      type: "client_deleted",
      description: `Client deleted by ${user.email}`,
      metadata: {
        client_id: params.id,
        deleted_by: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Error in delete client API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
