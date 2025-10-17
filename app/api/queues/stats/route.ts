import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Dynamically import to avoid build-time execution
    const { QueueUtils } = await import("@/app/lib/queue");
    const { QUEUE_NAMES } = await import("@/app/lib/queue/enhanced-config");

    const { searchParams } = new URL(request.url);
    const queueName = searchParams.get("queue");
    const format = searchParams.get("format") || "json";

    let stats;

    if (queueName) {
      // Get stats for specific queue
      if (!Object.values(QUEUE_NAMES).includes(queueName as any)) {
        return NextResponse.json(
          {
            status: "error",
            message: `Invalid queue name: ${queueName}`,
            availableQueues: Object.values(QUEUE_NAMES),
          },
          { status: 400 },
        );
      }

      stats = {
        queue: queueName,
        stats: await QueueUtils.getQueueStats(queueName as any),
        timestamp: new Date().toISOString(),
      };
    } else {
      // Get stats for all queues
      const allStats = await QueueUtils.getQueueStats();

      stats = {
        queues: allStats,
        summary: {
          totalQueues: Object.keys(allStats).length,
          totalWaiting: Object.values(allStats).reduce(
            (sum: number, s: any) => sum + s.waiting,
            0,
          ),
          totalActive: Object.values(allStats).reduce(
            (sum: number, s: any) => sum + s.active,
            0,
          ),
          totalCompleted: Object.values(allStats).reduce(
            (sum: number, s: any) => sum + s.completed,
            0,
          ),
          totalFailed: Object.values(allStats).reduce(
            (sum: number, s: any) => sum + s.failed,
            0,
          ),
          totalDelayed: Object.values(allStats).reduce(
            (sum: number, s: any) => sum + s.delayed,
            0,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertStatsToCSV(stats);

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="queue-stats-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    console.error("Queue stats retrieval failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve queue statistics",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      },
    );
  }
}

function convertStatsToCSV(stats: any): string {
  if (stats.queue) {
    // Single queue CSV
    const data = stats.stats;
    return [
      "Queue,Waiting,Active,Completed,Failed,Delayed,Stalled,Paused",
      `${stats.queue},${data.waiting},${data.active},${data.completed},${data.failed},${data.delayed},${data.stalled || 0},${data.paused}`,
    ].join("\n");
  } else {
    // All queues CSV
    const header =
      "Queue,Waiting,Active,Completed,Failed,Delayed,Stalled,Paused";
    const rows = Object.entries(stats.queues).map(
      ([queueName, queueStats]: [string, any]) => {
        return `${queueName},${queueStats.waiting},${queueStats.active},${queueStats.completed},${queueStats.failed},${queueStats.delayed},${queueStats.stalled || 0},${queueStats.paused}`;
      },
    );

    return [header, ...rows].join("\n");
  }
}
