import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect");
  const next = searchParams.get("next") ?? redirect ?? "/";
  const isSignup = searchParams.get("signup") === "true";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // If this is a signup, check if we need to create an organization
      if (isSignup) {
        // Check if user already has an organization
        const { data: existingOrg } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", data.user.id)
          .single();

        if (!existingOrg) {
          // Try to get organization name from user metadata or session storage
          const organizationName =
            data.user.user_metadata?.organization_name || "My Gym";

          // Use admin client to create organization
          const adminSupabase = createAdminClient();
          const { error: orgError } = await adminSupabase
            .from("organizations")
            .insert({
              name: organizationName,
              owner_id: data.user.id,
            });

          if (orgError) {
            console.error("Error creating organization:", orgError);
          }
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(new URL("/login", request.url));
}
