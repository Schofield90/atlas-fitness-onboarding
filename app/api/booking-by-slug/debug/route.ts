import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "test";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .single();

    // Get all booking links for debugging
    const { data: allLinks, error: allLinksError } = await supabase
      .from("booking_links")
      .select("id, slug, name, user_id, organization_id, is_active")
      .limit(10);

    // Check if calendar_events table is accessible
    const { data: sampleEvents, error: eventsError } = await supabase
      .from("calendar_events")
      .select("id")
      .limit(1);

    // Check if leads table is accessible
    const { data: sampleLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .limit(1);

    return NextResponse.json({
      slug_searched: slug,
      booking_link_found: !!bookingLink,
      booking_link: bookingLink || null,
      booking_link_error: linkError?.message || null,
      all_booking_links: allLinks || [],
      all_links_error: allLinksError?.message || null,
      tables_check: {
        calendar_events: !eventsError ? "accessible" : eventsError.message,
        leads: !leadsError ? "accessible" : leadsError.message,
      },
      supabase_config: {
        url: supabaseUrl ? "configured" : "missing",
        anon_key: supabaseAnonKey ? "configured" : "missing",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
