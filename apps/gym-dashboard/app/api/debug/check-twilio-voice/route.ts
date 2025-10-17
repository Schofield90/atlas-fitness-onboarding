import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import twilio from "twilio";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const adminSupabase = createAdminClient();

    // Check organization
    const { data: organization, error: orgError } = await adminSupabase
      .from("organizations")
      .select("*")
      .eq("id", userWithOrg.organizationId)
      .single();

    // Check environment variables
    const envCheck = {
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM || "NOT SET",
      USER_PHONE_NUMBER: process.env.USER_PHONE_NUMBER || "NOT SET",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
    };

    // Try to get phone number info from Twilio
    let phoneNumberInfo = null;
    let twilioError = null;

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_SMS_FROM
    ) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );

        // Search for the phone number
        const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
          phoneNumber: process.env.TWILIO_SMS_FROM,
          limit: 1,
        });

        if (phoneNumbers.length > 0) {
          const phoneNumber = phoneNumbers[0];
          phoneNumberInfo = {
            phoneNumber: phoneNumber.phoneNumber,
            friendlyName: phoneNumber.friendlyName,
            capabilities: {
              voice: phoneNumber.capabilities.voice,
              SMS: phoneNumber.capabilities.sms,
              MMS: phoneNumber.capabilities.mms,
            },
            voiceUrl: phoneNumber.voiceUrl,
            voiceMethod: phoneNumber.voiceMethod,
            statusCallbackUrl: phoneNumber.statusCallback,
            smsUrl: phoneNumber.smsUrl,
            smsMethod: phoneNumber.smsMethod,
          };
        }
      } catch (error: any) {
        twilioError = {
          message: error.message,
          code: error.code,
          status: error.status,
        };
      }
    }

    // Expected webhook URLs
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app"
    ).trim();
    const expectedWebhooks = {
      voice: `${baseUrl}/api/webhooks/twilio-voice`,
      sms: `${baseUrl}/api/webhooks/twilio`,
      statusCallback: `${baseUrl}/api/webhooks/twilio-voice/status`,
    };

    // Check recent calls
    let recentCalls = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );
        const calls = await twilioClient.calls.list({
          limit: 5,
          from: process.env.TWILIO_SMS_FROM,
        });

        recentCalls = calls.map((call) => ({
          sid: call.sid,
          to: call.to,
          from: call.from,
          status: call.status,
          direction: call.direction,
          duration: call.duration,
          startTime: call.startTime,
        }));
      } catch (error) {
        console.error("Failed to fetch recent calls:", error);
      }
    }

    return NextResponse.json({
      organizationCheck: {
        id: organization?.id,
        name: organization?.name,
        hasPhoneNumber: !!organization?.twilio_phone_number,
        phoneNumber: organization?.twilio_phone_number,
      },
      environmentVariables: envCheck,
      twilioPhoneNumber: phoneNumberInfo,
      twilioError,
      expectedWebhooks,
      recentCalls,
      recommendations: generateRecommendations(
        envCheck,
        phoneNumberInfo,
        twilioError,
      ),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

function generateRecommendations(
  envCheck: any,
  phoneNumberInfo: any,
  twilioError: any,
): string[] {
  const recommendations = [];

  if (!envCheck.TWILIO_ACCOUNT_SID || !envCheck.TWILIO_AUTH_TOKEN) {
    recommendations.push(
      "Twilio credentials not configured in environment variables",
    );
  }

  if (envCheck.TWILIO_SMS_FROM === "NOT SET") {
    recommendations.push(
      "TWILIO_SMS_FROM not configured - this is required for making calls",
    );
  }

  if (envCheck.USER_PHONE_NUMBER === "NOT SET") {
    recommendations.push(
      "USER_PHONE_NUMBER not configured - calls will not connect to any destination",
    );
  }

  if (twilioError) {
    recommendations.push(`Twilio API error: ${twilioError.message}`);
  }

  if (phoneNumberInfo) {
    if (!phoneNumberInfo.capabilities.voice) {
      recommendations.push(
        "Your Twilio phone number does not have voice capabilities enabled",
      );
    }

    if (
      phoneNumberInfo.voiceUrl &&
      !phoneNumberInfo.voiceUrl.includes("atlas-fitness-onboarding")
    ) {
      recommendations.push(
        `Voice webhook is pointing to: ${phoneNumberInfo.voiceUrl} - should point to your app`,
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Twilio voice configuration appears correct");
  }

  return recommendations;
}
