import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("PING endpoint hit at:", new Date().toISOString());

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "API is working",
    env: {
      hasResendKey: !!process.env.RESEND_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
