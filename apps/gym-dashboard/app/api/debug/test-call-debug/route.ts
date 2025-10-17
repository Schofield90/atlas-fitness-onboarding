import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import twilio from "twilio";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const { to = "+447490253471" } = body; // Default to your number for testing

    // Step 1: Check organization setup
    const { data: organization, error: orgError } = await adminSupabase
      .from("organizations")
      .select("*")
      .eq("id", userWithOrg.organizationId)
      .single();

    const orgCheck = {
      hasOrganization: !!organization,
      organizationId: organization?.id,
      organizationName: organization?.name,
      twilioPhoneNumber: organization?.twilio_phone_number,
      hasSubAccount: !!organization?.twilio_subaccount_sid,
      error: orgError,
    };

    // Step 2: Check Twilio configuration
    const twilioConfig = {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      accountSidLength: process.env.TWILIO_ACCOUNT_SID?.length,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      authTokenLength: process.env.TWILIO_AUTH_TOKEN?.length,
      hasPhoneFrom: !!process.env.TWILIO_SMS_FROM,
      phoneFrom: process.env.TWILIO_SMS_FROM,
      appUrl:
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://atlas-fitness-onboarding.vercel.app",
    };

    // Step 3: Determine which credentials to use
    let accountSid: string | undefined;
    let authToken: string | undefined;
    let fromNumber: string | undefined;

    if (
      organization?.twilio_subaccount_sid &&
      organization?.twilio_subaccount_auth_token
    ) {
      accountSid = organization.twilio_subaccount_sid;
      authToken = organization.twilio_subaccount_auth_token;
      fromNumber = organization.twilio_phone_number;
    } else {
      accountSid = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
      fromNumber =
        organization?.twilio_phone_number || process.env.TWILIO_SMS_FROM;
    }

    const credentialsUsed = {
      usingSubAccount: !!organization?.twilio_subaccount_sid,
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      fromNumber: fromNumber,
    };

    // Step 4: Try to create Twilio client
    let twilioClient;
    let twilioError = null;

    try {
      if (!accountSid || !authToken) {
        throw new Error("Missing Twilio credentials");
      }
      twilioClient = twilio(accountSid, authToken);

      // Test the credentials by fetching account info
      const account = await twilioClient.api.accounts(accountSid).fetch();

      credentialsUsed["accountStatus"] = account.status;
      credentialsUsed["accountFriendlyName"] = account.friendlyName;
    } catch (error: any) {
      twilioError = {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      };
    }

    // Step 5: Try to make a test call if client is valid
    let callResult = null;
    let callError = null;

    if (twilioClient && fromNumber && !twilioError) {
      try {
        const baseUrl = twilioConfig.appUrl.trim();

        const call = await twilioClient.calls.create({
          to: to,
          from: fromNumber,
          url: `${baseUrl}/api/calls/twiml?test=true`,
          statusCallback: `${baseUrl}/api/calls/status`,
          statusCallbackEvent: ["initiated", "answered", "completed"],
          record: false,
        });

        callResult = {
          success: true,
          callSid: call.sid,
          status: call.status,
          from: call.from,
          to: call.to,
        };
      } catch (error: any) {
        callError = {
          message: error.message,
          code: error.code,
          status: error.status,
          moreInfo: error.moreInfo,
          details: error.details,
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      organizationCheck: orgCheck,
      twilioConfig,
      credentialsUsed,
      twilioClientTest: {
        clientCreated: !!twilioClient,
        error: twilioError,
      },
      callTest: {
        attempted: !!twilioClient && !!fromNumber,
        result: callResult,
        error: callError,
      },
      recommendations: getRecommendations(
        orgCheck,
        twilioConfig,
        credentialsUsed,
        twilioError,
        callError,
      ),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

function getRecommendations(
  orgCheck: any,
  twilioConfig: any,
  credentialsUsed: any,
  twilioError: any,
  callError: any,
): string[] {
  const recommendations = [];

  if (!orgCheck.twilioPhoneNumber) {
    recommendations.push(
      "Organization does not have a Twilio phone number set. Run the migration.",
    );
  }

  if (!twilioConfig.hasAccountSid || !twilioConfig.hasAuthToken) {
    recommendations.push(
      "Twilio credentials are not configured in environment variables.",
    );
  }

  if (twilioError) {
    if (twilioError.code === 20003) {
      recommendations.push(
        "Twilio authentication failed. Check your Account SID and Auth Token.",
      );
    } else {
      recommendations.push(`Twilio client error: ${twilioError.message}`);
    }
  }

  if (callError) {
    if (callError.code === 21215) {
      recommendations.push(
        "Invalid phone number format. Ensure numbers include country code (e.g., +447123456789)",
      );
    } else if (callError.code === 21210) {
      recommendations.push(
        `The from phone number (${credentialsUsed.fromNumber}) is not verified or owned by your Twilio account.`,
      );
    } else {
      recommendations.push(`Call error: ${callError.message}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Everything appears to be configured correctly.");
  }

  return recommendations;
}
