import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import twilio from "twilio";
import { Resend } from "resend";

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
      leadId,
      type,
      to,
      subject,
      body: messageBody,
      // Legacy fields for backward compatibility
      organization_id,
      customer_id,
      client_id,
      channel,
      direction = "outbound",
      content,
      recipient,
    } = body;

    // Use new fields if available, fall back to legacy
    const messageType = type || channel || "sms";
    const messageContent = messageBody || content;
    const recipientId = leadId || customer_id || client_id;
    const recipientAddress = to || recipient;

    if (!messageContent || !messageType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData.organization_id) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 403 },
      );
    }

    const orgId = organization_id || userData.organization_id;

    // Insert message into database
    const messageData = {
      organization_id: orgId,
      lead_id: recipientId || null,
      user_id: user.id,
      type: messageType,
      direction,
      status: "pending",
      subject: subject || null,
      body: messageContent,
      to_number:
        messageType === "sms" || messageType === "whatsapp"
          ? recipientAddress
          : null,
      to_email: messageType === "email" ? recipientAddress : null,
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
        { status: 500 },
      );
    }

    // Send the actual message based on type
    let sendSuccess = false;
    let sendError = null;

    try {
      switch (messageType) {
        case "sms":
        case "whatsapp":
          // Send via Twilio
          if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            const twilioClient = twilio(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN,
            );

            const fromNumber =
              messageType === "whatsapp"
                ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
                : process.env.TWILIO_PHONE_NUMBER;

            const toNumber =
              messageType === "whatsapp" &&
              !recipientAddress.startsWith("whatsapp:")
                ? `whatsapp:${recipientAddress}`
                : recipientAddress;

            const twilioMessage = await twilioClient.messages.create({
              body: messageContent,
              from: fromNumber,
              to: toNumber,
            });

            if (twilioMessage.sid) {
              sendSuccess = true;
              await supabase
                .from("messages")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  twilio_sid: twilioMessage.sid,
                })
                .eq("id", insertedMessage.id);
            }
          } else {
            // If Twilio not configured, just mark as sent
            sendSuccess = true;
            await supabase
              .from("messages")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", insertedMessage.id);
          }
          break;

        case "email":
          // Send via Resend
          if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);

            const emailResult = await resend.emails.send({
              from:
                process.env.RESEND_FROM_EMAIL ||
                "Atlas Fitness <noreply@atlas-fitness.com>",
              to: recipientAddress,
              subject: subject || "Message from Atlas Fitness",
              html: `<div>${messageContent.replace(/\n/g, "<br>")}</div>`,
            });

            if (emailResult.data?.id) {
              sendSuccess = true;
              await supabase
                .from("messages")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  resend_id: emailResult.data.id,
                })
                .eq("id", insertedMessage.id);
            }
          } else {
            // If Resend not configured, just mark as sent
            sendSuccess = true;
            await supabase
              .from("messages")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", insertedMessage.id);
          }
          break;

        default:
          // For other types, just mark as sent
          sendSuccess = true;
          await supabase
            .from("messages")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", insertedMessage.id);
          break;
      }
    } catch (error) {
      console.error(`Error sending ${messageType} message:`, error);
      sendError = error;

      // Update message status to failed
      await supabase
        .from("messages")
        .update({
          status: "failed",
          error_message: sendError?.toString() || "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedMessage.id);
    }

    return NextResponse.json({
      success: true,
      message: insertedMessage,
    });
  } catch (error) {
    console.error("Error in message send API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
