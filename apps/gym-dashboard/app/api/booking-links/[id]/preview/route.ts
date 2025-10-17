import { NextRequest, NextResponse } from "next/server";
import { serverBookingLinkService } from "@/app/lib/services/booking-link-server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Get booking link to verify access
    const bookingLink = await serverBookingLinkService.getBookingLinkById(
      params.id,
    );
    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 },
      );
    }

    // Check if user has access to this booking link
    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (
      orgError ||
      !orgMember ||
      bookingLink.organization_id !== orgMember.org_id
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate preview data
    const previewConfig = {
      ...bookingLink,
      ...body, // Override with preview settings
      slug: `preview-${Date.now()}`, // Temporary slug for preview
    };

    // Get appointment types for preview
    const { data: appointmentTypes, error: atError } = await supabase
      .from("appointment_types")
      .select("*")
      .in("id", previewConfig.appointment_type_ids || [])
      .eq("is_active", true);

    if (atError) {
      console.error("Error fetching appointment types for preview:", atError);
    }

    // Get form fields
    const formFields = await serverBookingLinkService.getFormFields(params.id);

    // Generate sample availability (next 7 days)
    const sampleSlots = [
      {
        date: new Date().toISOString().split("T")[0],
        slots: [
          { start_time: "09:00", staff_name: "John Smith" },
          { start_time: "10:30", staff_name: "John Smith" },
          { start_time: "14:00", staff_name: "Sarah Johnson" },
          { start_time: "15:30", staff_name: "Sarah Johnson" },
        ],
      },
    ];

    return NextResponse.json({
      preview: true,
      booking_link: previewConfig,
      appointment_types: appointmentTypes || [],
      form_fields: formFields,
      sample_availability: sampleSlots,
      preview_url: `/book/preview-${Date.now()}`,
    });
  } catch (error) {
    console.error("Error generating booking link preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
