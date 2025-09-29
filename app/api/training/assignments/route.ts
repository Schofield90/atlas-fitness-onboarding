import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface TrainingAssignment {
  sop_id: string;
  user_ids: string[];
  due_date?: string;
  notes?: string;
  auto_assign_new_staff?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TrainingAssignment = await request.json();
    const { sop_id, user_ids, due_date, notes, auto_assign_new_staff } = body;

    if (!sop_id || !user_ids || user_ids.length === 0) {
      return NextResponse.json(
        {
          error: "SOP ID and user IDs are required",
        },
        { status: 400 },
      );
    }

    // Verify SOP exists and belongs to organization
    const { data: sop, error: sopError } = await supabase
      .from("sops")
      .select("id, title, training_required")
      .eq("id", sop_id)
      .eq("organization_id", organization.id)
      .single();

    if (sopError || !sop) {
      return NextResponse.json({ error: "SOP not found" }, { status: 404 });
    }

    // Check if training is required for this SOP
    if (!sop.training_required) {
      return NextResponse.json(
        {
          error: "Training is not required for this SOP",
        },
        { status: 400 },
      );
    }

    // Verify all users belong to organization
    const { data: users, error: usersError } = await supabase
      .from("staff")
      .select("user_id, name, email")
      .in("user_id", user_ids)
      .eq("organization_id", organization.id);

    if (usersError) {
      return NextResponse.json(
        { error: "Failed to verify users" },
        { status: 500 },
      );
    }

    const validUserIds = users?.map((u) => u.user_id) || [];
    const invalidUserIds = user_ids.filter((id) => !validUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid user IDs: ${invalidUserIds.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Create training assignments
    const assignments = validUserIds.map((userId) => ({
      sop_id,
      user_id: userId,
      organization_id: organization.id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      assigned_by: user.id,
      due_date,
      notes: notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Check for existing assignments to avoid duplicates
    const { data: existingAssignments } = await supabase
      .from("sop_training_records")
      .select("user_id")
      .eq("sop_id", sop_id)
      .in("user_id", validUserIds);

    const existingUserIds = existingAssignments?.map((a) => a.user_id) || [];
    const newAssignments = assignments.filter(
      (a) => !existingUserIds.includes(a.user_id),
    );

    if (newAssignments.length === 0) {
      return NextResponse.json({
        message: "All users are already assigned to this training",
        assignments_created: 0,
      });
    }

    // Insert new assignments
    const { data: createdAssignments, error: insertError } = await supabase
      .from("sop_training_records")
      .insert(newAssignments).select(`
        *,
        sop:sops(id, title),
        user:users(id, name, email),
        assigned_by_user:users!sop_training_records_assigned_by_fkey(id, name, email)
      `);

    if (insertError) {
      console.error("Error creating training assignments:", insertError);
      return NextResponse.json(
        { error: "Failed to create assignments" },
        { status: 500 },
      );
    }

    // Update SOP auto-assignment setting if provided
    if (auto_assign_new_staff !== undefined) {
      await supabase
        .from("sops")
        .update({ auto_assign_new_staff })
        .eq("id", sop_id)
        .eq("organization_id", organization.id);
    }

    return NextResponse.json(
      {
        success: true,
        assignments_created: newAssignments.length,
        assignments: createdAssignments,
        skipped_existing: existingUserIds.length,
        message: `Successfully assigned training to ${newAssignments.length} users`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating training assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const sopId = url.searchParams.get("sop_id");
    const userId = url.searchParams.get("user_id");
    const status = url.searchParams.get("status");
    const includeStats = url.searchParams.get("include_stats") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build base query
    let query = supabase
      .from("sop_training_records")
      .select(
        `
        *,
        sop:sops(id, title, category, training_required),
        user:users(id, name, email),
        assigned_by_user:users!sop_training_records_assigned_by_fkey(id, name, email)
      `,
      )
      .eq("organization_id", organization.id);

    // Apply filters
    if (sopId) {
      query = query.eq("sop_id", sopId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const {
      data: assignments,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching training assignments:", error);
      return NextResponse.json(
        { error: "Failed to fetch assignments" },
        { status: 500 },
      );
    }

    let stats = null;

    if (includeStats) {
      // Get assignment statistics
      const { data: statsData } = await supabase
        .from("sop_training_records")
        .select("status")
        .eq("organization_id", organization.id);

      const totalAssignments = statsData?.length || 0;
      const statusCounts =
        statsData?.reduce((acc: any, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {}) || {};

      stats = {
        total: totalAssignments,
        assigned: statusCounts.assigned || 0,
        in_progress: statusCounts.in_progress || 0,
        completed: statusCounts.completed || 0,
        overdue: statusCounts.overdue || 0,
        completion_rate:
          totalAssignments > 0
            ? (
                ((statusCounts.completed || 0) / totalAssignments) *
                100
              ).toFixed(1)
            : "0",
      };
    }

    return NextResponse.json({
      assignments: assignments || [],
      total: count,
      has_more: (count || 0) > offset + limit,
      stats,
    });
  } catch (error) {
    console.error("Error fetching training assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignment_ids, action, data } = body;

    if (
      !assignment_ids ||
      !Array.isArray(assignment_ids) ||
      assignment_ids.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Assignment IDs array is required",
        },
        { status: 400 },
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    // Verify assignments belong to organization
    const { data: assignments, error: fetchError } = await supabase
      .from("sop_training_records")
      .select("id, user_id, status")
      .in("id", assignment_ids)
      .eq("organization_id", organization.id);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch assignments" },
        { status: 500 },
      );
    }

    const validIds = assignments?.map((a) => a.id) || [];
    const invalidIds = assignment_ids.filter((id) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid assignment IDs: ${invalidIds.join(", ")}`,
        },
        { status: 400 },
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case "bulk_extend_due_date":
        if (!data?.due_date) {
          return NextResponse.json(
            { error: "Due date is required for extend action" },
            { status: 400 },
          );
        }
        updateData.due_date = data.due_date;
        break;

      case "bulk_reassign":
        updateData.assigned_at = new Date().toISOString();
        updateData.assigned_by = user.id;
        updateData.status = "assigned";
        break;

      case "bulk_complete":
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
        break;

      case "bulk_cancel":
        updateData.status = "cancelled";
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user.id;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Apply bulk update
    const { data: updatedAssignments, error: updateError } = await supabase
      .from("sop_training_records")
      .update(updateData)
      .in("id", validIds).select(`
        *,
        sop:sops(id, title),
        user:users(id, name, email)
      `);

    if (updateError) {
      console.error("Error updating assignments:", updateError);
      return NextResponse.json(
        { error: "Failed to update assignments" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: validIds.length,
      assignments: updatedAssignments,
      message: `Successfully updated ${validIds.length} assignments`,
    });
  } catch (error) {
    console.error("Error updating training assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const assignmentIds = url.searchParams.get("ids")?.split(",") || [];

    if (assignmentIds.length === 0) {
      return NextResponse.json(
        {
          error: "Assignment IDs are required",
        },
        { status: 400 },
      );
    }

    // Verify assignments belong to organization and can be deleted
    const { data: assignments, error: fetchError } = await supabase
      .from("sop_training_records")
      .select("id, status, user_id")
      .in("id", assignmentIds)
      .eq("organization_id", organization.id);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch assignments" },
        { status: 500 },
      );
    }

    const validIds = assignments?.map((a) => a.id) || [];

    // Check if any assignments are completed (might want to prevent deletion)
    const completedAssignments =
      assignments?.filter((a) => a.status === "completed") || [];

    if (completedAssignments.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete completed training assignments",
          completed_ids: completedAssignments.map((a) => a.id),
        },
        { status: 400 },
      );
    }

    // Delete assignments
    const { error: deleteError } = await supabase
      .from("sop_training_records")
      .delete()
      .in("id", validIds);

    if (deleteError) {
      console.error("Error deleting assignments:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete assignments" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: validIds.length,
      message: `Successfully deleted ${validIds.length} assignments`,
    });
  } catch (error) {
    console.error("Error deleting training assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
