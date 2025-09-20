import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {
      auth: { status: "pending", details: {} },
      tables: { status: "pending", details: {} },
      permissions: { status: "pending", details: {} },
      testInsert: { status: "pending", details: {} },
      recommendations: [],
    },
  };

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Check Authentication
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        diagnostics.checks.auth = {
          status: "failed",
          error: error?.message || "Not authenticated",
          details: null,
        };
      } else {
        diagnostics.checks.auth = {
          status: "success",
          details: {
            userId: user.id,
            email: user.email,
            metadata: user.user_metadata,
            hasOrganizationId: !!user.user_metadata?.organization_id,
            organizationId: user.user_metadata?.organization_id,
          },
        };
      }
    } catch (e: any) {
      diagnostics.checks.auth = { status: "error", error: e.message };
    }

    // 2. Check Tables Structure
    try {
      // Check if tables exist
      const tableChecks = await adminSupabase
        .rpc("to_json", {
          query: `
          SELECT 
            table_name,
            EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = t.table_name
            ) as exists
          FROM (
            VALUES 
              ('organizations'),
              ('user_organizations'),
              ('calendar_events'),
              ('leads'),
              ('google_calendar_tokens'),
              ('calendar_settings')
          ) AS t(table_name)
        `,
        })
        .single();

      // Check calendar_events columns
      const { data: columns } = await adminSupabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_schema", "public")
        .eq("table_name", "calendar_events");

      // Check for required relationships
      const { data: constraints } = await adminSupabase
        .rpc("to_json", {
          query: `
            SELECT 
              conname as constraint_name,
              pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'calendar_events'::regclass
          `,
        })
        .single();

      diagnostics.checks.tables = {
        status: "success",
        details: {
          tableExistence: tableChecks,
          calendarEventsColumns: columns,
          constraints: constraints,
        },
      };
    } catch (e: any) {
      diagnostics.checks.tables = { status: "error", error: e.message };
    }

    // 3. Check RLS and Permissions
    try {
      const userId = diagnostics.checks.auth.details?.userId;

      if (userId) {
        // Check user_organizations membership
        const { data: membership, error: membershipError } = await supabase
          .from("user_organizations")
          .select("*")
          .eq("user_id", userId);

        // Check if user can select from calendar_events
        const { data: canSelect, error: selectError } = await supabase
          .from("calendar_events")
          .select("count")
          .limit(1);

        // Check RLS policies
        const { data: policies } = await adminSupabase
          .rpc("to_json", {
            query: `
              SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual
              FROM pg_policies
              WHERE tablename IN ('calendar_events', 'organizations', 'user_organizations')
              ORDER BY tablename, policyname
            `,
          })
          .single();

        diagnostics.checks.permissions = {
          status: "success",
          details: {
            userOrganizationMembership: membership || [],
            membershipError: membershipError?.message,
            canSelectCalendarEvents: !selectError,
            selectError: selectError?.message,
            rlsPolicies: policies,
          },
        };
      }
    } catch (e: any) {
      diagnostics.checks.permissions = { status: "error", error: e.message };
    }

    // 4. Test Insert Capability
    try {
      const userId = diagnostics.checks.auth.details?.userId;
      const orgId =
        diagnostics.checks.auth.details?.organizationId ||
        "63589490-8f55-4157-bd3a-e141594b748e";

      if (userId) {
        // Prepare test data
        const testEvent = {
          organization_id: orgId,
          title: "Diagnostic Test Event",
          description: "This is a test event created by diagnostics",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          attendees: [],
          status: "confirmed",
          created_by: userId,
        };

        // Try with regular client (respects RLS)
        const { data: regularInsert, error: regularError } = await supabase
          .from("calendar_events")
          .insert(testEvent)
          .select()
          .single();

        // Try with admin client (bypasses RLS)
        const { data: adminInsert, error: adminError } = await adminSupabase
          .from("calendar_events")
          .insert({
            ...testEvent,
            title: "Admin Diagnostic Test Event",
          })
          .select()
          .single();

        // Clean up test events
        if (regularInsert?.id) {
          await supabase
            .from("calendar_events")
            .delete()
            .eq("id", regularInsert.id);
        }
        if (adminInsert?.id) {
          await adminSupabase
            .from("calendar_events")
            .delete()
            .eq("id", adminInsert.id);
        }

        diagnostics.checks.testInsert = {
          status: "success",
          details: {
            regularClientSuccess: !regularError,
            regularClientError: regularError?.message,
            adminClientSuccess: !adminError,
            adminClientError: adminError?.message,
          },
        };
      }
    } catch (e: any) {
      diagnostics.checks.testInsert = { status: "error", error: e.message };
    }

    // 5. Generate Recommendations
    const recs = [];

    if (!diagnostics.checks.auth.details?.hasOrganizationId) {
      recs.push({
        priority: "high",
        issue: "User has no organization_id in metadata",
        solution:
          'Run: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || \'{"organization_id": "63589490-8f55-4157-bd3a-e141594b748e"}\'::jsonb WHERE id = \'' +
          diagnostics.checks.auth.details?.userId +
          "'",
      });
    }

    if (diagnostics.checks.permissions.details?.membershipError) {
      recs.push({
        priority: "high",
        issue: "User has no organization membership",
        solution:
          "Run: INSERT INTO user_organizations (user_id, organization_id, role) VALUES ('" +
          diagnostics.checks.auth.details?.userId +
          "', '63589490-8f55-4157-bd3a-e141594b748e', 'owner')",
      });
    }

    if (
      diagnostics.checks.testInsert.details?.regularClientError &&
      !diagnostics.checks.testInsert.details?.adminClientError
    ) {
      recs.push({
        priority: "high",
        issue: "RLS policies are blocking inserts",
        solution: "Check and update RLS policies for calendar_events table",
      });
    }

    diagnostics.checks.recommendations = recs;

    return NextResponse.json(diagnostics, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Diagnostics failed",
        message: error.message,
        diagnostics,
      },
      { status: 500 },
    );
  }
}
