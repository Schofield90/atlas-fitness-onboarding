import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create the OTP tokens table
    const { error: createTableError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        -- Create OTP tokens table if it doesn't exist
        CREATE TABLE IF NOT EXISTS otp_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(email)
        );

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_otp_tokens_email_token ON otp_tokens(email, token);
        CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);

        -- Enable RLS
        ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

        -- Drop any existing policy first
        DROP POLICY IF EXISTS "Service role can manage OTP tokens" ON otp_tokens;

        -- Create policy for service role
        CREATE POLICY "Service role can manage OTP tokens" ON otp_tokens
          FOR ALL USING (true);
      `,
    });

    if (createTableError) {
      console.error("Error creating OTP table:", createTableError);

      // Try a simpler approach - just create the table
      const { data, error } = await supabaseAdmin
        .from("otp_tokens")
        .select("id")
        .limit(1);

      if (error && error.code === "42P01") {
        // Table doesn't exist, return instructions
        return NextResponse.json({
          error:
            "Table doesn't exist. Please run the following SQL in Supabase dashboard:",
          sql: `
CREATE TABLE IF NOT EXISTS otp_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_otp_tokens_email_token ON otp_tokens(email, token);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);

ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage OTP tokens" ON otp_tokens
  FOR ALL USING (true);
          `,
        });
      }
    }

    // Test if table exists
    const { data: testData, error: testError } = await supabaseAdmin
      .from("otp_tokens")
      .select("id")
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: "Failed to verify table creation",
        details: testError.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "OTP tokens table is ready",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup OTP table", details: error },
      { status: 500 },
    );
  }
}
