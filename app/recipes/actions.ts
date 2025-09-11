"use server";

import { createClient } from "@supabase/supabase-js";

export async function fetchAllRecipes() {
  // Use service role to bypass RLS and get all recipes
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

  const { data: recipes, error } = await supabaseAdmin
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }

  return recipes || [];
}
