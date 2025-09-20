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

    const { country, areaCode, city } = await request.json();

    // Use platform's master Twilio account for searching
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    // Build search parameters
    const searchParams: any = {
      smsEnabled: true,
      voiceEnabled: true,
      limit: 10,
    };

    if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    if (city) {
      searchParams.inLocality = city;
    }

    // Search for available numbers
    const availableNumbers = await twilioClient
      .availablePhoneNumbers(country || "GB")
      .local.list(searchParams);

    // Format the response with pricing
    const formattedNumbers = availableNumbers.map((number) => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality || "Unknown",
      region: number.region || "Unknown",
      postalCode: number.postalCode || "",
      country: country || "GB",
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms,
      },
      // Calculate price with markup for platform service
      price: 10, // Base price £10/month
    }));

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
    });
  } catch (error: any) {
    console.error("Error searching for numbers:", error);
    return NextResponse.json(
      { error: "Failed to search for numbers", details: error.message },
      { status: 500 },
    );
  }
}
