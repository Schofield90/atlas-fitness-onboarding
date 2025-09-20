import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Tables we want to check
    const tablesToCheck = [
      "memberships",
      "notifications",
      "tasks",
      "workflow_events",
      "client_activities",
      "lead_stage_history",
      "membership_plans",
      "bookings",
      "class_sessions",
      "programs",
      "waitlist",
      "profiles",
      "users",
      "organization_members",
    ];

    // Check if we can query each table
    const tableChecks: Record<string, any> = {};
    const existingTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          missingTables.push(table);
          tableChecks[table] = {
            exists: false,
            error: error.message,
            count: 0,
          };
        } else {
          existingTables.push(table);
          tableChecks[table] = {
            exists: true,
            error: null,
            count: count || 0,
          };
        }
      } catch (e: any) {
        missingTables.push(table);
        tableChecks[table] = {
          exists: false,
          error: e.message || "Table does not exist",
          count: 0,
        };
      }
    }

    return NextResponse.json(
      {
        summary: {
          total_checked: tablesToCheck.length,
          existing: existingTables.length,
          missing: missingTables.length,
        },
        existing_tables: existingTables.sort(),
        missing_tables: missingTables.sort(),
        detailed_checks: tableChecks,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
