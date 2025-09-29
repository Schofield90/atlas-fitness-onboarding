import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { Resend } from "resend";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  console.log("=== SEND-MAGIC-LINK ENDPOINT HIT ===");
  console.log("This is the NEW magic link endpoint");

  try {
    const body = await request.json();
    const { customerId, email, name } = body;

    if (!customerId || !email) {
      return NextResponse.json(
        { error: "Customer ID and email are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get the current user and their organization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get organization details
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const { data: organization } = await supabase
      .from("organizations")
      .select("name, settings")
      .eq("id", userOrg.organization_id)
      .single();

    // Check if a token already exists for this client
    const { data: existingToken } = await supabase
      .from("account_claim_tokens")
      .select("token, claimed_at")
      .eq("client_id", customerId)
      .single();

    let claimToken: string;
    let isNewToken = false;

    if (existingToken && !existingToken.claimed_at) {
      // Use existing unclaimed token
      claimToken = existingToken.token;
      console.log("Using existing permanent token for client:", customerId);
    } else if (existingToken && existingToken.claimed_at) {
      // Token was already claimed, can't send another
      return NextResponse.json(
        { error: "This client has already claimed their account" },
        { status: 400 },
      );
    } else {
      // Generate a secure permanent token - unique per client
      const generateToken = () => {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        return Buffer.from(bytes)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
      };

      claimToken = generateToken();
      isNewToken = true;

      // Store permanent token in database (no expiry)
      const { error: tokenError } = await supabase
        .from("account_claim_tokens")
        .insert({
          client_id: customerId,
          organization_id: userOrg.organization_id,
          token: claimToken,
          email: email,
          expires_at: null, // No expiry - permanent until used
          metadata: {
            created_by: user.id,
            customer_name: name,
          },
        });

      if (tokenError) {
        console.error("Error creating claim token:", tokenError);
        return NextResponse.json(
          { error: "Failed to create claim token: " + tokenError.message },
          { status: 500 },
        );
      }
      console.log("Created new permanent token for client:", customerId);
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app";

    // Create the magic link
    const magicLink = `${appUrl}/claim-account?token=${claimToken}`;
    console.log("Generated magic link:", magicLink);

    if (!resend) {
      // No email service, return the link
      return NextResponse.json({
        success: true,
        message: "Magic link generated (email service not configured)",
        magicLink,
        permanent: true,
        note: "Share this link with the customer - it will remain active until used",
      });
    }

    // Send the email with magic link
    let fromEmail = "sam@email.gymleadhub.co.uk";
    const fromName = organization?.name || "Gym Lead Hub";

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Activate Your Account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ${organization?.name || "Gym Lead Hub"}!</h2>
          <p>Hi ${name},</p>
          <p>Your account is ready! Click the button below to set your password and get started:</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Activate My Account
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6; font-size: 14px;">${magicLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">This is your personal account activation link. It will remain active until you use it to set up your account. If you didn't request this account, you can safely ignore this email.</p>
        </div>
      `,
      text: `Welcome to ${organization?.name || "Gym Lead Hub"}!\n\nHi ${name},\n\nYour account is ready! Click the link below to set your password and get started:\n\n${magicLink}\n\nThis is your personal account activation link. It will remain active until you use it.\n\nBest regards,\nThe ${organization?.name || "Gym Lead Hub"} Team`,
    });

    if (emailError) {
      console.error("Email error (will retry with resend.dev):", emailError);

      // Retry with resend.dev
      fromEmail = "onboarding@resend.dev";
      const retryResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Activate Your Account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to ${organization?.name || "Gym Lead Hub"}!</h2>
            <p>Hi ${name},</p>
            <p>Your account is ready! Click the button below to set your password and get started:</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${magicLink}" style="background-color: #3B82F6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Activate My Account
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link into your browser:</p>
            <p style="word-break: break-all; color: #3B82F6; font-size: 14px;">${magicLink}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">This is your personal account activation link. It will remain active until you use it to set up your account. If you didn't request this account, you can safely ignore this email.</p>
          </div>
        `,
        text: `Welcome to ${organization?.name || "Gym Lead Hub"}!\n\nHi ${name},\n\nYour account is ready! Click the link below to set your password and get started:\n\n${magicLink}\n\nThis is your personal account activation link. It will remain active until you use it.\n\nBest regards,\nThe ${organization?.name || "Gym Lead Hub"} Team`,
      });

      if (retryResult.error) {
        console.error("Retry also failed:", retryResult.error);
      }
    }

    // Update client metadata
    await supabase
      .from("clients")
      .update({
        metadata: {
          magic_link_sent: new Date().toISOString(),
          welcome_email_sent: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    // Log the activity
    await supabase.from("activity_logs").insert({
      organization_id: userOrg.organization_id,
      lead_id: customerId,
      type: "magic_link_sent",
      description: `Magic link sent to ${name} (${email})`,
      metadata: {
        email_id: emailData?.id,
        sent_by: user.id,
        permanent_link: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Magic link sent successfully!",
      magicLink, // Return for testing
      permanent: true,
      emailSent: !!emailData,
    });
  } catch (error) {
    console.error("Error in send-magic-link API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
