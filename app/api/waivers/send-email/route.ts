import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

const sendWaiverEmailSchema = z.object({
  customer_waiver_id: z.string().uuid("Invalid customer waiver ID"),
  email_type: z.enum(["initial", "reminder"]).default("initial"),
  custom_message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendWaiverEmailSchema.parse(body);

    // Get customer waiver details
    const { data: customerWaiver, error: fetchError } = await supabase
      .from("customer_waivers")
      .select(
        `
        *,
        waiver: waivers!inner(
          id,
          title,
          waiver_type,
          content
        )
      `,
      )
      .eq("id", validatedData.customer_waiver_id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (fetchError || !customerWaiver) {
      return NextResponse.json(
        { error: "Customer waiver not found" },
        { status: 404 },
      );
    }

    // Get customer details
    let customer = null;

    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("id", customerWaiver.customer_id)
      .single();

    if (clientData) {
      customer = clientData;
    } else {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone")
        .eq("id", customerWaiver.customer_id)
        .single();

      if (leadData) {
        customer = {
          ...leadData,
          name: `${leadData.first_name} ${leadData.last_name}`.trim(),
        };
      }
    }

    if (!customer || !customer.email) {
      return NextResponse.json(
        { error: "Customer email not found" },
        { status: 400 },
      );
    }

    // Get organization details for email
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, email, phone, address")
      .eq("id", userOrg.organization_id)
      .single();

    // Generate signing URL
    const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/waivers/sign/${customerWaiver.id}`;

    // Use the WaiverNotificationService
    const { WaiverNotificationService } = await import(
      "@/app/lib/services/waiver-notification-service"
    );
    const waiverService = new WaiverNotificationService();

    const isReminder = validatedData.email_type === "reminder";

    const notificationData = {
      customerWaiverId: customerWaiver.id,
      customerId: customerWaiver.customer_id,
      customerName: customer.name,
      customerEmail: customer.email,
      waiverTitle: customerWaiver.waiver.title,
      waiverType: customerWaiver.waiver.waiver_type,
      organizationId: userOrg.organization_id,
      organizationName: organization?.name || "Fitness Center",
      signingUrl,
      expiresAt: customerWaiver.expires_at || undefined,
      customMessage: validatedData.custom_message || undefined,
      isReminder,
      reminderCount: isReminder
        ? (customerWaiver.reminder_count || 0) + 1
        : undefined,
    };

    const emailSent =
      await waiverService.sendWaiverAssignmentEmail(notificationData);

    if (!emailSent) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send waiver email",
        },
        { status: 500 },
      );
    }

    // Update customer waiver with sent timestamp
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (!customerWaiver.sent_at || isReminder) {
      updateData.sent_at = new Date().toISOString();
    }

    if (isReminder) {
      updateData.reminder_count = (customerWaiver.reminder_count || 0) + 1;
      updateData.last_reminder_sent = new Date().toISOString();
    }

    await supabase
      .from("customer_waivers")
      .update(updateData)
      .eq("id", customerWaiver.id);

    return NextResponse.json({
      success: true,
      message: "Waiver email sent successfully",
      data: {
        customer_waiver_id: customerWaiver.id,
        recipient: customer.email,
        signing_url: signingUrl,
        email_type: validatedData.email_type,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/waivers/send-email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
