import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const profileId = request.nextUrl.searchParams.get("profileId");
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Profile ID is required" },
        { status: 400 },
      );
    }

    // Get preferences
    const { data: preferences, error } = await supabase
      .from("nutrition_preferences")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is ok
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: preferences || {},
    });
  } catch (error: any) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch preferences",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { profileId, ...preferences } = body;

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Profile ID is required" },
        { status: 400 },
      );
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from("nutrition_preferences")
      .upsert({
        profile_id: profileId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error saving preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save preferences",
      },
      { status: 500 },
    );
  }
}
