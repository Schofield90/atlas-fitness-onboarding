import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * GET /api/migration/debug
 * Debug endpoint to check migration system status
 */
export async function GET(request: NextRequest) {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
    };

    // 1. Check authentication
    try {
      const supabase = createAdminClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      debugInfo.checks.auth = {
        status: user ? "✅ Authenticated" : "❌ Not authenticated",
        userId: user?.id || null,
        error: authError?.message || null,
      };

      if (user) {
        // Check user_organizations
        const { data: userOrg, error: orgError } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        debugInfo.checks.userOrganization = {
          status: userOrg ? "✅ Found" : "❌ Not found",
          organizationId: userOrg?.organization_id || null,
          error: orgError?.message || null,
        };
      }
    } catch (e: any) {
      debugInfo.errors.push(`Auth check failed: ${e.message}`);
    }

    // 2. Check database tables existence
    try {
      const tableChecks = [
        "migration_jobs",
        "migration_files",
        "migration_records",
        "migration_conflicts",
        "migration_field_mappings",
        "migration_logs",
      ];

      const supabaseAdmin = createAdminClient();
      for (const tableName of tableChecks) {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select("*")
          .limit(0);

        debugInfo.checks[`table_${tableName}`] = {
          status: error ? "❌ Error" : "✅ Exists",
          error: error?.message || null,
        };
      }
    } catch (e: any) {
      debugInfo.errors.push(`Table check failed: ${e.message}`);
    }

    // 3. Check migration_records columns specifically
    try {
      const supabaseAdmin = createAdminClient();
      const { data: columns, error: columnsError } = await supabaseAdmin
        .rpc("get_table_columns", { table_name: "migration_records" })
        .single();

      if (columnsError) {
        // Fallback: Try direct query
        const { data, error } = await supabaseAdmin
          .from("migration_records")
          .select("*")
          .limit(1);

        if (error && error.message.includes("column")) {
          debugInfo.checks.migration_records_columns = {
            status: "❌ Missing columns",
            error: error.message,
            hint: "source_row_number column might be missing",
          };
        } else {
          debugInfo.checks.migration_records_columns = {
            status: "✅ Table accessible",
            sampleData: data?.[0] ? Object.keys(data[0]) : [],
          };
        }
      } else {
        debugInfo.checks.migration_records_columns = {
          status: "✅ Columns found",
          columns: columns,
        };
      }
    } catch (e: any) {
      // Try another approach - check for specific column
      try {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
          .from("migration_records")
          .select("source_row_number")
          .limit(1);

        debugInfo.checks.source_row_number_column = {
          status: error ? "❌ Missing" : "✅ Exists",
          error: error?.message || null,
        };
      } catch (innerError: any) {
        debugInfo.checks.source_row_number_column = {
          status: "❌ Check failed",
          error: innerError.message,
        };
      }
    }

    // 4. Check specific job if ID provided
    const jobId = request.nextUrl.searchParams.get("jobId");
    if (jobId) {
      try {
        const supabaseAdmin = createAdminClient();
        // Check job exists
        const { data: job, error: jobError } = await supabaseAdmin
          .from("migration_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        debugInfo.checks.specificJob = {
          status: job ? "✅ Found" : "❌ Not found",
          job: job || null,
          error: jobError?.message || null,
        };

        if (job) {
          // Check for conflicts
          const { data: conflicts, error: conflictsError } = await supabaseAdmin
            .from("migration_conflicts")
            .select("id, conflict_type, resolution_strategy, resolved_at")
            .eq("migration_job_id", jobId)
            .limit(5);

          debugInfo.checks.jobConflicts = {
            status: conflictsError ? "❌ Error" : "✅ Queried",
            count: conflicts?.length || 0,
            sample: conflicts?.slice(0, 2) || [],
            error: conflictsError?.message || null,
          };

          // Check for records
          const { data: records, error: recordsError } = await supabaseAdmin
            .from("migration_records")
            .select("id, status, source_row_number")
            .eq("migration_job_id", jobId)
            .limit(5);

          debugInfo.checks.jobRecords = {
            status: recordsError ? "❌ Error" : "✅ Queried",
            count: records?.length || 0,
            sample: records?.slice(0, 2) || [],
            error: recordsError?.message || null,
          };
        }
      } catch (e: any) {
        debugInfo.errors.push(`Job check failed: ${e.message}`);
      }
    }

    // 5. Test the exact query that's failing
    try {
      const supabaseAdmin = createAdminClient();
      const testJobId = jobId || "test-id";
      const { data, error } = await supabaseAdmin
        .from("migration_conflicts")
        .select(
          `
          *,
          migration_records(source_row_number, source_data)
        `,
        )
        .eq("migration_job_id", testJobId)
        .is("resolved_at", null)
        .limit(1);

      debugInfo.checks.conflictQueryTest = {
        status: error ? "❌ Failed" : "✅ Success",
        error: error?.message || null,
        errorCode: error?.code || null,
        errorDetails: error?.details || null,
        data: data?.length || 0,
      };
    } catch (e: any) {
      debugInfo.checks.conflictQueryTest = {
        status: "❌ Exception",
        error: e.message,
      };
    }

    // 6. Check RLS policies
    try {
      const supabaseAdmin = createAdminClient();
      const { data: policies, error: policiesError } = await supabaseAdmin
        .from("pg_policies")
        .select("*")
        .in("tablename", [
          "migration_jobs",
          "migration_records",
          "migration_conflicts",
        ])
        .limit(10);

      debugInfo.checks.rlsPolicies = {
        status: policiesError ? "❌ Error" : "✅ Found",
        count: policies?.length || 0,
        error: policiesError?.message || null,
      };
    } catch (e: any) {
      debugInfo.checks.rlsPolicies = {
        status: "⚠️ Could not check",
        error: e.message,
      };
    }

    // 7. Provide SQL fix if needed
    if (debugInfo.checks.source_row_number_column?.status === "❌ Missing") {
      debugInfo.sqlFix = {
        message: "Run this SQL in Supabase Dashboard:",
        sql: `
-- Add missing source_row_number column
ALTER TABLE public.migration_records 
ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_migration_records_source_row 
ON public.migration_records(migration_job_id, source_row_number);

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'migration_records' 
AND column_name = 'source_row_number';`,
        dashboardUrl:
          "https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new",
      };
    }

    // Determine overall status
    const hasErrors = Object.values(debugInfo.checks).some((check: any) =>
      check.status?.startsWith("❌"),
    );

    debugInfo.summary = {
      status: hasErrors ? "❌ Issues found" : "✅ All checks passed",
      actionRequired: hasErrors,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(debugInfo, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Debug check failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
