import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const { to, testPhone, organizationId, message, includeOptOut, settings } =
      await req.json();

    // Support both old format (to, settings) and new format (testPhone, organizationId, message)
    const phoneNumber = testPhone || to;
    const customMessage = message;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    // If organizationId is provided, get settings from database
    let smsSettings = settings;
    if (organizationId && !settings) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("organization_settings")
        .select("sms_config")
        .eq("organization_id", organizationId)
        .single();

      if (error || !data?.sms_config) {
        return NextResponse.json(
          { error: "SMS configuration not found for organization" },
          { status: 400 },
        );
      }
      smsSettings = { config: data.sms_config };
    }

    const primaryNumber = smsSettings?.config?.phone_numbers?.find(
      (p: any) => p.is_primary,
    );
    if (!primaryNumber) {
      return NextResponse.json(
        {
          error:
            "No primary phone number configured. Please set up SMS integration first.",
        },
        { status: 400 },
      );
    }

    // Check if we have Twilio credentials
    const accountSid =
      smsSettings?.config?.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken =
      smsSettings?.config?.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        {
          error:
            "Twilio credentials not configured. Please check your SMS settings.",
        },
        { status: 400 },
      );
    }

    // Send test SMS using Twilio
    const client = twilio(accountSid, authToken);

    // Prepare message body
    let messageBody =
      customMessage ||
      "Test SMS from Atlas Fitness. Your SMS integration is working correctly!";

    // Add opt-out message if requested
    if (includeOptOut) {
      messageBody += "\n\nReply STOP to unsubscribe";
    }

    const smsMessage = await client.messages.create({
      body: messageBody,
      from: primaryNumber.number,
      to: phoneNumber,
    });

    return NextResponse.json({
      success: true,
      message: "Test SMS sent successfully",
      messageId: smsMessage.sid,
    });
  } catch (error: any) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test SMS" },
      { status: 500 },
    );
  }
}
