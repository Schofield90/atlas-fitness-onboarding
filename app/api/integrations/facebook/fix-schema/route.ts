import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Run the migration SQL directly
    const migrationSQL = `
      -- Fix Facebook Integration Schema
      DO $$ 
      BEGIN
          -- Check if facebook_integrations table exists
          IF EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'facebook_integrations'
          ) THEN
              -- Add facebook_user_email column if it doesn't exist
              IF NOT EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'facebook_integrations' 
                  AND column_name = 'facebook_user_email'
              ) THEN
                  ALTER TABLE facebook_integrations 
                  ADD COLUMN facebook_user_email TEXT;
                  
                  RAISE NOTICE 'Added facebook_user_email column to facebook_integrations table';
              ELSE
                  RAISE NOTICE 'facebook_user_email column already exists';
              END IF;
          ELSE
              -- Create the entire table if it doesn't exist
              CREATE TABLE facebook_integrations (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                  
                  -- Facebook user information
                  facebook_user_id TEXT NOT NULL,
                  facebook_user_name TEXT NOT NULL,
                  facebook_user_email TEXT,
                  
                  -- OAuth token management
                  access_token TEXT NOT NULL,
                  token_expires_at TIMESTAMPTZ,
                  refresh_token TEXT,
                  long_lived_token TEXT,
                  
                  -- Permission and scope management
                  granted_scopes TEXT[] DEFAULT '{}',
                  required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
                  
                  -- Integration status
                  is_active BOOLEAN DEFAULT true,
                  connection_status TEXT NOT NULL DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
                  last_sync_at TIMESTAMPTZ,
                  sync_frequency_hours INTEGER DEFAULT 1,
                  
                  -- Configuration and metadata
                  settings JSONB DEFAULT '{}',
                  webhook_config JSONB DEFAULT '{}',
                  error_details JSONB DEFAULT '{}',
                  
                  -- Audit fields
                  created_at TIMESTAMPTZ DEFAULT NOW(),
                  updated_at TIMESTAMPTZ DEFAULT NOW(),
                  
                  -- Constraints
                  UNIQUE(organization_id, facebook_user_id)
              );
              
              RAISE NOTICE 'Created facebook_integrations table with facebook_user_email column';
          END IF;
      END $$;
    `;

    // Execute the migration
    const { error: migrationError } = await supabase
      .rpc("exec_sql", {
        sql: migrationSQL,
      })
      .single();

    // If exec_sql doesn't exist, try direct query (admin only)
    if (migrationError) {
      // Check current schema
      const { data: columns, error: checkError } = await supabase
        .from("facebook_integrations")
        .select("*")
        .limit(0);

      if (checkError) {
        // Table might not exist, let's check
        return NextResponse.json({
          status: "error",
          message: "Table might not exist or needs manual migration",
          error: checkError.message,
          migration_sql: migrationSQL,
          instruction: "Please run the migration SQL in Supabase SQL Editor",
        });
      }

      return NextResponse.json({
        status: "needs_manual_migration",
        message: "Schema check completed, manual migration needed",
        current_columns: columns,
        migration_sql: migrationSQL,
        instruction: "Please run the migration SQL in Supabase SQL Editor",
      });
    }

    // Check if the column now exists
    const { data: testData, error: testError } = await supabase
      .from("facebook_integrations")
      .select("id, facebook_user_email")
      .limit(1);

    if (testError) {
      return NextResponse.json({
        status: "partial_success",
        message: "Migration may have partially succeeded",
        test_error: testError.message,
        migration_sql: migrationSQL,
        instruction: "Please verify in Supabase SQL Editor",
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Facebook integration schema fixed successfully",
      schema_ready: true,
      test_passed: true,
    });
  } catch (error) {
    console.error("Schema fix error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fix schema",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
