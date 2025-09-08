import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("=== DEBUG WELCOME EMAIL ENDPOINT HIT ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Headers:", Object.fromEntries(request.headers.entries()));

  try {
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    return NextResponse.json({
      success: true,
      message: "Debug endpoint reached successfully",
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      {
        error: "Failed to parse request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  console.log("=== DEBUG WELCOME GET ENDPOINT HIT ===");
  console.log("Timestamp:", new Date().toISOString());

  return NextResponse.json({
    status: "Debug endpoint is working",
    method: "GET",
    timestamp: new Date().toISOString(),
  });
}
