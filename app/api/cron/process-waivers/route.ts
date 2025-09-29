import { NextRequest, NextResponse } from "next/server";
import { WaiverNotificationService } from "@/app/lib/services/waiver-notification-service";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "default-cron-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waiverService = new WaiverNotificationService();

    // Process expired waivers
    const expiredCount = await waiverService.processExpiredWaivers();

    // Process expiring waivers (within 7 days)
    const expiringNotifications = await waiverService.processExpiringWaivers(7);

    // Log the results
    console.log(`Waiver processing complete:`, {
      expiredWaivers: expiredCount,
      expiringNotifications: expiringNotifications,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        expiredWaivers: expiredCount,
        expiringNotifications: expiringNotifications,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing waivers cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
