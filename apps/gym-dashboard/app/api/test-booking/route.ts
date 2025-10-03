import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Test endpoint to verify booking system functionality
 * Tests both client and lead booking scenarios
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      customerId,
      customerType = "client", // 'client' or 'lead'
      classSessionId,
      organizationId,
    } = body;

    console.log(`Testing booking for ${customerType}: ${customerId}`);

    // Verify customer exists
    let customer = null;
    if (customerType === "client") {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", customerId)
        .single();

      if (clientError) {
        throw new Error(`Client not found: ${clientError.message}`);
      }
      customer = clientData;
    } else {
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", customerId)
        .single();

      if (leadError) {
        throw new Error(`Lead not found: ${leadError.message}`);
      }
      customer = leadData;
    }

    // Verify class session exists
    const { data: classSession, error: classError } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("id", classSessionId)
      .single();

    if (classError) {
      throw new Error(`Class session not found: ${classError.message}`);
    }

    // Create test booking
    const bookingData: any = {
      class_session_id: classSessionId,
      organization_id: organizationId,
      booking_status: "confirmed",
      payment_status: "paid",
      notes: `Test booking for ${customerType}`,
    };

    // Set appropriate customer field
    if (customerType === "lead") {
      bookingData.customer_id = customerId;
    } else {
      bookingData.client_id = customerId;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }

    // Test RLS policies by trying to read the booking back
    const { data: readBackBooking, error: readError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking.id)
      .single();

    if (readError) {
      console.warn(`RLS policy may be blocking read: ${readError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Test booking created successfully for ${customerType}`,
      data: {
        customer,
        classSession,
        booking,
        readBackBooking,
        rlsWorking: !readError,
      },
    });
  } catch (error) {
    console.error("Test booking error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

/**
 * Get booking test data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "organizationId is required",
        },
        { status: 400 },
      );
    }

    // Get sample data for testing
    const [clientsResult, leadsResult, classSessionsResult] = await Promise.all(
      [
        supabase
          .from("clients")
          .select("id, first_name, last_name, email")
          .eq("organization_id", organizationId)
          .limit(5),
        supabase
          .from("leads")
          .select("id, first_name, last_name, email")
          .eq("organization_id", organizationId)
          .limit(5),
        supabase
          .from("class_sessions")
          .select("id, start_time, end_time")
          .eq("organization_id", organizationId)
          .limit(5),
      ],
    );

    return NextResponse.json({
      success: true,
      data: {
        clients: clientsResult.data || [],
        leads: leadsResult.data || [],
        classSessions: classSessionsResult.data || [],
        organizationId,
      },
    });
  } catch (error) {
    console.error("Error fetching test data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
