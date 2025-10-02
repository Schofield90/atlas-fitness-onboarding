import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";
import twilio from "twilio";
import { Resend } from "resend";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[Messages API] Starting message send request");
  try {
    const supabase = await createServerClient();
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

    // Get user's organization and details
    // Try users table first
    let userData = null;
    console.log("[Messages API] Looking up user:", user.id, user.email);

    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("organization_id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[Messages API] Users table result:", {
      userRecord,
      userError,
    });

    if (userRecord?.organization_id) {
      userData = userRecord;
      console.log("[Messages API] Found user in users table");
    } else {
      // Fallback to organization_staff table
      console.log(
        "[Messages API] User not in users table, checking organization_staff",
      );
      const { data: staffRecord, error: staffError } = await supabase
        .from("organization_staff")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[Messages API] Staff table result:", {
        staffRecord,
        staffError,
      });

      if (staffRecord?.organization_id) {
        userData = {
          organization_id: staffRecord.organization_id,
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Staff",
          email: user.email || "",
        };
        console.log("[Messages API] Found user in organization_staff table");
      }
    }

    if (!userData?.organization_id) {
      console.error("[Messages API] No organization found for user:", user.id);
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 403 },
      );
    }

    console.log(
      "[Messages API] Using organization_id:",
      userData.organization_id,
    );

    const orgId = organization_id || userData.organization_id;

    // Determine if this is an in-app message
    const isInAppMessage =
      messageType === "in_app" ||
      messageType === "In-App" ||
      channel === "in_app" ||
      channel === "In-App" ||
      (!recipientAddress && !to && !recipient);

    // Log message details for debugging
    console.log("[Messages API] Preparing to send message:", {
      type: messageType,
      recipientId,
      recipientAddress,
      hasContent: !!messageContent,
      contentLength: messageContent?.length,
      organization: orgId,
      isInApp: isInAppMessage,
    });

    // Insert message into database
    // For in-app messages, set status to 'delivered' immediately
    const messageData = {
      organization_id: orgId,
      lead_id: recipientId || null,
      client_id: recipientId || client_id || null, // Ensure client_id is set
      user_id: user.id,
      type: messageType,
      channel: isInAppMessage ? "in_app" : channel || messageType,
      direction,
      status: isInAppMessage ? "delivered" : "pending",
      subject: subject || null,
      body: messageContent,
      content: messageContent, // Add content field for client compatibility
      sender_type: "gym",
      sender_name: userData.full_name || userData.email || "Gym",
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
      console.error("[Messages API] Error inserting message:", insertError);
      return NextResponse.json(
        { error: "Failed to save message", details: insertError.message },
        { status: 500 },
      );
    }

    console.log("[Messages API] Message inserted with ID:", insertedMessage.id);

    // For in-app messages, we're done - they're already delivered
    if (isInAppMessage) {
      console.log("[Messages API] In-app message delivered immediately");
      return NextResponse.json({
        success: true,
        message: insertedMessage,
      });
    }

    // Send the actual message based on type (only for non-in-app messages)
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
                ? `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER}`
                : process.env.TWILIO_SMS_FROM ||
                  process.env.TWILIO_PHONE_NUMBER;

            const toNumber =
              messageType === "whatsapp" &&
              !recipientAddress.startsWith("whatsapp:")
                ? `whatsapp:${recipientAddress}`
                : recipientAddress;

            if (!fromNumber) {
              console.error(
                "[Messages API] Twilio from number not configured for",
                messageType,
                {
                  TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM,
                  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
                  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
                  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
                },
              );
              throw new Error(
                `Twilio from number not configured for ${messageType}`,
              );
            }

            console.log("[Messages API] Sending Twilio message:", {
              messageType,
              from: fromNumber,
              to: toNumber,
              bodyLength: messageContent.length,
              messageId: insertedMessage.id,
            });

            const twilioMessage = await twilioClient.messages.create({
              body: messageContent,
              from: fromNumber,
              to: toNumber,
            });

            if (twilioMessage.sid) {
              sendSuccess = true;
              console.log("[Messages API] Twilio message sent successfully:", {
                messageId: insertedMessage.id,
                twilioSid: twilioMessage.sid,
                status: twilioMessage.status,
              });

              const { error: updateError } = await supabase
                .from("messages")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  twilio_sid: twilioMessage.sid,
                })
                .eq("id", insertedMessage.id);

              if (updateError) {
                console.error(
                  "[Messages API] Error updating message status:",
                  updateError,
                );
              } else {
                console.log("[Messages API] Message status updated to 'sent'");
              }
            }
          } else {
            // If Twilio not configured, just mark as sent
            console.log(
              "[Messages API] Twilio not configured, marking as sent",
            );
            sendSuccess = true;
            const { error: updateError } = await supabase
              .from("messages")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", insertedMessage.id);

            if (updateError) {
              console.error(
                "[Messages API] Error updating message status:",
                updateError,
              );
            }
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
      console.error(`[Messages API] Error sending ${messageType} message:`, {
        error,
        messageId: insertedMessage.id,
        messageType,
        recipientAddress,
      });
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

    // Fetch the updated message to return with correct status
    const { data: updatedMessage } = await supabase
      .from("messages")
      .select()
      .eq("id", insertedMessage.id)
      .single();

    console.log("[Messages API] Final message status:", {
      messageId: updatedMessage?.id || insertedMessage.id,
      status: updatedMessage?.status || insertedMessage.status,
      success: sendSuccess,
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage || insertedMessage,
    });
  } catch (error) {
    console.error("[Messages API] Fatal error in message send API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
