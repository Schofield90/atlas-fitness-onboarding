import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({
      authenticated: false,
      error: error?.message || "Not authenticated",
    });
  }

  // Check what type of user this is
  const { data: userOrg } = await supabase
    .from("user_organizations")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id, first_name, last_name, org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    userType: clientRecord
      ? "client"
      : ownedOrg || userOrg
        ? "owner"
        : "unknown",
    organization: {
      fromUserOrgs: userOrg,
      fromOwnership: ownedOrg,
      clientOrg: clientRecord?.org_id,
    },
  });
}
