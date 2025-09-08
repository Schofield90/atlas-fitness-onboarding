import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function GET(request: NextRequest) {
  console.log("Test welcome email endpoint called");

  if (!resend) {
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 500 },
    );
  }

  // Generate a test password
  const tempPassword = "TestPass123!";
  const email = "samschofield90@hotmail.co.uk"; // Test email
  const name = "Test User";
  const appUrl = "https://atlas-fitness-onboarding.vercel.app";

  try {
    console.log("Sending welcome email to:", email);

    // Try with your domain first
    let fromEmail = "sam@email.gymleadhub.co.uk";
    const fromName = "Gym Lead Hub";

    let { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `Welcome to Gym Lead Hub - Your Account Details`,
      html: `
        <h2>Welcome to Gym Lead Hub!</h2>
        <p>Hi ${name},</p>
        <p>Your account has been created. Here are your login details:</p>
        <p><strong>Email:</strong> ${email}<br/>
        <strong>Temporary Password:</strong> ${tempPassword}<br/>
        <strong>Login URL:</strong> <a href="${appUrl}/portal/login">${appUrl}/portal/login</a></p>
        <p>Please change your password after your first login.</p>
        <p>Best regards,<br/>The Gym Lead Hub Team</p>
      `,
      text: `Welcome to Gym Lead Hub!\n\nHi ${name},\n\nYour account has been created. Here are your login details:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${appUrl}/portal/login\n\nPlease change your password after your first login.\n\nBest regards,\nThe Gym Lead Hub Team`,
    });

    // If domain error, retry with Resend's domain
    if (
      emailError &&
      (emailError.statusCode === 403 || emailError.name === "validation_error")
    ) {
      console.log("Domain issue, retrying with resend.dev");
      fromEmail = "onboarding@resend.dev";

      const retryResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Welcome to Gym Lead Hub - Your Account Details`,
        html: `
          <h2>Welcome to Gym Lead Hub!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been created. Here are your login details:</p>
          <p><strong>Email:</strong> ${email}<br/>
          <strong>Temporary Password:</strong> ${tempPassword}<br/>
          <strong>Login URL:</strong> <a href="${appUrl}/portal/login">${appUrl}/portal/login</a></p>
          <p>Please change your password after your first login.</p>
          <p>Best regards,<br/>The Gym Lead Hub Team</p>
        `,
        text: `Welcome to Gym Lead Hub!\n\nHi ${name},\n\nYour account has been created. Here are your login details:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin URL: ${appUrl}/portal/login\n\nPlease change your password after your first login.\n\nBest regards,\nThe Gym Lead Hub Team`,
      });

      emailData = retryResult.data;
      emailError = retryResult.error;
    }

    if (emailError) {
      console.error("Email error:", emailError);
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: emailError,
        },
        { status: 500 },
      );
    }

    console.log("Email sent successfully:", emailData);
    return NextResponse.json({
      success: true,
      message: "Test welcome email sent!",
      emailId: emailData?.id,
      sentTo: email,
      sentFrom: fromEmail,
      tempPassword: tempPassword,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
