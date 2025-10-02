import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { headers } from "next/headers";

// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  try {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const isAdminPortal = host.includes("admin.gymleadhub.co.uk");

    const supabase = await createClient();
    const params = await searchParams;

    // Handle OAuth callback if code is present
    if (params.code) {
      const { error: sessionError } =
        await supabase.auth.exchangeCodeForSession(params.code);
      if (!sessionError) {
        redirect(isAdminPortal ? "/admin" : "/dashboard");
      }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth error on home page:", error);
      redirect(isAdminPortal ? "/signin" : "/landing");
    }

    if (user) {
      // Check if admin user on admin portal
      if (isAdminPortal) {
        if (user.email?.toLowerCase() === "sam@gymleadhub.co.uk") {
          redirect("/admin");
        } else {
          redirect("/signin"); // Non-admin on admin portal
        }
      } else {
        redirect("/dashboard");
      }
    } else {
      redirect(isAdminPortal ? "/signin" : "/landing");
    }
  } catch (error) {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const isAdminPortal = host.includes("admin.gymleadhub.co.uk");

    console.error("Error on home page:", error);
    console.error("Host:", host, "Is admin portal:", isAdminPortal);

    redirect(isAdminPortal ? "/signin" : "/landing");
  }
}
