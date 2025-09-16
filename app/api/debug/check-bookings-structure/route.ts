import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Try to get column info for bookings table
    const { data: columns, error: columnsError } = await supabase
      .rpc("get_table_columns", {
        table_name: "bookings",
      })
      .select("*");

    // Try a simple query to see what columns exist
    const { data: sampleBooking, error: sampleError } = await supabase
      .from("bookings")
      .select("*")
      .limit(1);

    // Check if clients table exists
    const { data: clientsCheck, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .limit(1);

    // Check if customers table exists
    const { data: customersCheck, error: customersError } = await supabase
      .from("customers")
      .select("id")
      .limit(1);

    return NextResponse.json({
      bookingsColumns: columns || "Could not fetch column info",
      sampleBooking: sampleBooking?.[0] || "No bookings found",
      sampleBookingError: sampleError?.message,
      clientsTableExists: !clientsError,
      customersTableExists: !customersError,
      bookingKeys: sampleBooking?.[0] ? Object.keys(sampleBooking[0]) : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
