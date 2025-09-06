import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const { accountSid, authToken, phoneNumber } = await request.json();

    // Validate required fields
    if (!accountSid || !authToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Account SID and Auth Token are required",
        },
        { status: 400 },
      );
    }

    // Validate Account SID format
    if (!accountSid.startsWith("AC") || accountSid.length !== 34) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid Account SID format. Should start with "AC" and be 34 characters long.',
        },
        { status: 400 },
      );
    }

    // Create Twilio client
    let client;
    try {
      client = twilio(accountSid, authToken);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to create Twilio client. Please check your credentials.",
        },
        { status: 400 },
      );
    }

    // Test 1: Verify account by fetching account details
    let accountInfo;
    try {
      accountInfo = await client.api.accounts(accountSid).fetch();
    } catch (error: any) {
      console.error("Twilio account fetch error:", error);

      if (error.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid credentials. Please check your Account SID and Auth Token.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Failed to verify account: ${error.message}`,
        },
        { status: 400 },
      );
    }

    // Test 2: Check account status and balance
    let balance;
    try {
      balance = await client.balance.fetch();
    } catch (error: any) {
      console.warn("Could not fetch balance:", error.message);
      // Balance fetch failure is not critical
    }

    // Test 3: Verify phone number if provided
    let phoneNumberInfo = null;
    let availableNumbers = [];

    if (phoneNumber) {
      try {
        // Verify the phone number exists and is owned by this account
        phoneNumberInfo = await client.incomingPhoneNumbers.list({
          phoneNumber: phoneNumber,
          limit: 1,
        });

        if (phoneNumberInfo.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Phone number ${phoneNumber} is not associated with your Twilio account. Please purchase it first.`,
            },
            { status: 400 },
          );
        }

        // Check SMS capability
        const number = phoneNumberInfo[0];
        if (!number.capabilities.sms) {
          return NextResponse.json(
            {
              success: false,
              error: `Phone number ${phoneNumber} does not have SMS capabilities. Please choose a different number.`,
            },
            { status: 400 },
          );
        }
      } catch (error: any) {
        console.error("Phone number verification error:", error);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to verify phone number: ${error.message}`,
          },
          { status: 400 },
        );
      }
    } else {
      // If no phone number provided, fetch available numbers
      try {
        const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
        availableNumbers = numbers
          .filter((num) => num.capabilities.sms) // Only SMS-capable numbers
          .map((num) => ({
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName,
            capabilities: Object.keys(num.capabilities).filter(
              (cap) => num.capabilities[cap],
            ),
            monthlyPrice: "1.00", // Default price, actual pricing varies
          }));
      } catch (error: any) {
        console.warn("Could not fetch phone numbers:", error.message);
        // Not critical for connection test
      }
    }

    // Test 4: Check account verification status
    const isTrialAccount =
      accountInfo.status === "active" && accountInfo.type === "Trial";

    // Prepare response
    const responseData = {
      success: true,
      accountInfo: {
        sid: accountInfo.sid,
        friendlyName: accountInfo.friendlyName,
        status: accountInfo.status,
        type: accountInfo.type,
        dateCreated: accountInfo.dateCreated,
      },
      balance: balance
        ? {
            currency: balance.currency,
            balance: balance.balance,
          }
        : null,
      phoneNumber: phoneNumberInfo?.[0]
        ? {
            phoneNumber: phoneNumberInfo[0].phoneNumber,
            friendlyName: phoneNumberInfo[0].friendlyName,
            capabilities: phoneNumberInfo[0].capabilities,
            status: phoneNumberInfo[0].status,
          }
        : null,
      availableNumbers,
      warnings: [],
      recommendations: [],
    };

    // Add warnings and recommendations
    if (isTrialAccount) {
      responseData.warnings.push(
        "Your account is in trial mode. Some features may be limited.",
      );
      responseData.recommendations.push(
        "Consider upgrading your account to remove trial limitations.",
      );
    }

    if (balance && parseFloat(balance.balance) < 5) {
      responseData.warnings.push(
        "Your account balance is low. Add credits to ensure uninterrupted service.",
      );
      responseData.recommendations.push(
        "Add at least $10 in credits for reliable SMS service.",
      );
    }

    if (!phoneNumber && availableNumbers.length === 0) {
      responseData.recommendations.push(
        "Purchase a phone number with SMS capabilities to start sending messages.",
      );
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Twilio connection test error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "An unexpected error occurred while testing the connection.",
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Twilio connection test endpoint is operational",
  });
}
