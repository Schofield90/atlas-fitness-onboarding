import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Directly log in sam@atlas-gyms.co.uk
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "sam@atlas-gyms.co.uk",
      password: "Gyms2020!",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (data.session) {
      // Set the session cookies
      const cookieStore = await cookies();
      cookieStore.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      cookieStore.set("sb-refresh-token", data.session.refresh_token || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    // Redirect to dashboard
    return NextResponse.redirect(
      new URL("/dashboard", "http://localhost:3000"),
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
