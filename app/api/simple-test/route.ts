import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("=== SIMPLE TEST ENDPOINT HIT ===");
  console.log("Time:", new Date().toISOString());

  // Just return success - no auth, no processing
  return NextResponse.json({
    success: true,
    message: "Simple test endpoint working!",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  console.log("=== SIMPLE TEST POST HIT ===");
  console.log("Time:", new Date().toISOString());

  try {
    const body = await request.json();
    console.log("Body received:", body);
  } catch (e) {
    console.log("No body or invalid JSON");
  }

  return NextResponse.json({
    success: true,
    message: "POST endpoint working!",
    timestamp: new Date().toISOString(),
  });
}
