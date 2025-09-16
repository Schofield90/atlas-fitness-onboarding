import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const { leadId, to } = body;

    // Validate input
    if (!leadId || !to) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["leadId", "to"],
        },
        { status: 400 },
      );
    }

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get organization's Twilio configuration
    const { data: organization, error: orgError } = await adminSupabase
      .from("organizations")
      .select("*")
      .eq("id", userWithOrg.organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check if organization has a phone number
    if (!organization.twilio_phone_number) {
      // For testing, use the default configuration
      if (
        userWithOrg.organizationId === "63589490-8f55-4157-bd3a-e141594b748e"
      ) {
        // Use global Twilio config for your test org
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
          return NextResponse.json(
            {
              error:
                "Calling service not configured. Please set up Twilio credentials.",
            },
            { status: 503 },
          );
        }
        if (!process.env.TWILIO_SMS_FROM) {
          return NextResponse.json(
            {
              error: "Phone number not configured. Please set TWILIO_SMS_FROM.",
            },
            { status: 503 },
          );
        }
      } else {
        return NextResponse.json(
          {
            error:
              "Your organization does not have a phone number configured. Please contact support.",
          },
          { status: 503 },
        );
      }
    }

    // Check if app URL is configured
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.warn("NEXT_PUBLIC_APP_URL not configured, using fallback URL");
    }

    // For browser-based calling, you would:
    // 1. Generate a Twilio Access Token with Voice grant
    // 2. Return the token to the client
    // 3. Client uses Twilio Voice SDK to make the call

    // Use organization's Twilio credentials or default for test org
    let accountSid: string;
    let authToken: string;
    let fromNumber: string;

    if (
      organization.twilio_subaccount_sid &&
      organization.twilio_subaccount_auth_token
    ) {
      // Use organization's sub-account
      accountSid = organization.twilio_subaccount_sid;
      authToken = organization.twilio_subaccount_auth_token;
      fromNumber = organization.twilio_phone_number;
    } else {
      // Use default account (for testing)
      accountSid = process.env.TWILIO_ACCOUNT_SID!;
      authToken = process.env.TWILIO_AUTH_TOKEN!;
      fromNumber =
        organization.twilio_phone_number || process.env.TWILIO_SMS_FROM!;
    }

    const twilioClient = twilio(accountSid, authToken);

    // Get base URL and trim any whitespace/newlines
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://atlas-fitness-onboarding.vercel.app"
    ).trim();

    try {
      // Get the calling staff member's phone number
      let userPhone = body.userPhone; // Can be passed explicitly

      if (!userPhone) {
        // Get current user's staff record
        const { data: staffRecord } = await adminSupabase
          .from("organization_staff")
          .select("phone_number")
          .eq("organization_id", userWithOrg.organizationId)
          .eq("user_id", userWithOrg.id)
          .single();

        if (staffRecord?.phone_number) {
          userPhone = staffRecord.phone_number;
        } else {
          return NextResponse.json(
            {
              error:
                "Your phone number is not configured. Please contact your administrator.",
            },
            { status: 400 },
          );
        }
      }

      console.log("Initiating call with:", {
        to,
        from: fromNumber,
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}&userPhone=${encodeURIComponent(userPhone)}&orgId=${userWithOrg.organizationId}`,
        baseUrl,
        userPhone,
        accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : "NOT SET",
        fromNumber,
      });

      // Create a call that connects the user's phone to the lead's phone
      const call = await twilioClient.calls.create({
        to: to,
        from: fromNumber,
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}&userPhone=${encodeURIComponent(userPhone)}&orgId=${userWithOrg.organizationId}`,
        statusCallback: `${baseUrl}/api/calls/status`,
        statusCallbackEvent: ["initiated", "answered", "completed"],
        record: true, // Record the call
      });

      // Log call initiation in database
      const { error: logError } = await adminSupabase.from("sms_logs").insert({
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        message: `Phone call initiated to ${lead.name}`,
        direction: "outbound",
        from_number: fromNumber,
        to_number: to,
        twilio_message_sid: call.sid,
      });

      if (logError) {
        console.error("Failed to log call:", logError);
      }

      return NextResponse.json({
        success: true,
        callSid: call.sid,
        status: call.status,
      });
    } catch (twilioError: any) {
      console.error("Twilio call error:", {
        message: twilioError.message,
        code: twilioError.code,
        moreInfo: twilioError.moreInfo,
        status: twilioError.status,
        details: twilioError,
        to: to,
        from: process.env.TWILIO_SMS_FROM,
        url: `${baseUrl}/api/calls/twiml?leadId=${leadId}`,
      });

      // Check for specific Twilio errors
      if (twilioError.code === 21215) {
        return NextResponse.json(
          {
            error: "Invalid phone number format",
            details:
              "Please ensure the phone number includes country code (e.g., +447777777777)",
          },
          { status: 400 },
        );
      }

      if (twilioError.code === 21217) {
        return NextResponse.json(
          {
            error: "Phone number not verified",
            details:
              "The destination phone number needs to be verified in your Twilio trial account",
          },
          { status: 400 },
        );
      }

      if (twilioError.code === 21614) {
        return NextResponse.json(
          {
            error: "Invalid phone number",
            details: 'The "To" phone number is not a valid phone number',
          },
          { status: 400 },
        );
      }

      if (twilioError.code === 21401) {
        return NextResponse.json(
          {
            error: "Invalid Account SID",
            details: "The Twilio Account SID is incorrect",
          },
          { status: 401 },
        );
      }

      if (twilioError.code === 20003) {
        return NextResponse.json(
          {
            error: "Authentication failed",
            details: "Please check your Twilio Account SID and Auth Token",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to initiate call",
          details: twilioError.message || "Unknown error",
          code: twilioError.code,
          moreInfo: twilioError.moreInfo,
          debugInfo: {
            to: to,
            from: process.env.TWILIO_SMS_FROM,
            twilioUrl: `${baseUrl}/api/calls/twiml?leadId=${leadId}`,
          },
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
