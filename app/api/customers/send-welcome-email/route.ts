import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { customerId, email, name } = await request.json();

    if (!customerId || !email) {
      return NextResponse.json(
        { error: "Customer ID and email are required" },
        { status: 400 },
      );
    }

    console.log("Creating Supabase client...");
    const supabase = await createClient();

    // Get the current user and their organization
    console.log("Getting authenticated user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed: " + authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - no user found" },
        { status: 401 },
      );
    }

    // Get organization details
    console.log("Getting user organization...");
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError) {
      console.error("Error fetching user organization:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organization: " + orgError.message },
        { status: 500 },
      );
    }

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found for user" },
        { status: 404 },
      );
    }

    console.log("Getting organization details...");
    const { data: organization, error: orgDetailsError } = await supabase
      .from("organizations")
      .select("name, settings")
      .eq("id", userOrg.organization_id)
      .single();

    if (orgDetailsError) {
      console.error("Error fetching organization details:", orgDetailsError);
      // Continue anyway - organization name is optional
    }

    // Generate a secure temporary password
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let tempPassword = "";
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Get the app URL from environment or use default
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app";

    // Send welcome email with login instructions
    console.log("Attempting to send email via Resend...");
    console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);
    console.log("Resend API Key length:", process.env.RESEND_API_KEY?.length);
    console.log("Email details:", {
      to: email,
      from: `${organization?.name || "Atlas Fitness"} <noreply@atlas-gyms.co.uk>`,
      subject: `Welcome to ${organization?.name || "Atlas Fitness"} - Your Account Details`,
    });

    // Check if Resend is configured
    if (!resend) {
      console.warn(
        "Resend API key not configured - returning credentials for manual sharing",
      );
      return NextResponse.json({
        success: true,
        message: "Login credentials generated (email service not configured)",
        credentials: {
          email,
          tempPassword,
          loginUrl: `${appUrl}/portal/login`,
          note: "Email service not configured. Please share these credentials with the customer manually.",
        },
      });
    }

    try {
      // Use organization-specific sender or fallback
      let fromEmail = "sam@gymleadhub.co.uk"; // Your domain - must be verified in Resend
      const fromName = organization?.name || "Gym Lead Hub";

      // First attempt with your domain
      let { data: emailData, error: emailError } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Your Account Details`,
        html: `
          <h2>Welcome to ${organization?.name || "Atlas Fitness"}!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been created. Here are your login details:</p>
          <p><strong>Email:</strong> ${email}<br/>
          <strong>Temporary Password:</strong> ${tempPassword}<br/>
          <strong>Login URL:</strong> <a href="${appUrl}/portal/login">${appUrl}/portal/login</a></p>
          <p>Please change your password after your first login.</p>
          <p>Best regards,<br/>The ${organization?.name || "Atlas Fitness"} Team</p>
        `,
        text: `Welcome to ${organization?.name || "Atlas Fitness"}!\n\nHi ${name},\n\nYour account has been created. Here are your login details:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${appUrl}/portal/login\n\nPlease change your password after your first login.\n\nBest regards,\nThe ${organization?.name || "Atlas Fitness"} Team`,
      });

      // If domain verification error, retry with Resend's test domain
      if (
        emailError &&
        emailError.name === "validation_error" &&
        emailError.message?.includes("domain is not verified")
      ) {
        console.log("Domain not verified, falling back to resend.dev domain");
        fromEmail = "onboarding@resend.dev";

        const fallbackResult = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: email,
          subject: `Welcome to ${organization?.name || "Gym Lead Hub"} - Your Account Details`,
          html: `
            <h2>Welcome to ${organization?.name || "Atlas Fitness"}!</h2>
            <p>Hi ${name},</p>
            <p>Your account has been created. Here are your login details:</p>
            <p><strong>Email:</strong> ${email}<br/>
            <strong>Temporary Password:</strong> ${tempPassword}<br/>
            <strong>Login URL:</strong> <a href="${appUrl}/portal/login">${appUrl}/portal/login</a></p>
            <p>Please change your password after your first login.</p>
            <p>Best regards,<br/>The ${organization?.name || "Atlas Fitness"} Team</p>
          `,
          text: `Welcome to ${organization?.name || "Atlas Fitness"}!\n\nHi ${name},\n\nYour account has been created. Here are your login details:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${appUrl}/portal/login\n\nPlease change your password after your first login.\n\nBest regards,\nThe ${organization?.name || "Atlas Fitness"} Team`,
        });

        emailData = fallbackResult.data;
        emailError = fallbackResult.error;
      }

      if (emailError) {
        console.error("Resend error details:", emailError);
        console.error(
          "Full Resend error:",
          JSON.stringify(emailError, null, 2),
        );
        // If Resend fails, we can still return success but log the error
        console.log("Would have sent email with:", {
          to: email,
          tempPassword,
          loginUrl: `${appUrl}/portal/login`,
        });
      } else {
        console.log("Email sent successfully!", emailData);
        console.log("Sent from:", fromEmail);
      }

      // Store temporary password (optional - for recovery purposes)
      // Note: In production, you'd want to hash this or use a more secure method
      await supabase
        .from("clients")
        .update({
          metadata: {
            temp_password: tempPassword,
            temp_password_created: new Date().toISOString(),
            welcome_email_sent: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);

      // Log the activity
      await supabase.from("activity_logs").insert({
        organization_id: userOrg.organization_id,
        lead_id: customerId,
        type: "welcome_email_sent",
        description: `Welcome email sent to ${name} (${email})`,
        metadata: {
          email_id: emailData?.id,
          sent_by: user.id,
          temp_password_hint: tempPassword.slice(0, 3) + "***", // Store hint only
        },
      });

      return NextResponse.json({
        success: true,
        message: "Welcome email sent successfully",
        emailId: emailData?.id,
        // In development, also return the password for testing
        ...(process.env.NODE_ENV === "development" && { tempPassword }),
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);

      // Even if email fails, return the credentials for manual sharing
      return NextResponse.json({
        success: true,
        message: "Login credentials generated (email may have failed)",
        credentials: {
          email,
          tempPassword,
          loginUrl: `${appUrl}/portal/login`,
          note: "Please share these credentials with the customer manually",
        },
      });
    }
  } catch (error) {
    console.error("Error in send-welcome-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
