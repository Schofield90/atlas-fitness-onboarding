import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Create admin client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Get all clients
    const { data: clients, error: fetchError } = await supabase
      .from("clients")
      .select("id")
      .not("organization_id", "is", null)
      .limit(100); // Process first 100 clients

    if (fetchError) {
      throw fetchError;
    }

    let updated = 0;
    const updates = [];

    if (clients) {
      for (const client of clients) {
        // Get last visit
        const { data: lastBooking } = await supabase
          .from("class_bookings")
          .select("booking_date")
          .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`)
          .eq("booking_status", "confirmed")
          .order("booking_date", { ascending: false })
          .limit(1)
          .single();

        // Get total visits
        const { count } = await supabase
          .from("class_bookings")
          .select("*", { count: "exact", head: true })
          .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`)
          .eq("booking_status", "confirmed");

        if (lastBooking?.booking_date || count) {
          // Update client
          const { error: updateError } = await supabase
            .from("clients")
            .update({
              last_visit_date: lastBooking?.booking_date || null,
              total_visits: count || 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", client.id);

          if (!updateError) {
            updated++;
            updates.push({
              client_id: client.id,
              last_visit: lastBooking?.booking_date,
              total_visits: count,
            });
          }
        }
      }
    }

    // Get summary of updates
    const { data: summary } = await supabase
      .from("clients")
      .select("id, first_name, last_name, last_visit_date, total_visits")
      .not("last_visit_date", "is", null)
      .order("last_visit_date", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} client last visit dates`,
      totalProcessed: clients?.length || 0,
      updated,
      recentUpdates: updates.slice(0, 5),
      topClients: summary,
    });
  } catch (error: any) {
    console.error("Error fixing last visits:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
