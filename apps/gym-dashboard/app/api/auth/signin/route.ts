import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate email domain
    if (!email.endsWith("@gymleadhub.co.uk")) {
      return NextResponse.json(
        { error: "Access restricted to @gymleadhub.co.uk email addresses" },
        { status: 403 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    // Verify user email is sam@gymleadhub.co.uk
    if (data.user.email?.toLowerCase() !== "sam@gymleadhub.co.uk") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "You do not have admin access to this platform" },
        { status: 403 }
      );
    }

    // Session is now set via cookies by the Supabase client
    // Return success - let client handle redirect
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error: any) {
    console.error("Signin API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
