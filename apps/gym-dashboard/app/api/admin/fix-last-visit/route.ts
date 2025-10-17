import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();

    // First update all clients with their actual last visit from class_bookings
    const { error: updateError } = await supabase.rpc(
      "fix_client_last_visits",
      {},
    );

    if (updateError) {
      // If function doesn't exist, run the SQL directly
      const updateSQL = `
        UPDATE clients c
        SET 
          last_visit_date = COALESCE(
            (
              SELECT MAX(cb.booking_date)
              FROM class_bookings cb
              WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
              AND cb.booking_status = 'confirmed'
            ),
            c.last_visit_date
          ),
          total_visits = COALESCE(
            (
              SELECT COUNT(*)
              FROM class_bookings cb
              WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
              AND cb.booking_status = 'confirmed'
            ),
            c.total_visits,
            0
          )
        WHERE c.organization_id IS NOT NULL
      `;

      const { error: sqlError, data } = await supabase.rpc("exec_sql", {
        query: updateSQL,
      });

      if (sqlError && sqlError.message.includes("exec_sql")) {
        // exec_sql doesn't exist either, try a different approach
        // Get all clients and update them one by one
        const { data: clients } = await supabase
          .from("clients")
          .select("id")
          .not("organization_id", "is", null);

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

            // Update client
            await supabase
              .from("clients")
              .update({
                last_visit_date: lastBooking?.booking_date || null,
                total_visits: count || 0,
              })
              .eq("id", client.id);
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
      message: "Successfully updated client last visit dates",
      summary,
    });
  } catch (error: any) {
    console.error("Error fixing last visits:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
