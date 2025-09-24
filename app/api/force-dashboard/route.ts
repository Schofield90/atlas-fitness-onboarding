import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // Set a bypass cookie to force dashboard access
  const cookieStore = await cookies();

  cookieStore.set("organization-bypass", "true", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  cookieStore.set("organization-id", "63589490-8f55-4157-bd3a-e141594b748e", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // Redirect to dashboard
  return NextResponse.redirect(new URL("/dashboard", "http://localhost:3000"));
}
