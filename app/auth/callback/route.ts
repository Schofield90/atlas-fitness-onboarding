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
      // For Google OAuth, check if user has an existing client account
      if (data.user.app_metadata?.provider === "google") {
        const adminSupabase = createAdminClient();

        // Check if this user exists in our clients table
        const { data: existingClient } = await adminSupabase
          .from("clients")
          .select("id, user_id, email")
          .ilike("email", data.user.email!)
          .single();

        if (!existingClient) {
          // User doesn't exist in our system, sign them out and redirect with error
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL("/simple-login?error=account_not_found", request.url),
          );
        }

        // If client exists but doesn't have user_id, link them
        if (!existingClient.user_id) {
          await adminSupabase
            .from("clients")
            .update({ user_id: data.user.id })
            .eq("id", existingClient.id);
        }

        // Redirect to client portal for Google OAuth users
        return NextResponse.redirect(new URL("/client", request.url));
      }

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
  return NextResponse.redirect(
    new URL("/simple-login?error=auth_failed", request.url),
  );
}
