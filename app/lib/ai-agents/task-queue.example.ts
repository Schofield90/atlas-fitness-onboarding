/**
 * Example usage of AgentTaskQueue
 *
 * This file demonstrates how to use the task queue system for AI agents.
 * DO NOT run this file directly - it's for reference only.
 */

import { agentTaskQueue } from "./task-queue";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Example 1: Add an ad-hoc task to the queue
 */
async function example1_AddAdHocTask() {
  const supabase = createAdminClient();

  // First, create a task in the database
  const { data: task, error } = await supabase
    .from("ai_agent_tasks")
    .insert({
      agent_id: "uuid-of-agent",
      organization_id: "uuid-of-organization",
      title: "Generate weekly financial report",
      description:
        "Analyze revenue, churn, and growth metrics for the past week",
      task_type: "adhoc",
      context: {
        report_type: "weekly",
        include_forecasts: true,
        send_to_email: "cfo@example.com",
      },
      status: "pending",
      priority: 5,
    })
    .select()
    .single();

  if (error || !task) {
    console.error("Failed to create task:", error);
    return;
  }

  // Add task to queue
  await agentTaskQueue.addTask(
    task.id,
    5, // priority (0-10, higher = more important)
    0, // delay in milliseconds (0 = execute immediately)
  );

  console.log(`Task ${task.id} added to queue`);
}

/**
 * Example 2: Add a scheduled task with cron expression
 */
async function example2_AddScheduledTask() {
  const supabase = createAdminClient();

  // Create a scheduled task
  const { data: task, error } = await supabase
    .from("ai_agent_tasks")
    .insert({
      agent_id: "uuid-of-financial-agent",
      organization_id: "uuid-of-organization",
      title: "Generate Monday morning financial report",
      description: "Weekly financial summary for leadership team",
      task_type: "scheduled",
      context: {
        report_type: "weekly",
        recipients: ["ceo@example.com", "cfo@example.com"],
      },
      status: "pending",
      priority: 7,
      schedule_timezone: "America/New_York",
    })
    .select()
    .single();

  if (error || !task) {
    console.error("Failed to create task:", error);
    return;
  }

  // Schedule task to run every Monday at 9:00 AM
  await agentTaskQueue.addScheduledTask(
    task.id,
    "0 9 * * 1", // cron: Every Monday at 9:00 AM
  );

  console.log(`Scheduled task ${task.id} will run every Monday at 9:00 AM`);
}

/**
 * Example 3: Add a delayed task
 */
async function example3_AddDelayedTask() {
  const supabase = createAdminClient();

  const { data: task, error } = await supabase
    .from("ai_agent_tasks")
    .insert({
      agent_id: "uuid-of-retention-agent",
      organization_id: "uuid-of-organization",
      title: "Follow up with inactive member",
      description:
        "Send personalized retention message to member who hasn't visited in 14 days",
      task_type: "automation",
      context: {
        member_id: "uuid-of-member",
        days_inactive: 14,
        preferred_class: "Yoga",
      },
      status: "pending",
      priority: 8,
    })
    .select()
    .single();

  if (error || !task) {
    console.error("Failed to create task:", error);
    return;
  }

  // Add task with 24-hour delay
  await agentTaskQueue.addTask(
    task.id,
    8,
    24 * 60 * 60 * 1000, // 24 hours in milliseconds
  );

  console.log(`Task ${task.id} will execute in 24 hours`);
}

/**
 * Example 4: Get queue statistics
 */
async function example4_GetQueueStats() {
  const stats = await agentTaskQueue.getQueueStats();

  console.log("Queue Statistics:");
  console.log(`- Waiting: ${stats.waiting}`);
  console.log(`- Active: ${stats.active}`);
  console.log(`- Completed: ${stats.completed}`);
  console.log(`- Failed: ${stats.failed}`);
  console.log(`- Delayed: ${stats.delayed}`);
  console.log(`- Paused: ${stats.paused}`);
}

/**
 * Example 5: Pause and resume queue
 */
async function example5_PauseAndResumeQueue() {
  // Pause queue (stops processing new jobs)
  await agentTaskQueue.pauseQueue();
  console.log("Queue paused - no new jobs will be processed");

  // Do maintenance work...
  await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute

  // Resume queue
  await agentTaskQueue.resumeQueue();
  console.log("Queue resumed - processing jobs again");
}

/**
 * Example 6: Retry a failed job
 */
async function example6_RetryFailedJob() {
  const jobId = "task-uuid-that-failed";

  try {
    await agentTaskQueue.retryJob(jobId);
    console.log(`Job ${jobId} queued for retry`);
  } catch (error) {
    console.error("Failed to retry job:", error);
  }
}

/**
 * Example 7: Remove a job from queue
 */
async function example7_RemoveJob() {
  const jobId = "task-uuid-to-cancel";

  try {
    await agentTaskQueue.removeJob(jobId);
    console.log(`Job ${jobId} removed from queue`);
  } catch (error) {
    console.error("Failed to remove job:", error);
  }
}

/**
 * Common cron expressions for scheduled tasks
 */
const CRON_EXAMPLES = {
  // Every minute
  everyMinute: "* * * * *",

  // Every hour at minute 0
  everyHour: "0 * * * *",

  // Every day at 9:00 AM
  daily9am: "0 9 * * *",

  // Every Monday at 9:00 AM
  mondayMorning: "0 9 * * 1",

  // First day of month at midnight
  monthlyFirstDay: "0 0 1 * *",

  // Every weekday at 5:00 PM
  weekdayEvening: "0 17 * * 1-5",

  // Every 15 minutes
  every15Minutes: "*/15 * * * *",

  // Every Sunday at midnight
  sundayMidnight: "0 0 * * 0",

  // First Monday of month at 9:00 AM
  firstMondayOfMonth: "0 9 1-7 * 1",
};

// Export examples for reference
export {
  example1_AddAdHocTask,
  example2_AddScheduledTask,
  example3_AddDelayedTask,
  example4_GetQueueStats,
  example5_PauseAndResumeQueue,
  example6_RetryFailedJob,
  example7_RemoveJob,
  CRON_EXAMPLES,
};
