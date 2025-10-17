import { createClient } from "@/app/lib/supabase/server";

export interface WaiverNotificationData {
  customerWaiverId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  waiverTitle: string;
  waiverType: string;
  organizationId: string;
  organizationName: string;
  organizationEmail?: string;
}

export interface WaiverAssignmentData extends WaiverNotificationData {
  signingUrl: string;
  expiresAt?: string;
  customMessage?: string;
  isReminder?: boolean;
  reminderCount?: number;
}

export interface WaiverSignedData extends WaiverNotificationData {
  signedAt: string;
  witnessName?: string;
  witnessEmail?: string;
  signatureMethod?: string;
}

export interface WaiverExpiringData extends WaiverNotificationData {
  expiresAt: string;
  daysUntilExpiry: number;
  renewalUrl?: string;
}

export class WaiverNotificationService {
  private supabase = createClient();

  /**
   * Send waiver assignment/reminder email to customer
   */
  async sendWaiverAssignmentEmail(
    data: WaiverAssignmentData,
  ): Promise<boolean> {
    try {
      // Create notification record
      const { error: notificationError } = await this.supabase
        .from("waiver_notifications")
        .insert({
          organization_id: data.organizationId,
          customer_waiver_id: data.customerWaiverId,
          notification_type: data.isReminder
            ? "waiver_reminder"
            : "waiver_assigned",
          channel: "email",
          recipient_email: data.customerEmail,
          status: "pending",
          subject: this.getAssignmentEmailSubject(data),
          message_content: this.buildAssignmentEmailContent(data),
        });

      if (notificationError) {
        console.error(
          "Error creating waiver notification record:",
          notificationError,
        );
        return false;
      }

      // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
      // For now, we'll just log the email content
      console.log("Would send waiver assignment email:", {
        to: data.customerEmail,
        subject: this.getAssignmentEmailSubject(data),
        content: this.buildAssignmentEmailContent(data),
      });

      return true;
    } catch (error) {
      console.error("Error sending waiver assignment email:", error);
      return false;
    }
  }

  /**
   * Send waiver signed confirmation email to customer and notification to organization
   */
  async sendWaiverSignedNotifications(
    data: WaiverSignedData,
  ): Promise<boolean> {
    try {
      // Send confirmation to customer
      const { error: customerNotificationError } = await this.supabase
        .from("waiver_notifications")
        .insert({
          organization_id: data.organizationId,
          customer_waiver_id: data.customerWaiverId,
          notification_type: "waiver_signed",
          channel: "email",
          recipient_email: data.customerEmail,
          status: "pending",
          subject: `Waiver Signed Successfully - ${data.waiverTitle}`,
          message_content: this.buildSignedConfirmationEmailContent(data),
        });

      // Send internal notification to organization
      if (data.organizationEmail) {
        const { error: orgNotificationError } = await this.supabase
          .from("waiver_notifications")
          .insert({
            organization_id: data.organizationId,
            customer_waiver_id: data.customerWaiverId,
            notification_type: "waiver_signed",
            channel: "email",
            recipient_email: data.organizationEmail,
            status: "pending",
            subject: `Waiver Signed by ${data.customerName} - ${data.waiverTitle}`,
            message_content: this.buildInternalSignedNotificationContent(data),
          });

        if (orgNotificationError) {
          console.error(
            "Error creating organization waiver notification:",
            orgNotificationError,
          );
        }
      }

      if (customerNotificationError) {
        console.error(
          "Error creating customer waiver notification:",
          customerNotificationError,
        );
        return false;
      }

      // TODO: Send actual emails
      console.log("Would send waiver signed notifications:", {
        customer: data.customerEmail,
        organization: data.organizationEmail,
        waiver: data.waiverTitle,
      });

      return true;
    } catch (error) {
      console.error("Error sending waiver signed notifications:", error);
      return false;
    }
  }

  /**
   * Send waiver expiring notifications
   */
  async sendWaiverExpiringNotifications(
    data: WaiverExpiringData,
  ): Promise<boolean> {
    try {
      // Send notification to customer
      const { error: notificationError } = await this.supabase
        .from("waiver_notifications")
        .insert({
          organization_id: data.organizationId,
          customer_waiver_id: data.customerWaiverId,
          notification_type: "waiver_expiring_soon",
          channel: "email",
          recipient_email: data.customerEmail,
          status: "pending",
          subject: this.getExpiringEmailSubject(data),
          message_content: this.buildExpiringEmailContent(data),
        });

      if (notificationError) {
        console.error(
          "Error creating waiver expiring notification:",
          notificationError,
        );
        return false;
      }

      // TODO: Send actual email
      console.log("Would send waiver expiring notification:", {
        to: data.customerEmail,
        subject: this.getExpiringEmailSubject(data),
        daysUntilExpiry: data.daysUntilExpiry,
      });

      return true;
    } catch (error) {
      console.error("Error sending waiver expiring notification:", error);
      return false;
    }
  }

