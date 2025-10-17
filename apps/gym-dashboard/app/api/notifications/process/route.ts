import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/app/lib/notification-service";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// POST /api/notifications/process - Process pending notifications
export async function POST(request: NextRequest) {
  try {
    // Check for admin API key or cron job authorization
    const authHeader = request.headers.get("authorization");
    const expectedAuth = process.env.ADMIN_API_KEY || process.env.CRON_SECRET;

    if (
      !authHeader ||
      !expectedAuth ||
      authHeader !== `Bearer ${expectedAuth}`
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    console.log("Processing pending notifications...");

    // Process pending notifications
    await notificationService.processPendingNotifications();

    // Retry failed notifications
    await notificationService.retryFailedNotifications();

    console.log("Notification processing completed");

    return NextResponse.json({
      success: true,
      message: "Notifications processed successfully",
    });
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET /api/notifications/process - Health check for the notification processor
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Notification processor is running",
    timestamp: new Date().toISOString(),
  });
}
