import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    // Step 1: Check if email_logs table exists
    const { data: tables, error: tableError } = await adminSupabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "email_logs");

    // Step 2: Get table structure
    const { data: columns, error: columnError } = await adminSupabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_schema", "public")
      .eq("table_name", "email_logs")
      .order("ordinal_position");

    // Step 3: Try to insert a test record
    const testLog = {
      message_id: "debug-" + Date.now(),
      to_email: "test@example.com",
      from_email: "sam@atlas-gyms.co.uk",
      subject: "Debug Test Email",
      message: "This is a debug test email log entry",
      status: "sent",
    };

    const { data: insertData, error: insertError } = await adminSupabase
      .from("email_logs")
      .insert(testLog)
      .select()
      .single();

    // Step 4: Count total records
    const { count: totalCount, error: countError } = await adminSupabase
      .from("email_logs")
      .select("*", { count: "exact", head: true });

    // Step 5: Fetch all records (limit 10)
    const { data: allLogs, error: fetchError } = await adminSupabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // Step 6: Check RLS policies
    const { data: policies, error: policyError } = await adminSupabase
      .rpc("pg_policies")
      .eq("tablename", "email_logs");

    // Step 7: Test with regular client (not admin)
    const { data: regularClientData, error: regularClientError } =
      await supabase.from("email_logs").select("*").limit(1);

    return NextResponse.json({
      tableExists: tables && tables.length > 0,
      tableStructure: columns,

      testInsert: {
        attempted: testLog,
        success: !insertError,
        data: insertData,
        error: insertError
          ? {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
            }
          : null,
      },

      recordCount: {
        total: totalCount,
        error: countError,
      },

      recentLogs: {
        count: allLogs?.length || 0,
        logs: allLogs,
        error: fetchError,
      },

      policies: {
        count: policies?.length || 0,
        list: policies,
        error: policyError,
      },

      regularClientAccess: {
        canRead: !regularClientError,
        data: regularClientData,
        error: regularClientError,
      },

      diagnostics: {
        tableError,
        columnError,
        hasTableAccess: !tableError && tables && tables.length > 0,
        hasCorrectColumns: columns?.some((c) => c.column_name === "to_email"),
        canInsert: !insertError,
        canRead: !fetchError,
        recommendation: getRecommendation({
          tableExists: tables && tables.length > 0,
          hasCorrectColumns: columns?.some((c) => c.column_name === "to_email"),
          canInsert: !insertError,
          canRead: !fetchError,
          totalCount,
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Debug test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

function getRecommendation(status: any): string {
  if (!status.tableExists) {
    return "Table does not exist. Run the migration: supabase/migrations/20250729_fix_email_logs.sql";
  }
  if (!status.hasCorrectColumns) {
    return "Table structure is incorrect. Drop and recreate using the fix migration.";
  }
  if (!status.canInsert) {
    return "Cannot insert records. Check database permissions or constraints.";
  }
  if (!status.canRead) {
    return "Cannot read records. Check RLS policies.";
  }
  if (status.totalCount === 0) {
    return "Table is empty. Test email sending to create records.";
  }
  return "Email logs system appears to be working correctly.";
}
