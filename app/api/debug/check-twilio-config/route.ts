import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Check all required Twilio environment variables
    const config = {
      TWILIO_ACCOUNT_SID: {
        present: !!process.env.TWILIO_ACCOUNT_SID,
        value: process.env.TWILIO_ACCOUNT_SID
          ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 4)}...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}`
          : "NOT SET",
      },
      TWILIO_AUTH_TOKEN: {
        present: !!process.env.TWILIO_AUTH_TOKEN,
        value: process.env.TWILIO_AUTH_TOKEN
          ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 4)}...`
          : "NOT SET",
      },
      TWILIO_SMS_FROM: {
        present: !!process.env.TWILIO_SMS_FROM,
        value: process.env.TWILIO_SMS_FROM || "NOT SET",
        format: process.env.TWILIO_SMS_FROM
          ? process.env.TWILIO_SMS_FROM.startsWith("+")
            ? "CORRECT (starts with +)"
            : "INCORRECT (missing + prefix)"
          : "N/A",
      },
      TWILIO_WHATSAPP_FROM: {
        present: !!process.env.TWILIO_WHATSAPP_FROM,
        value: process.env.TWILIO_WHATSAPP_FROM || "NOT SET",
        format: process.env.TWILIO_WHATSAPP_FROM
          ? process.env.TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
            ? "CORRECT (has whatsapp: prefix)"
            : "INCORRECT (missing whatsapp: prefix)"
          : "N/A",
      },
      NEXT_PUBLIC_APP_URL: {
        present: !!process.env.NEXT_PUBLIC_APP_URL,
        value: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
      },
    };

    // Check which features are properly configured
    const features = {
      sms:
        config.TWILIO_ACCOUNT_SID.present &&
        config.TWILIO_AUTH_TOKEN.present &&
        config.TWILIO_SMS_FROM.present,
      whatsapp:
        config.TWILIO_ACCOUNT_SID.present &&
        config.TWILIO_AUTH_TOKEN.present &&
        config.TWILIO_WHATSAPP_FROM.present,
      calling:
        config.TWILIO_ACCOUNT_SID.present &&
        config.TWILIO_AUTH_TOKEN.present &&
        config.TWILIO_SMS_FROM.present &&
        config.NEXT_PUBLIC_APP_URL.present,
    };

    // Recommendations
    const recommendations = [];

    if (!config.TWILIO_ACCOUNT_SID.present) {
      recommendations.push(
        "Add TWILIO_ACCOUNT_SID to Vercel environment variables",
      );
    }

    if (!config.TWILIO_AUTH_TOKEN.present) {
      recommendations.push(
        "Add TWILIO_AUTH_TOKEN to Vercel environment variables",
      );
    }

    if (!config.TWILIO_SMS_FROM.present) {
      recommendations.push(
        "Add TWILIO_SMS_FROM with your Twilio phone number (e.g., +447777777777)",
      );
    } else if (!config.TWILIO_SMS_FROM.value.startsWith("+")) {
      recommendations.push(
        "TWILIO_SMS_FROM must start with + and country code (e.g., +447777777777)",
      );
    }

    if (!config.NEXT_PUBLIC_APP_URL.present) {
      recommendations.push(
        "Add NEXT_PUBLIC_APP_URL (e.g., https://atlas-fitness-onboarding.vercel.app)",
      );
    }

    // Test Twilio connection if credentials are present
    let twilioStatus = "Not tested - missing credentials";
    let twilioError = null;

    if (config.TWILIO_ACCOUNT_SID.present && config.TWILIO_AUTH_TOKEN.present) {
      try {
        const twilio = require("twilio");
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );

        // Try to fetch account info as a connection test
        const account = await client.api
          .accounts(process.env.TWILIO_ACCOUNT_SID)
          .fetch();
        twilioStatus = `Connected - Account: ${account.friendlyName || account.sid}`;
      } catch (error: any) {
        twilioStatus = "Connection failed";
        twilioError = error.message;

        if (error.code === 20003) {
          recommendations.push(
            "Twilio authentication failed - check your Account SID and Auth Token",
          );
        }
      }
    }

    return NextResponse.json({
      configuration: config,
      features,
      twilioStatus,
      twilioError,
      recommendations,
      summary: {
        ready_for_calling: features.calling,
        ready_for_sms: features.sms,
        ready_for_whatsapp: features.whatsapp,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
