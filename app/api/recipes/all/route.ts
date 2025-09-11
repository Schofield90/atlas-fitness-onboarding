import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search") || "";
    const mealType = searchParams.get("mealType") || "all";
    const sortBy = searchParams.get("sortBy") || "created_at";

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    let query = supabaseAdmin.from("recipes").select("*");

    // Apply filters
    if (mealType !== "all") {
      query = query.eq("meal_type", mealType);
    }

    if (searchTerm) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    // Sorting
    switch (sortBy) {
      case "rating":
        query = query.order("rating", { ascending: false });
        break;
      case "popular":
        query = query.order("times_used", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "quickest":
        query = query.order("prep_time", { ascending: true });
        break;
      case "calories":
        query = query.order("calories", { ascending: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data: recipes, error } = await query.limit(100);

    if (error) {
      console.error("Error fetching recipes:", error);
      return NextResponse.json(
        { error: "Failed to fetch recipes", details: error },
        { status: 500 },
      );
    }

    console.log(`Fetched ${recipes?.length || 0} recipes from database`);

    return NextResponse.json({
      success: true,
      recipes: recipes || [],
      count: recipes?.length || 0,
    });
  } catch (error) {
    console.error("Error in recipes API:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
