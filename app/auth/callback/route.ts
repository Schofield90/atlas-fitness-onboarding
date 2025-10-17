import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPostAuthRedirectUrl,
  UserRole,
  extractSubdomain,
} from "@/lib/auth/domain-redirects";
import { validateRedirectUrl } from "@/lib/security/redirect-validator";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect");
  const rawNext = searchParams.get("next");
  const hostname = request.headers.get("host") || "";

  // Validate and sanitize redirect parameters
  const redirect = validateRedirectUrl(rawRedirect, "/dashboard", hostname);
  const next = validateRedirectUrl(rawNext || rawRedirect, "/", hostname);
  const isSignup = searchParams.get("signup") === "true";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // For Google OAuth, determine if this is an owner or client login
      if (data.user.app_metadata?.provider === "google") {
        const adminSupabase = createAdminClient();

        // IMPORTANT: Check subdomain to enforce portal separation
        const subdomain = extractSubdomain(hostname);

        // First check if user is an owner/admin
        const { data: userOrg } = await adminSupabase
          .from("user_organizations")
          .select("organization_id, role")
          .eq("user_id", data.user.id)
          .single();

        if (userOrg && (userOrg.role === "owner" || userOrg.role === "admin")) {
          // Owner/admin user attempting to access members portal - BLOCK
          if (subdomain === "members") {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              new URL("/simple-login?error=owners_not_allowed", request.url),
            );
          }

          // Owner/admin user - use domain-aware redirect
          const redirectUrl = getPostAuthRedirectUrl(
            "owner" as UserRole,
            hostname,
            redirect,
          );
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        }

        // Check if they own an organization through user_organizations
        const { data: ownedOrgLink } = await adminSupabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", data.user.id)
          .eq("role", "owner")
          .single();

        const ownedOrg = ownedOrgLink
          ? { id: ownedOrgLink.organization_id }
          : null;

        if (ownedOrg) {
          // Owner attempting to access members portal - BLOCK
          if (subdomain === "members") {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              new URL("/simple-login?error=owners_not_allowed", request.url),
            );
          }

          // They own an org, redirect with domain awareness
          const redirectUrl = getPostAuthRedirectUrl(
            "owner" as UserRole,
            hostname,
            redirect,
          );
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        }

        // Not an owner, check if they're a client
        const { data: existingClient } = await adminSupabase
          .from("clients")
          .select("id, user_id, email")
          .ilike("email", data.user.email!)
          .single();

        if (!existingClient) {
          // User doesn't exist in our system, sign them out and redirect with error
          await supabase.auth.signOut();
          const subdomain = extractSubdomain(hostname);
          const errorUrl =
            subdomain === "members"
              ? "/simple-login?error=account_not_found"
              : "/owner-login?error=account_not_found";
          return NextResponse.redirect(new URL(errorUrl, request.url));
        }

        // If client exists but doesn't have user_id, link them
        if (!existingClient.user_id) {
          await adminSupabase
            .from("clients")
            .update({ user_id: data.user.id })
            .eq("id", existingClient.id);
        }

        // Redirect to client portal with domain awareness
        const redirectUrl = getPostAuthRedirectUrl(
          "client" as UserRole,
          hostname,
          "/client/dashboard",
        );
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }

      // If this is a signup, check if we need to create an organization
      if (isSignup) {
        // Check if user already has an organization
        const { data: existingOrgLink } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", data.user.id)
          .eq("role", "owner")
          .single();

        const existingOrg = existingOrgLink
          ? { id: existingOrgLink.organization_id }
          : null;

        if (!existingOrg) {
          // Try to get organization name from user metadata or session storage
          const organizationName =
            data.user.user_metadata?.organization_name || "My Gym";

          // Use admin client to create organization
          const adminSupabase = createAdminClient();
          const { data: org, error: orgError } = await adminSupabase
            .from("organizations")
            .insert({
              name: organizationName,
              subscription_status: "trialing",
            })
            .select()
            .single();

          if (orgError) {
            console.error("Error creating organization:", orgError);
          } else if (org) {
            // Link user to organization as owner
            const { error: linkError } = await adminSupabase
              .from("user_organizations")
              .insert({
                user_id: data.user.id,
                organization_id: org.id,
                role: "owner",
              });

            if (linkError) {
              console.error("Error linking user to organization:", linkError);
            }
          }
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // return the user to an error page with instructions
  const subdomain = extractSubdomain(hostname);
  const errorUrl =
    subdomain === "members"
      ? "/simple-login?error=auth_failed"
      : "/owner-login?error=auth_failed";
  return NextResponse.redirect(new URL(errorUrl, request.url));
}
