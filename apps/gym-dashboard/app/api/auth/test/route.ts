import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        session: null,
        authenticated: false,
      },
      { status: 401 },
    );
  }

  if (!session) {
    return NextResponse.json(
      {
        error: "No active session",
        session: null,
        authenticated: false,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
    session: {
      access_token: session.access_token?.substring(0, 20) + "...",
      refresh_token: session.refresh_token?.substring(0, 20) + "...",
      expires_at: session.expires_at,
      expires_in: session.expires_in,
    },
  });
}
