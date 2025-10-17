import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { clearUserCache } from "@/app/lib/api/auth-check";
import { blockInProduction } from "../production-check";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function POST() {
  // Block in production
  const productionBlock = blockInProduction();
  if (productionBlock) return productionBlock;
  try {
    const supabase = await createClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError?.message || "No user session",
      });
    }

    // Clear the cache for this user
    clearUserCache(user.id);

    return NextResponse.json({
      success: true,
      message: "Auth cache cleared for user",
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
