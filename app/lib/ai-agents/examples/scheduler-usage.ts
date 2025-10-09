/**
 * Example: Using the AgentScheduler
 */

import { agentScheduler } from "../scheduler";

async function main() {
  console.log("=== AgentScheduler Usage Examples ===\n");

  // 1. Start the scheduler
  console.log("1. Starting scheduler...");
  await agentScheduler.start();
  const status1 = agentScheduler.getStatus();
  console.log("   Status:", status1.isRunning ? "Running" : "Stopped");
  console.log("   Metrics:", status1.metrics);
  console.log("");

  // 2. Validate cron expressions
  console.log("2. Validating cron expressions...");
  const validExpressions = [
    "0 * * * *", // Every hour
    "0 0 * * *", // Daily at midnight
    "0 9 * * 1-5", // Weekdays at 9 AM
    "*/15 * * * *", // Every 15 minutes
  ];

  for (const expr of validExpressions) {
    try {
      agentScheduler.validateCronExpression(expr);
      const description = agentScheduler.describeCronExpression(expr);
      const nextRun = agentScheduler.calculateNextRun(expr, "UTC");
      console.log(`   ✓ ${expr}`);
      console.log(`     → ${description}`);
      console.log(`     → Next run: ${nextRun.toISOString()}`);
    } catch (error) {
      console.log(`   ✗ ${expr} - Invalid`);
    }
  }
  console.log("");

  // 3. Test invalid cron expression
  console.log("3. Testing invalid cron expression...");
  try {
    agentScheduler.validateCronExpression("invalid cron");
    console.log("   ✗ Should have thrown error");
  } catch (error) {
    console.log("   ✓ Correctly rejected invalid cron");
  }
  console.log("");

  // 4. Calculate next run with different timezones
  console.log("4. Calculating next run for different timezones...");
  const cronExpr = "0 12 * * *"; // Noon
  const timezones = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];

  for (const tz of timezones) {
    const nextRun = agentScheduler.calculateNextRun(cronExpr, tz);
    console.log(`   ${tz.padEnd(20)} → ${nextRun.toISOString()}`);
  }
  console.log("");

  // 5. Get human-readable descriptions
  console.log("5. Getting human-readable cron descriptions...");
  const cronDescriptions = [
    "0 0 * * *", // Daily
    "0 9 * * 1-5", // Weekdays
    "*/30 * * * *", // Every 30 minutes
    "0 0 1 * *", // Monthly
    "0 12 * * 0", // Weekly on Sunday
  ];

  for (const expr of cronDescriptions) {
    const description = agentScheduler.describeCronExpression(expr);
    console.log(`   ${expr.padEnd(15)} → ${description}`);
  }
  console.log("");

  // 6. Manually trigger a check
  console.log("6. Manually triggering scheduler check...");
  const metricsBefore = agentScheduler.getMetrics();
  await agentScheduler.checkScheduledTasks();
  const metricsAfter = agentScheduler.getMetrics();
  console.log(
    `   Checks performed: ${metricsBefore.checksPerformed} → ${metricsAfter.checksPerformed}`,
  );
  console.log(
    `   Tasks queued: ${metricsBefore.tasksQueued} → ${metricsAfter.tasksQueued}`,
  );
  console.log("");

  // 7. Get comprehensive status
  console.log("7. Getting comprehensive status...");
  const status = agentScheduler.getStatus();
  console.log("   Running:", status.isRunning);
  console.log("   Currently checking:", status.isChecking);
  console.log("   Total checks:", status.metrics.checksPerformed);
  console.log("   Total tasks queued:", status.metrics.tasksQueued);
  console.log("   Total failures:", status.metrics.tasksFailed);
  console.log(
    "   Last check:",
    status.metrics.lastCheckTime?.toISOString() || "Never",
  );
  console.log(
    "   Next check:",
    status.metrics.nextCheckTime?.toISOString() || "Unknown",
  );
  console.log("");

  // 8. Stop the scheduler
  console.log("8. Stopping scheduler...");
  await agentScheduler.stop();
  const status2 = agentScheduler.getStatus();
  console.log("   Status:", status2.isRunning ? "Running" : "Stopped");
  console.log("");

  console.log("=== All examples completed successfully ===");
}

// Run examples
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

export { main };
