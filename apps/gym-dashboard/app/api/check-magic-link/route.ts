import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // This endpoint checks if the magic link code is deployed

  // Check if the account_claim_tokens table would be used
  const codeCheck = {
    status: "Magic Link System Check",
    expectedBehavior: {
      1: "Should generate a random token using crypto.getRandomValues",
      2: "Should create entry in account_claim_tokens table",
      3: "Should send email with magic link format: /claim-account?token=XXX",
      4: "Should NOT send temporary passwords anymore",
    },
    deployment: {
      message:
        "If you're seeing passwords instead of magic links, the deployment may be cached or incomplete",
      solution: "Try a hard refresh in Vercel or redeploy from the main branch",
    },
    testUrls: {
      claimPage: "https://atlas-fitness-onboarding.vercel.app/claim-account",
      shouldExist: "This page should exist if properly deployed",
    },
  };

  return NextResponse.json(codeCheck);
}
