import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountSid, authToken } = await request.json();

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Account SID and Auth Token are required" },
        { status: 400 },
      );
    }

    try {
      // Create Twilio client with user's credentials
      const twilioClient = twilio(accountSid, authToken);

      // Fetch all phone numbers from the account
      const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
        limit: 20,
      });

      // Format the response
      const formattedNumbers = phoneNumbers.map((number) => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        capabilities: {
          voice: number.capabilities.voice,
          sms: number.capabilities.sms,
          mms: number.capabilities.mms,
          fax: number.capabilities.fax,
        },
        sid: number.sid,
        dateCreated: number.dateCreated,
        status: number.status,
        voiceUrl: number.voiceUrl,
        smsUrl: number.smsUrl,
      }));

      if (formattedNumbers.length === 0) {
        return NextResponse.json({
          success: true,
          numbers: [],
          message:
            "No phone numbers found. Please purchase a number in your Twilio Console first.",
        });
      }

      return NextResponse.json({
        success: true,
        numbers: formattedNumbers,
        count: formattedNumbers.length,
      });
    } catch (twilioError: any) {
      console.error("Twilio list error:", twilioError);

      if (twilioError.status === 401) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 },
        );
      }

      throw twilioError;
    }
  } catch (error: any) {
    console.error("Error listing Twilio numbers:", error);
    return NextResponse.json(
      { error: "Failed to list phone numbers", details: error.message },
      { status: 500 },
    );
  }
}
