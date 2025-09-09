import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      customer_id,
      client_id,
      channel,
      direction = "outbound",
      subject,
      content,
      recipient,
    } = body;

    if (!content || !channel || !organization_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user belongs to the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userOrgError || userOrg.organization_id !== organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert message into database
    const messageData = {
      organization_id,
      customer_id: customer_id || null,
      client_id: client_id || customer_id || null,
      channel,
      direction,
      subject: subject || null,
      content,
      status: "pending",
      sender_id: user.id,
      sender_name: user.email,
      created_at: new Date().toISOString(),
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 }
      );
    }

    // Update message status to sent (for now, we'll implement actual sending later)
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", insertedMessage.id);

    if (updateError) {
      console.error("Error updating message status:", updateError);
    }

    // TODO: Implement actual message sending based on channel
    switch (channel) {
      case "sms":
        // Implement SMS sending via Twilio
        console.log("SMS sending not yet implemented");
        break;
      case "email":
        // Implement email sending via Resend
        console.log("Email sending not yet implemented");
        break;
      case "whatsapp":
        // Implement WhatsApp sending
        console.log("WhatsApp sending not yet implemented");
        break;
      case "in_app":
        // In-app messages are just database records
        console.log("In-app message saved to database");
        break;
    }

    return NextResponse.json({
      success: true,
      message: insertedMessage,
    });
  } catch (error) {
    console.error("Error in message send API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}