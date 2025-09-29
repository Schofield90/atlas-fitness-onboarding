import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import twilio from "twilio";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const callSid = request.nextUrl.searchParams.get("callSid");

    if (!callSid) {
      return NextResponse.json(
        { error: "Call SID is required" },
        { status: 400 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 503 },
      );
    }

    const twilioClient = twilio(accountSid, authToken);

    try {
      const call = await twilioClient.calls(callSid).fetch();

      // Map Twilio statuses to our app statuses
      const statusMap: Record<string, string> = {
        queued: "connecting",
        initiated: "connecting",
        ringing: "connecting",
        "in-progress": "connected",
        completed: "ended",
        busy: "ended",
        "no-answer": "ended",
        canceled: "ended",
        failed: "ended",
      };

      const appStatus = statusMap[call.status] || call.status;

      return NextResponse.json({
        callSid: call.sid,
        status: call.status,
        appStatus,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        to: call.to,
        from: call.from,
      });
    } catch (twilioError: any) {
      console.error("Failed to fetch call status:", twilioError);
      return NextResponse.json(
        {
          error: "Failed to fetch call status",
          details: twilioError.message,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