  /**
   * Process expired waivers and send notifications
   */
  async processExpiredWaivers(): Promise<number> {
    try {
      // First, mark expired waivers
      const { data: expiredCount } = await this.supabase.rpc(
        "mark_expired_waivers",
      );

      // Get newly expired waivers for notifications
      const { data: expiredWaivers, error: fetchError } = await this.supabase
        .from("customer_waivers")
        .select(
          `
          id,
          customer_id,
          organization_id,
          status,
          expires_at,
          waiver:waivers!inner(title, waiver_type)
        `,
        )
        .eq("status", "expired")
        .gte(
          "expires_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ); // Expired in last 24 hours

      if (fetchError) {
        console.error("Error fetching expired waivers:", fetchError);
        return 0;
      }

      // Send notifications for expired waivers
      for (const waiver of expiredWaivers || []) {
        // Get customer and organization details
        const { data: customer } = await this.supabase
          .from("clients")
          .select("name, email")
          .eq("id", waiver.customer_id)
          .single();

        if (!customer) {
          // Try leads table
          const { data: lead } = await this.supabase
            .from("leads")
            .select("first_name, last_name, email")
            .eq("id", waiver.customer_id)
            .single();

          if (lead) {
            customer.name = `${lead.first_name} ${lead.last_name}`.trim();
            customer.email = lead.email;
          }
        }

        const { data: organization } = await this.supabase
          .from("organizations")
          .select("name, email")
          .eq("id", waiver.organization_id)
          .single();

        if (customer && organization) {
          await this.supabase.from("waiver_notifications").insert({
            organization_id: waiver.organization_id,
            customer_waiver_id: waiver.id,
            notification_type: "waiver_expired",
            channel: "email",
            recipient_email: customer.email,
            status: "pending",
            subject: `Waiver Expired - ${waiver.waiver.title}`,
            message_content: this.buildExpiredEmailContent({
              customerName: customer.name,
              waiverTitle: waiver.waiver.title,
              waiverType: waiver.waiver.waiver_type,
              organizationName: organization.name,
              expiredAt: waiver.expires_at,
            }),
          });
        }
      }

      return expiredCount || 0;
    } catch (error) {
      console.error("Error processing expired waivers:", error);
      return 0;
    }
  }

  /**
   * Process expiring waivers and send notifications
   */
  async processExpiringWaivers(daysThreshold: number = 7): Promise<number> {
    try {
      // Get waivers expiring within threshold
      const { data: expiringWaivers } = await this.supabase.rpc(
        "check_expiring_waivers",
      );

      if (!expiringWaivers || expiringWaivers.length === 0) {
        return 0;
      }

      let notificationsSent = 0;

      for (const waiver of expiringWaivers) {
        // Check if we've already sent a notification recently
        const { data: recentNotification } = await this.supabase
          .from("waiver_notifications")
          .select("id")
          .eq("customer_waiver_id", waiver.customer_waiver_id)
          .eq("notification_type", "waiver_expiring_soon")
          .gte(
            "created_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ) // Within last 24 hours
          .single();

        if (recentNotification) {
          continue; // Skip if already notified recently
        }

        const success = await this.sendWaiverExpiringNotifications({
          customerWaiverId: waiver.customer_waiver_id,
          customerId: waiver.customer_id,
          customerName: waiver.customer_name,
          customerEmail: waiver.customer_email,
          waiverTitle: waiver.waiver_title,
          waiverType: "liability", // Default, should be included in the function
          organizationId: waiver.organization_id,
          organizationName: "Organization", // Default, should be included in the function
          expiresAt: waiver.expires_at,
          daysUntilExpiry: waiver.days_until_expiry,
        });

        if (success) {
          notificationsSent++;
        }
      }

      return notificationsSent;
    } catch (error) {
      console.error("Error processing expiring waivers:", error);
      return 0;
    }
  }

  // Private helper methods for email content generation

  private getAssignmentEmailSubject(data: WaiverAssignmentData): string {
    const prefix = data.isReminder ? "Reminder: " : "";
    return `${prefix}${data.waiverTitle} - Action Required`;
  }

  private getExpiringEmailSubject(data: WaiverExpiringData): string {
    if (data.daysUntilExpiry <= 0) {
      return `Waiver Expired - ${data.waiverTitle}`;
    } else if (data.daysUntilExpiry <= 1) {
      return `Waiver Expires Tomorrow - ${data.waiverTitle}`;
    } else {
      return `Waiver Expires in ${data.daysUntilExpiry} Days - ${data.waiverTitle}`;
    }
  }

  private buildAssignmentEmailContent(data: WaiverAssignmentData): string {
    // This would typically use a proper email template engine
    // For now, returning a simple text version
    return `
Hello ${data.customerName},

${
  data.isReminder
    ? `This is ${data.reminderCount && data.reminderCount > 1 ? `reminder #${data.reminderCount}` : "a reminder"} that you have a waiver that requires your signature.`
    : "You have been assigned a waiver that requires your signature."
}

Waiver: ${data.waiverTitle}
Type: ${data.waiverType.replace(/_/g, " ").toUpperCase()}
${data.expiresAt ? `Expires: ${new Date(data.expiresAt).toLocaleDateString("en-GB")}` : ""}

${data.customMessage ? `\nAdditional Message:\n${data.customMessage}\n` : ""}

Please click the link below to review and sign the waiver:
${data.signingUrl}

If you have any questions, please contact us.

Thank you!
${data.organizationName}
    `.trim();
  }

  private buildSignedConfirmationEmailContent(data: WaiverSignedData): string {
    return `
Hello ${data.customerName},

Thank you for signing your waiver! We have successfully received and processed your digital signature.

Waiver: ${data.waiverTitle}
Type: ${data.waiverType.replace(/_/g, " ").toUpperCase()}
Signed on: ${new Date(data.signedAt).toLocaleString("en-GB")}
${data.witnessName ? `Witnessed by: ${data.witnessName}${data.witnessEmail ? ` (${data.witnessEmail})` : ""}` : ""}

Your signed waiver has been securely stored in our system and you can now participate in activities covered by this waiver.

If you have any questions, please don't hesitate to contact us.

Best regards,
${data.organizationName}
    `.trim();
  }

  private buildInternalSignedNotificationContent(
    data: WaiverSignedData,
  ): string {
    return `
Waiver Signed Notification

Customer: ${data.customerName} (${data.customerEmail})
Waiver: ${data.waiverTitle}
Type: ${data.waiverType.replace(/_/g, " ").toUpperCase()}
Signed at: ${new Date(data.signedAt).toLocaleString("en-GB")}
Signature Method: ${data.signatureMethod || "Digital"}
${data.witnessName ? `Witness: ${data.witnessName}${data.witnessEmail ? ` (${data.witnessEmail})` : ""}` : ""}

The waiver has been digitally signed and is now active in the system.
    `.trim();
  }

  private buildExpiringEmailContent(data: WaiverExpiringData): string {
    return `
Hello ${data.customerName},

${
  data.daysUntilExpiry <= 0
    ? "Your waiver has expired and needs to be renewed immediately."
    : data.daysUntilExpiry === 1
      ? "Your waiver expires tomorrow. Please renew it as soon as possible."
      : `Your waiver will expire in ${data.daysUntilExpiry} days. We recommend renewing it soon to avoid any interruption.`
}

Waiver: ${data.waiverTitle}
Type: ${data.waiverType.replace(/_/g, " ").toUpperCase()}
Expires: ${new Date(data.expiresAt).toLocaleDateString("en-GB")}

To continue participating in activities covered by this waiver, please contact us to renew it.

${data.renewalUrl ? `Renewal Link: ${data.renewalUrl}` : ""}

Thank you for your attention to this matter!
${data.organizationName}
    `.trim();
  }

  private buildExpiredEmailContent(data: {
    customerName: string;
    waiverTitle: string;
    waiverType: string;
    organizationName: string;
    expiredAt: string;
  }): string {
    return `
Hello ${data.customerName},

Your waiver has expired and needs to be renewed.

Waiver: ${data.waiverTitle}
Type: ${data.waiverType.replace(/_/g, " ").toUpperCase()}
Expired on: ${new Date(data.expiredAt).toLocaleDateString("en-GB")}

To continue participating in activities, please contact us to renew your waiver.

Thank you,
${data.organizationName}
    `.trim();
  }
}
