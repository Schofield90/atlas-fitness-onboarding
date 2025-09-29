import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with organization settings
    const { data: profile, error } = await supabase
      .from("users")
      .select(
        `
        *,
        organization_members!inner(
          organization_id,
          organizations(
            name,
            settings,
            phone,
            whatsapp_number
          )
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        email: user.email,
        phone: "",
        whatsapp: "",
      });
    }

    // Extract organization phone numbers if available
    const org = profile.organization_members?.[0]?.organizations;

    return NextResponse.json({
      id: profile.id,
      email: profile.email || user.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone || org?.phone || "",
      whatsapp: profile.whatsapp || org?.whatsapp_number || org?.phone || "",
      organization: org?.name,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 },
    );
  }
}
