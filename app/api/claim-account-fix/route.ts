import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
    } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // No admin client needed - we'll use regular signup flow

    // First, fetch just the token
    const { data: tokenData, error: tokenError } = await supabase
      .from("account_claim_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 400 },
      );
    }

    // Check if already claimed
    if (tokenData.claimed_at) {
      return NextResponse.json(
        { error: "This account has already been claimed" },
        { status: 400 },
      );
    }

    // Now fetch the client separately
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", tokenData.client_id)
      .single();

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      console.error("Token data:", tokenData);
      return NextResponse.json(
        { error: "Client not found for this token" },
        { status: 404 },
      );
    }

    // Try to sign up the user using regular auth flow
    console.log("Attempting to create new user for:", tokenData.email);

    // Simple signup without any fancy options
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tokenData.email,
      password: password,
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      console.error("Full error object:", JSON.stringify(authError, null, 2));

      // Return the actual error for debugging
      return NextResponse.json(
        {
          error: authError.message || "Failed to create account",
          code: authError.code,
          status: authError.status,
          details: "Check Vercel logs for full error details",
        },
        { status: 500 },
      );
    }

    // Check if we got a user back
    if (!authData?.user) {
      console.log("No user returned from signup, but no error either");
      console.log("Auth data:", authData);
    }

    const userId = authData?.user?.id || client.user_id;

    // Update client record with user_id and additional info
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        user_id: userId,
        first_name: firstName || client.first_name,
        last_name: lastName || client.last_name,
        phone: phone || client.phone,
        date_of_birth: dateOfBirth || client.date_of_birth,
        emergency_contact_name:
          emergencyContactName || client.emergency_contact_name,
        emergency_contact_phone:
          emergencyContactPhone || client.emergency_contact_phone,
        status: "active",
        metadata: {
          ...client.metadata,
          account_claimed_at: new Date().toISOString(),
          claim_token_used: token,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      // Don't fail the whole process if client update fails
    }

    // Mark token as claimed
    const { error: claimError } = await supabase
      .from("account_claim_tokens")
      .update({
        claimed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (claimError) {
      console.error("Error marking token as claimed:", claimError);
      // Don't fail the whole process if token update fails
    }

    // Log the activity
    await supabase.from("activity_logs").insert({
      organization_id: tokenData.organization_id,
      lead_id: client.id,
      type: "account_claimed",
      description: `Account claimed by ${firstName || client.first_name} ${lastName || client.last_name} (${tokenData.email})`,
      metadata: {
        token_id: tokenData.id,
        user_id: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account successfully claimed",
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Error in claim-account API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
