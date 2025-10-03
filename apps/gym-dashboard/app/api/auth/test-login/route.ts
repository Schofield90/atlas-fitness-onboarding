import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const supabase = await createClient();

    // Test standard Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    // Check organization membership
    const { data: staffData } = await supabase
      .from("organization_staff")
      .select("organization_id, role")
      .eq("user_id", data.user!.id)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      organization: staffData,
      session: data.session ? "Active" : "None",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
    });
  }
}
