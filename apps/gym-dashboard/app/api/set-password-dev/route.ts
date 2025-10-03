import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createHash, randomBytes, pbkdf2Sync } from "crypto";

// Helper function to hash password
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const hashedPassword = hashPassword(password);

    console.log(`Setting password for ${email}`);

    // Update the client's password directly
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        password_hash: hashedPassword,
        password_set_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase().trim());

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update password: " + updateError.message,
        },
        { status: 500 },
      );
    }

    console.log(`Password set successfully for ${email}`);

    return NextResponse.json({
      success: true,
      message: `Password set successfully for ${email}`,
      password: password, // For testing only
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set password" },
      { status: 500 },
    );
  }
}
