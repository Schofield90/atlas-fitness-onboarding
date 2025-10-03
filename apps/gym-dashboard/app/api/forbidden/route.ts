import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Forbidden" },
    {
      status: 403,
      headers: {
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

export async function POST() {
  return GET();
}

export async function PUT() {
  return GET();
}

export async function DELETE() {
  return GET();
}

export async function PATCH() {
  return GET();
}
