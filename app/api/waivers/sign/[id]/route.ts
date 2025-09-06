import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const signWaiverSchema = z.object({
  signature_data: z.string().min(1, "Signature is required"),
  signature_method: z
    .enum(["digital", "wet_signature", "uploaded"])
    .default("digital"),
  witness_name: z.string().optional(),
  witness_signature: z.string().optional(),
  witness_email: z.string().email().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// GET endpoint to fetch waiver details for signing (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Fetch customer waiver with public access (no auth required for signing page)
    const { data: customerWaiver, error } = await supabase
      .from("customer_waivers")
      .select(
        `
        id,
        customer_id,
        status,
        expires_at,
        requires_witness: waivers!inner(requires_witness),
        waiver: waivers!inner(
          id,
          title,
          content,
          waiver_type,
          requires_witness
        )
      `,
      )
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching waiver for signing:", error);
      return NextResponse.json(
        { error: "Failed to fetch waiver" },
        { status: 500 },
      );
    }

    // Check if waiver is still valid for signing
    if (customerWaiver.status !== "pending") {
      return NextResponse.json(
        {
          error: "This waiver is not available for signing",
          status: customerWaiver.status,
        },
        { status: 400 },
      );
    }

    if (
      customerWaiver.expires_at &&
      new Date(customerWaiver.expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error: "This waiver has expired",
        },
        { status: 400 },
      );
    }

    // Get customer details (try both tables)
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

    // Mark as opened if first time viewing
    if (!customerWaiver.opened_at) {
      await supabase
        .from("customer_waivers")
        .update({
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...customerWaiver,
        customer,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/waivers/sign/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST endpoint to submit signature (public access)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = signWaiverSchema.parse(body);

    // Get IP address from request
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Get user agent
    const userAgent = request.headers.get("user-agent") || "unknown";

    // First, verify the waiver exists and is signable
    const { data: customerWaiver, error: fetchError } = await supabase
      .from("customer_waivers")
      .select(
        `
        id,
        customer_id,
        status,
        expires_at,
        waiver: waivers!inner(requires_witness)
      `,
      )
      .eq("id", params.id)
      .single();

    if (fetchError || !customerWaiver) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    // Check if waiver is still valid for signing
    if (customerWaiver.status !== "pending") {
      return NextResponse.json(
        {
          error: "This waiver is not available for signing",
          status: customerWaiver.status,
        },
        { status: 400 },
      );
    }

    if (
      customerWaiver.expires_at &&
      new Date(customerWaiver.expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error: "This waiver has expired",
        },
        { status: 400 },
      );
    }

    // Check if witness is required
    if (customerWaiver.waiver.requires_witness) {
      if (!validatedData.witness_name || !validatedData.witness_signature) {
        return NextResponse.json(
          {
            error: "This waiver requires a witness signature",
          },
          { status: 400 },
        );
      }
    }

    // Update the waiver with signature
    const updateData = {
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_data: validatedData.signature_data,
      signature_method: validatedData.signature_method,
      ip_address: ipAddress,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };

    // Add witness data if provided
    if (validatedData.witness_name) {
      updateData.witness_name = validatedData.witness_name;
    }
    if (validatedData.witness_signature) {
      updateData.witness_signature = validatedData.witness_signature;
    }
    if (validatedData.witness_email) {
      updateData.witness_email = validatedData.witness_email;
    }

    const { data: signedWaiver, error: updateError } = await supabase
      .from("customer_waivers")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        waiver: waivers!inner(
          id,
          title,
          waiver_type
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("Error signing waiver:", updateError);
      return NextResponse.json(
        { error: "Failed to sign waiver" },
        { status: 500 },
      );
    }

    // Send confirmation notifications
    try {
      const { WaiverNotificationService } = await import(
        "@/app/lib/services/waiver-notification-service"
      );
      const waiverService = new WaiverNotificationService();

      // Get customer and organization details for notifications
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

      const { data: organization } = await supabase
        .from("organizations")
        .select("id, name, email")
        .eq("id", signedWaiver.organization_id)
        .single();

      if (customer && organization) {
        await waiverService.sendWaiverSignedNotifications({
          customerWaiverId: signedWaiver.id,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          waiverTitle: signedWaiver.waiver.title,
          waiverType: signedWaiver.waiver.waiver_type,
          organizationId: organization.id,
          organizationName: organization.name,
          organizationEmail: organization.email,
          signedAt: signedWaiver.signed_at,
          witnessName: validatedData.witness_name,
          witnessEmail: validatedData.witness_email,
          signatureMethod: validatedData.signature_method,
        });
      }
    } catch (notificationError) {
      console.error(
        "Error sending waiver signed notifications:",
        notificationError,
      );
      // Don't fail the signing process if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: signedWaiver,
      message: "Waiver signed successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/waivers/sign/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
