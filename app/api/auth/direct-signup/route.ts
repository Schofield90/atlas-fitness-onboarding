import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email, password, name, organizationName } = await request.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // First, try the normal auth flow
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          organization_name: organizationName,
        },
      });

    if (authError) {
      console.error("Admin create user error:", authError);

      // For now, we can't create users without auth working
      // Return a clear message to the user
      return NextResponse.json(
        {
          error:
            "Authentication service is currently unavailable. Please try again later or contact support.",
          details: {
            message: "Supabase Auth is returning 500 errors",
            suggestion:
              "The authentication service needs to be fixed in the Supabase dashboard",
          },
        },
        { status: 503 },
      );
    }

    // Auth succeeded
    if (authData?.user) {
      const userId = authData.user.id;

      // Use the database function to create user and organization atomically
      const { data: result, error: createError } = await supabase.rpc(
        "create_user_and_org",
        {
          p_user_id: userId,
          p_email: authData.user.email || email,
          p_name: name || email.split("@")[0],
          p_org_name: organizationName || "My Gym",
        },
      );

      if (createError) {
        console.error("Error creating user and organization:", createError);
        return NextResponse.json(
          {
            error: "Failed to create user and organization",
            details: createError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        userId: userId,
        organizationId: result?.organization_id,
        message: "Account created successfully",
      });
    }

    return NextResponse.json(
      {
        error: "Failed to create account",
      },
      { status: 500 },
    );
  } catch (error: any) {
    console.error("Direct signup error:", error);
    return NextResponse.json(
      {
        error: "Server error during signup",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
