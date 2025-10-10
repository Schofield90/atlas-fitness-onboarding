import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";
import { parseExpression } from "cron-parser";

// Validation schemas
const createTaskSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  task_type: z.enum(["adhoc", "scheduled"]).default("adhoc"),
  schedule_cron: z.string().optional(),
  schedule_timezone: z.string().default("UTC"),
  priority: z.number().min(0).max(10).default(0),
  context: z.record(z.any()).optional(),
});

const taskFilterSchema = z.object({
  agent_id: z.string().uuid().optional(),
  status: z
    .enum(["pending", "queued", "running", "completed", "failed", "cancelled"])
    .optional(),
  task_type: z.enum(["adhoc", "scheduled", "automation"]).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * GET /api/ai-agents/tasks
 * List tasks for organization with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = taskFilterSchema.parse({
      agent_id: searchParams.get("agent_id") || undefined,
      status: searchParams.get("status") || undefined,
      task_type: searchParams.get("task_type") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
    });

    // Build query
    let query = supabase
      .from("ai_agent_tasks")
      .select("*", { count: "exact" })
      .eq("organization_id", user.organizationId);

    // Apply filters
    if (filters.agent_id) {
      query = query.eq("agent_id", filters.agent_id);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.task_type) {
      query = query.eq("task_type", filters.task_type);
    }

    // Apply ordering
    query = query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch tasks" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      total: count || 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil((count || 0) / filters.limit),
    });
  } catch (error: any) {
    console.error("Error in GET /api/ai-agents/tasks:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}

/**
 * POST /api/ai-agents/tasks
 * Create new task (adhoc or scheduled)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify agent belongs to user's organization
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id, organization_id, is_default")
      .eq("id", validatedData.agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    // Verify access: must be default agent OR belong to user's organization
    if (!agent.is_default && agent.organization_id !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied to this agent" },
        { status: 403 },
      );
    }

    // Validate cron expression if scheduled task
    let nextRunAt: Date | null = null;
    if (validatedData.task_type === "scheduled") {
      if (!validatedData.schedule_cron) {
        return NextResponse.json(
          {
            success: false,
            error: "schedule_cron is required for scheduled tasks",
          },
          { status: 400 },
        );
      }

      try {
        const interval = parseExpression(validatedData.schedule_cron, {
          tz: validatedData.schedule_timezone,
        });
        nextRunAt = interval.next().toDate();
      } catch (cronError) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid cron expression",
            details: cronError instanceof Error ? cronError.message : "Unknown",
          },
          { status: 400 },
        );
      }
    }

    // Create task
    const taskData: any = {
      agent_id: validatedData.agent_id,
      organization_id: user.organizationId,
      created_by: user.id,
      title: validatedData.title,
      description: validatedData.description || null,
      task_type: validatedData.task_type,
      schedule_cron: validatedData.schedule_cron || null,
      schedule_timezone: validatedData.schedule_timezone,
      next_run_at: nextRunAt?.toISOString() || null,
      status: "pending",
      priority: validatedData.priority,
      context: validatedData.context || {},
      retry_count: 0,
      max_retries: 3,
    };

    const { data: task, error: createError } = await supabase
      .from("ai_agent_tasks")
      .insert(taskData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating task:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create task" },
        { status: 500 },
      );
    }

    // TODO: Add to queue via agentTaskQueue.addTask() or addScheduledTask()
    // This would be implemented when the queue system is set up
    // Example:
    // if (validatedData.task_type === 'scheduled') {
    //   await agentTaskQueue.addScheduledTask(task);
    // } else {
    //   await agentTaskQueue.addTask(task);
    // }

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/ai-agents/tasks:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
