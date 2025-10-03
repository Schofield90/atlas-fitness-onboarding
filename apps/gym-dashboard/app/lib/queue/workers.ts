import { getQueueManager } from "./queue-manager";
import { QUEUE_NAMES, JOB_TYPES } from "./config";
import { processWorkflowTrigger } from "./processors/workflow-trigger-processor";
import { processWorkflowExecution } from "./processors/workflow-execution-processor";
import { processNodeExecution } from "./processors/action-processors";
import { Worker } from "bullmq";

let workers: Worker[] = [];

export async function startWorkers(): Promise<void> {
  console.log("Starting BullMQ workers...");

  // Initialize queue manager
  await getQueueManager().initialize();

  // Register workflow trigger processor
  const triggerWorker = getQueueManager().registerWorker(
    QUEUE_NAMES.WORKFLOW_TRIGGERS,
    async (job) => {
      switch (job.name) {
        case JOB_TYPES.PROCESS_TRIGGER:
          return processWorkflowTrigger(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
  );
  workers.push(triggerWorker);

  // Register workflow execution processor
  const executionWorker = getQueueManager().registerWorker(
    QUEUE_NAMES.WORKFLOW_ACTIONS,
    async (job) => {
      switch (job.name) {
        case JOB_TYPES.EXECUTE_WORKFLOW:
          return processWorkflowExecution(job);
        case JOB_TYPES.EXECUTE_NODE:
          return processNodeExecution(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
  );
  workers.push(executionWorker);

  // Register analytics processor
  const analyticsWorker = getQueueManager().registerWorker(
    QUEUE_NAMES.WORKFLOW_ANALYTICS,
    async (job) => {
      // Simple logging for now
      console.log("Analytics event:", job.name, job.data);

      // TODO: Store in analytics database
      switch (job.name) {
        case JOB_TYPES.TRACK_EXECUTION:
          // Store execution metrics
          break;
        case JOB_TYPES.UPDATE_STATS:
          // Update workflow statistics
          break;
      }

      return { processed: true };
    },
  );
  workers.push(analyticsWorker);

  // Register dead letter queue processor
  const deadLetterWorker = getQueueManager().registerWorker(
    QUEUE_NAMES.DEAD_LETTER,
    async (job) => {
      console.error("Dead letter job:", job.data);

      // TODO: Send alert to admin
      // TODO: Store in permanent failure log

      return { processed: true };
    },
  );
  workers.push(deadLetterWorker);

  console.log(`Started ${workers.length} workers`);

  // Monitor queue health
  setInterval(async () => {
    const stats = await getQueueManager().getAllQueueStats();
    console.log("Queue stats:", stats);
  }, 60000); // Every minute
}

export async function stopWorkers(): Promise<void> {
  console.log("Stopping workers...");

  // Stop all workers
  for (const worker of workers) {
    await worker.close();
  }

  // Shutdown queue manager
  await getQueueManager().shutdown();

  workers = [];
  console.log("Workers stopped");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await stopWorkers();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await stopWorkers();
  process.exit(0);
});
