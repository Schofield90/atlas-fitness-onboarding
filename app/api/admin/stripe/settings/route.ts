// This file is no longer needed - using Stripe Connect OAuth instead
// Kept for backward compatibility
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message: "Please use /api/admin/stripe/status instead",
    },
    { status: 410 },
  );
}
