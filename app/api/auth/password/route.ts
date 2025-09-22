import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  getAuthenticatedClient,
} from "@/app/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { action, email, password, newPassword, token } =
      await request.json();
    const supabase = createClient();

    if (action === "login") {
      // Password login
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: "Email and password required" },
          { status: 400 },
        );
      }

      // Find client by email
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select(
          "id, email, password_hash, first_name, last_name, organization_id, user_id",
        )
        .eq("email", email.toLowerCase().trim())
        .single();

      if (clientError) {
        // Check if the error is due to missing password columns
        if (
          clientError.message?.includes("password_hash") ||
          clientError.message?.includes("column")
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Password authentication not yet enabled. Please use OTP login or contact support.",
              needsMigration: true,
            },
            { status: 501 },
          );
        }

        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 },
        );
      }

      if (!client) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 },
        );
      }

      // Check if client has a password set
      if (!client.password_hash) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Password not set. Please use OTP login or set a password in your settings.",
          },
          { status: 401 },
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        client.password_hash,
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 },
        );
      }

      // Create or get user session
      if (client.user_id) {
        // Client already has a Supabase user, create a session
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.admin.getUserById(client.user_id);

        if (userError || !user) {
          return NextResponse.json(
            { success: false, error: "Authentication failed" },
            { status: 500 },
          );
        }

        // Generate a magic link for the user to sign in
        const { data: magicLink, error: magicLinkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: client.email,
          });

        if (magicLinkError || !magicLink) {
          return NextResponse.json(
            { success: false, error: "Failed to generate authentication link" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          authUrl: magicLink.properties?.action_link,
          redirectTo: "/client/dashboard",
        });
      } else {
        // Create a new Supabase user for the client
        const { data: newUser, error: createError } =
          await supabase.auth.admin.createUser({
            email: client.email,
            email_confirm: true,
            user_metadata: {
              first_name: client.first_name,
              last_name: client.last_name,
              role: "client",
            },
          });

        if (createError || !newUser.user) {
          return NextResponse.json(
            { success: false, error: "Failed to create user session" },
            { status: 500 },
          );
        }

        // Update client with user_id
        await supabase
          .from("clients")
          .update({ user_id: newUser.user.id })
          .eq("id", client.id);

        // Generate magic link for the new user
        const { data: magicLink, error: magicLinkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: client.email,
          });

        if (magicLinkError || !magicLink) {
          return NextResponse.json(
            { success: false, error: "Failed to generate authentication link" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          authUrl: magicLink.properties?.action_link,
          redirectTo: "/client/dashboard",
        });
      }
    }

    if (action === "set") {
      // Set or update password
      const { user, error: authError } = await getAuthenticatedClient();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: "Not authenticated" },
          { status: 401 },
        );
      }

      // Find client by user_id
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 },
        );
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update client's password
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          password_hash: hashedPassword,
          password_set_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (updateError) {
        // Check if the error is due to missing columns
        if (
          updateError.message?.includes("password_hash") ||
          updateError.message?.includes("column")
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Password feature not yet enabled. Please contact support to enable password authentication.",
              needsMigration: true,
            },
            { status: 501 },
          );
        }

        return NextResponse.json(
          { success: false, error: "Failed to update password" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
      });
    }

    if (action === "reset-request") {
      // Request password reset
      if (!email) {
        return NextResponse.json(
          { success: false, error: "Email required" },
          { status: 400 },
        );
      }

      // Find client by email
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, email")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (clientError || !client) {
        // Don't reveal if email exists or not
        return NextResponse.json({
          success: true,
          message: "If an account exists, a reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

      // Update client with reset token
      await supabase
        .from("clients")
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpires.toISOString(),
        })
        .eq("id", client.id);

      // Here you would send an email with the reset link
      // For now, we'll just return the token (in production, never do this)
      console.log(`Password reset link: /reset-password?token=${resetToken}`);

      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    if (action === "reset-confirm") {
      // Confirm password reset with token
      if (!token || !newPassword) {
        return NextResponse.json(
          { success: false, error: "Token and new password required" },
          { status: 400 },
        );
      }

      // Find client by reset token
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, password_reset_expires")
        .eq("password_reset_token", token)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired reset token" },
          { status: 401 },
        );
      }

      // Check if token is expired
      if (new Date(client.password_reset_expires) < new Date()) {
        return NextResponse.json(
          { success: false, error: "Reset token has expired" },
          { status: 401 },
        );
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          password_hash: hashedPassword,
          password_set_at: new Date().toISOString(),
          password_reset_token: null,
          password_reset_expires: null,
        })
        .eq("id", client.id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to reset password" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Password auth error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 },
    );
  }
}
