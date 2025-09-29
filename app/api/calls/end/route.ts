import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import twilio from "twilio";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const body = await request.json();

    const { leadId, duration, callSid } = body;

    // End the call on Twilio if callSid provided
    if (
      callSid &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );

        // Update call status to completed
        await twilioClient.calls(callSid).update({
          status: "completed",
        });
      } catch (twilioError: any) {
        console.error("Failed to end Twilio call:", twilioError);
        // Continue even if Twilio update fails
      }
    }

    // Log call end in database
    const { error } = await supabase.from("messages").insert({
      organization_id: userWithOrg.organizationId,
      lead_id: leadId,
      user_id: userWithOrg.id,
      type: "sms", // Using SMS type for calls for now
      direction: "outbound",
      status: "sent",
      body: `Phone call completed (Duration: ${Math.floor(duration / 60)}m ${duration % 60}s)`,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log call end:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
