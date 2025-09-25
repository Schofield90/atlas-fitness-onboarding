import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, name, organizationName } = await request.json();
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create user record with proper error handling
    const { data: userData, error: userError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email || email,
      })
      .select()
      .single();

    if (userError) {
      console.error("User creation error:", userError);

      // Try without upsert
      const { data: existingUser } = await supabase
        .from("users")
        .select()
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        // Insert without upsert
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || email,
        });

        if (insertError) {
          return NextResponse.json(
            {
              error: "Failed to create user record",
              details: insertError,
            },
            { status: 500 },
          );
        }
      }
    }

    // Create organization if provided
    if (organizationName) {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (!orgError && org) {
        // Link user to organization
        await supabase.from("user_organizations").insert({
          user_id: user.id,
          organization_id: org.id,
          role: "owner",
        });
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "User setup completed",
    });
  } catch (error: any) {
    console.error("Fix signup error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix signup",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
