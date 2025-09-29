import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get total count of recipes
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("recipes")
      .select("*", { count: "exact", head: true });

    // Get first 10 recipes to see their structure
    const { data: recipes, error: fetchError } = await supabaseAdmin
      .from("recipes")
      .select("*")
      .limit(10);

    // Check for any recipes without service role
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: userRecipes, error: userError } = await supabase
      .from("recipes")
      .select("*")
      .limit(10);

    return NextResponse.json({
      success: true,
      totalRecipes: totalCount || 0,
      recipes: recipes || [],
      userAccessibleRecipes: userRecipes || [],
      errors: {
        countError,
        fetchError,
        userError,
      },
    });
  } catch (error) {
    console.error("Error checking recipes:", error);
    return NextResponse.json(
      { error: "Failed to check recipes", details: error },
      { status: 500 },
    );
  }
}
