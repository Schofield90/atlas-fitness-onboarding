import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Check if environment variables are loaded
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    hasSupabaseUrl,
    hasServiceRoleKey,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    nodeEnv: process.env.NODE_ENV,
  });
}
