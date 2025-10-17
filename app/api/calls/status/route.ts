import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Twilio sends data as form-encoded
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const timestamp = formData.get("Timestamp") as string;

    console.log("Call status webhook received:", {
      callSid,
      callStatus,
      callDuration,
      timestamp,
    });

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

    const appStatus = statusMap[callStatus] || callStatus;

    // Store call status in database
    const supabase = await createClient();

    // Update the message log with call status
    const { error } = await supabase
      .from("messages")
      .update({
        status: callStatus === "completed" ? "delivered" : callStatus,
        metadata: {
          call_status: callStatus,
          call_duration: callDuration,
          last_update: timestamp,
          app_status: appStatus,
        },
      })
      .eq("twilio_sid", callSid);

    if (error) {
      console.error("Failed to update call status:", error);
    }

    // You could also use Supabase realtime or a websocket to push updates to the client
    // For now, the client will poll for status updates

    // Twilio expects a 200 OK response
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Call status webhook error:", error);
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("OK", { status: 200 });
  }
}
