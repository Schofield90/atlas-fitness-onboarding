import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const { to = "+447490253471", userPhone = process.env.USER_PHONE_NUMBER } =
      body;

    // Check environment
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        {
          error: "Twilio credentials not configured",
          details: {
            hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
            hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
          },
        },
        { status: 503 },
      );
    }

    if (!process.env.TWILIO_SMS_FROM) {
      return NextResponse.json(
        {
          error: "TWILIO_SMS_FROM not configured",
          help: "Set this to your Twilio phone number",
        },
        { status: 503 },
      );
    }

    if (!userPhone) {
      return NextResponse.json(
        {
          error: "No destination phone configured",
          help: "Either pass userPhone in request body or set USER_PHONE_NUMBER environment variable",
        },
        { status: 400 },
      );
    }

    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app"
    ).trim();

    try {
      // Simple call with basic TwiML
      const call = await twilioClient.calls.create({
        to: to,
        from: process.env.TWILIO_SMS_FROM,
        twiml: `<Response>
          <Say voice="alice" language="en-GB">Hello from Atlas Fitness. Connecting your call.</Say>
          <Dial timeout="30" callerId="${process.env.TWILIO_SMS_FROM}">
            <Number>${userPhone}</Number>
          </Dial>
        </Response>`,
      });

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        details: {
          userPhone,
          leadPhone: to,
          twilioPhone: process.env.TWILIO_SMS_FROM,
        },
      });
    } catch (twilioError: any) {
      console.error("Twilio call error:", twilioError);

      return NextResponse.json(
        {
          error: "Failed to create call",
          twilioError: {
            message: twilioError.message,
            code: twilioError.code,
            status: twilioError.status,
            moreInfo: twilioError.moreInfo,
          },
          callDetails: {
            from: process.env.TWILIO_SMS_FROM,
            to: to,
            userPhone,
          },
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
