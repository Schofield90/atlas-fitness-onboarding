import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
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

    // Get the member details
    const { data: member, error: fetchError } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name, org_id")
      .eq("id", memberId)
      .single();

    if (fetchError || !member) {
      console.error("Error fetching member:", fetchError);
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Generate a unique token that includes the member ID and a random component
    // Format: base64(memberId:randomString:timestamp)
    const randomString = randomBytes(16).toString("hex");
    const timestamp = Date.now();
    const tokenData = `${memberId}:${randomString}:${timestamp}`;
    const token = Buffer.from(tokenData).toString("base64url");

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store token in metadata (since claim_token column might not exist yet)
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        metadata: {
          ...(member.metadata || {}),
          claim_token: token,
          claim_token_expires_at: expiresAt.toISOString(),
          claim_email_sent_at: new Date().toISOString(),
        },
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error storing claim token:", updateError);
      // Continue anyway - we can still validate using the member ID
    }

    // Generate the claim URL - always use the main domain for claim pages
    const hostname = request.headers.get("host") || "";
    const isProduction =
      hostname.includes("gymleadhub.co.uk") || hostname.includes("vercel.app");

    // In production, always use the main members portal URL for claim links
    // This ensures the claim page is accessible regardless of which subdomain generated the link
    const baseUrl = isProduction
      ? process.env.NEXT_PUBLIC_SITE_URL || "https://members.gymleadhub.co.uk"
      : process.env.NEXT_PUBLIC_APP_URL ||
        `http://${hostname}` ||
        "http://localhost:3000";

    const claimUrl = `${baseUrl}/claim/${token}`;

    return NextResponse.json({
      success: true,
      claimUrl,
      expiresAt: expiresAt.toISOString(),
      member: {
        id: member.id,
        email: member.email,
        name: `${member.first_name} ${member.last_name}`.trim(),
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
