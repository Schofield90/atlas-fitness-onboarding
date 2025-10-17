import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 },
      );
    }

    // Decode the token to get the member ID
    let memberId: string;
    let timestamp: number;

    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      memberId = parts[0];
      timestamp = parseInt(parts[2]);

      // Check if token is expired (7 days)
      const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - timestamp > expiryTime) {
        return NextResponse.json(
          { message: "This claim link has expired" },
          { status: 400 },
        );
      }
    } catch (err) {
      return NextResponse.json(
        { message: "Invalid claim link format" },
        { status: 400 },
      );
    }

    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Find the member by ID
    const { data: member, error } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name, user_id, metadata")
      .eq("id", memberId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { message: "Invalid or expired claim link" },
        { status: 404 },
      );
    }

    // Check if the token matches what we stored (if it exists in metadata)
    if (member.metadata?.claim_token && member.metadata.claim_token !== token) {
      return NextResponse.json(
        { message: "Invalid claim link" },
        { status: 400 },
      );
    }

    // Check if already claimed
    if (member.user_id) {
      return NextResponse.json(
        { message: "This account has already been claimed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
