/**
 * GoHighLevel Integration Tools
 *
 * Tools for interacting with GoHighLevel CRM:
 * - Book calendar appointments
 * - Update contact information
 * - Add tags to contacts
 * - Send SMS/Email through GHL
 * - Update opportunity status
 */

import { z } from "zod";
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from "./types";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Book a discovery call in GoHighLevel calendar
 */
export class BookGHLAppointmentTool extends BaseTool {
  id = "book_ghl_appointment";
  name = "Book GoHighLevel Appointment";
  description =
    "Book a discovery call or appointment in the gym's GoHighLevel calendar. IMPORTANT: Use this tool whenever discussing appointment times - when a lead requests a time, confirms a time, changes a time, or agrees to a specific appointment slot. Examples: 'Can you book me in for 10am?', 'Let's do 2pm instead', 'Yes, tomorrow at 1pm works', 'I'm free at 3pm'.";
  category = "gohighlevel" as const;

  parametersSchema = z.object({
    appointmentType: z
      .enum(["discovery_call", "gym_tour", "consultation"])
      .describe("Type of appointment to book"),
    preferredDate: z
      .string()
      .optional()
      .describe("ISO date string (YYYY-MM-DD) - defaults to tomorrow if not specified"),
    preferredTime: z
      .string()
      .optional()
      .describe("Time in HH:MM format (24-hour) like 10:00 for 10am"),
    notes: z
      .string()
      .optional()
      .describe("Additional notes about the appointment"),
  });

  requiresPermission = "gohighlevel:book_appointment";

  async execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Get agent's GHL configuration
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("metadata, ghl_calendar_id, ghl_api_key")
        .eq("id", context.agentId)
        .single();

      const apiKey = agent?.ghl_api_key || agent?.metadata?.gohighlevel_api_key;
      const calendarId = agent?.ghl_calendar_id;

      if (!apiKey) {
        return {
          success: false,
          error: "GoHighLevel API key not configured for this agent",
        };
      }

      if (!calendarId) {
        return {
          success: false,
          error: "Calendar ID not configured. Please configure a calendar for this agent in Settings.",
        };
      }

      // Get contactId from conversation → lead → metadata
      if (!context.conversationId) {
        return {
          success: false,
          error: "No conversation context - cannot determine contact ID",
        };
      }

      const { data: conversation } = await supabase
        .from("ai_agent_conversations")
        .select("lead_id")
        .eq("id", context.conversationId)
        .single();

      if (!conversation?.lead_id) {
        return {
          success: false,
          error: "No lead associated with this conversation",
        };
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("metadata")
        .eq("id", conversation.lead_id)
        .single();

      const contactId = lead?.metadata?.ghl_contact_id;

      if (!contactId) {
        return {
          success: false,
          error: "No GoHighLevel contact ID found for this lead",
        };
      }

      // Parse natural language date to ISO format
      const parsedDate = this.parseDate(validated.preferredDate);

      // Parse natural language time to 24-hour format
      const parsedTime = this.parseTime(validated.preferredTime);

      console.log(`[GHL Tool] Fetching slots for date: ${parsedDate}, requested time: ${parsedTime}`);

      // Get available slots from GHL calendar (v2 API already filters booked times)
      const availableSlots = await this.getAvailableSlots(
        apiKey,
        calendarId,
        parsedDate,
      );

      console.log(`[GHL Tool] Retrieved ${availableSlots.length} available slots from GHL API`);
      if (availableSlots.length > 0) {
        const firstFive = availableSlots.slice(0, 5).map(s =>
          new Date(s.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
        );
        console.log(`[GHL Tool] First 5 slots: ${firstFive.join(', ')}`);
      }

      if (availableSlots.length === 0) {
        return {
          success: false,
          error: "No available slots found for the requested date",
          data: {
            message: "Unfortunately, there are no available slots on that date. Would you like to try a different date?",
          },
        };
      }

      // Find matching slot or return error if specific time not available
      let selectedSlot;

      if (parsedTime) {
        // User requested specific time - find exact match
        console.log(`[GHL Tool] Looking for exact match for time: ${parsedTime}`);
        selectedSlot = availableSlots.find((slot) => {
          const slotTime = new Date(slot.startTime).toTimeString().slice(0, 5);
          return slotTime === parsedTime;
        });

        if (!selectedSlot) {
          // Requested time not available - show ALL available alternatives grouped by time of day
          // Group slots: Morning (6am-12pm), Afternoon (12pm-5pm), Evening (5pm+)
          const morningSlots: any[] = [];
          const afternoonSlots: any[] = [];
          const eveningSlots: any[] = [];

          availableSlots.forEach(slot => {
            const hour = new Date(slot.startTime).getHours();
            if (hour < 12) {
              morningSlots.push(slot);
            } else if (hour < 17) {
              afternoonSlots.push(slot);
            } else {
              eveningSlots.push(slot);
            }
          });

          const formatSlots = (slots: any[]) => slots
            .map(slot => new Date(slot.startTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }))
            .join(', ');

          // Build comprehensive availability message
          let message = `Unfortunately ${parsedTime} isn't available on ${parsedDate}.\n\n`;

          if (morningSlots.length > 0) {
            message += `Morning slots: ${formatSlots(morningSlots)}\n`;
          }
          if (afternoonSlots.length > 0) {
            message += `Afternoon slots: ${formatSlots(afternoonSlots)}\n`;
          }
          if (eveningSlots.length > 0) {
            message += `Evening slots: ${formatSlots(eveningSlots)}\n`;
          }

          message += `\nWhich time works best for you?`;

          console.log(`[GHL Tool] ❌ Requested time ${parsedTime} not available. Offering ${availableSlots.length} alternatives`);
          console.log(`[GHL Tool] Morning: ${morningSlots.length}, Afternoon: ${afternoonSlots.length}, Evening: ${eveningSlots.length}`);

          return {
            success: false,
            error: `The requested time ${parsedTime} is not available`,
            data: {
              availableSlots: availableSlots, // Return ALL slots, not just first 5
              morningSlots,
              afternoonSlots,
              eveningSlots,
              message,
            },
          };
        }

        console.log(`[GHL Tool] ✅ Found matching slot at ${parsedTime}`);
      } else {
        // No specific time requested - use first available
        selectedSlot = availableSlots[0];
        const firstTime = new Date(selectedSlot.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        console.log(`[GHL Tool] No specific time requested, using first available slot: ${firstTime}`);
      }

      // Book appointment via GHL v1 API
      const appointment = await this.bookAppointment(
        apiKey,
        calendarId,
        contactId,
        selectedSlot,
        validated.appointmentType,
        validated.notes,
      );

      // Update lead in our system
      await supabase
        .from("leads")
        .update({
          status: "appointment_scheduled",
          metadata: {
            ghl_appointment_id: appointment.id,
            appointment_date: selectedSlot.startTime,
            appointment_type: validated.appointmentType,
          },
        })
        .eq("metadata->>ghl_contact_id", contactId);

      return {
        success: true,
        data: {
          appointmentId: appointment.id,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          appointmentType: validated.appointmentType,
          confirmationMessage: `Great! I've booked your ${validated.appointmentType.replace("_", " ")} for ${this.formatDateTime(selectedSlot.startTime)}. You'll receive a confirmation email shortly. Looking forward to seeing you!`,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  private async getAvailableSlots(
    apiKey: string,
    calendarId: string,
    preferredDate?: string,
  ): Promise<Array<{ startTime: string; endTime: string }>> {
    const date = preferredDate || new Date().toISOString().split("T")[0];

    // Convert date to Unix timestamps (milliseconds) for GHL v2 API
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const startDate = dateObj.getTime();
    const endDate = startDate + (24 * 60 * 60 * 1000) - 1;

    // Fetch available slots from GHL v2 API
    // NOTE: This endpoint automatically filters out already-booked appointments
    const response = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch calendar slots: ${response.statusText} - ${errorText}`);
    }

    const slotsData = await response.json();

    // Convert API response to slot objects
    const availableSlots: Array<{ startTime: string; endTime: string }> = [];
    for (const [dateKey, dateData] of Object.entries(slotsData)) {
      if (dateKey === "traceId") continue; // Skip metadata
      const slotTimes = (dateData as any).slots || [];
      for (let i = 0; i < slotTimes.length; i++) {
        const startTime = slotTimes[i];
        // Assume 15-minute slots if no end time specified
        const endTime = slotTimes[i + 1] || new Date(new Date(startTime).getTime() + 15 * 60 * 1000).toISOString();
        availableSlots.push({ startTime, endTime });
      }
    }

    return availableSlots;
  }

  private async bookAppointment(
    apiKey: string,
    calendarId: string,
    contactId: string,
    slot: { startTime: string; endTime: string },
    appointmentType: string,
    notes?: string,
  ): Promise<any> {
    // Get contact details for email/phone (required by v1 API)
    const supabase = createAdminClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("email, phone")
      .eq("metadata->>ghl_contact_id", contactId)
      .single();

    // Use GHL v1 API for booking appointments (location JWT compatible)
    const response = await fetch(
      `https://rest.gohighlevel.com/v1/appointments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          calendarId,
          selectedTimezone: "Europe/London",
          selectedSlot: slot.startTime,
          email: lead?.email,
          phone: lead?.phone,
          contact: {
            id: contactId,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to book appointment: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  private formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  /**
   * Parse natural language date to ISO format (YYYY-MM-DD)
   * Handles: "tomorrow", "today", "2025-10-16", null/undefined
   */
  private parseDate(dateInput?: string): string {
    if (!dateInput) {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    const input = dateInput.toLowerCase().trim();

    // Handle common natural language
    if (input === "today") {
      return new Date().toISOString().split("T")[0];
    }

    if (input === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    // Handle day names (Monday, Tuesday, etc.)
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayIndex = dayNames.findIndex(day => input.includes(day));

    if (dayIndex !== -1) {
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      let daysUntilTarget = dayIndex - currentDay;

      // If target day is today or in the past this week, assume next week
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      return targetDate.toISOString().split("T")[0];
    }

    // Handle "next Monday", "next week", etc.
    if (input.includes("next week")) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }

    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }

    // Default to tomorrow if can't parse
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  /**
   * Parse natural language time to 24-hour HH:MM format
   * Handles: "2pm", "14:00", "2:30pm", "10am", null/undefined
   */
  private parseTime(timeInput?: string): string | undefined {
    if (!timeInput) {
      return undefined;
    }

    const input = timeInput.toLowerCase().trim();

    // Already in 24-hour format (HH:MM)
    if (/^\d{1,2}:\d{2}$/.test(input)) {
      const [hours, minutes] = input.split(":");
      return `${hours.padStart(2, "0")}:${minutes}`;
    }

    // Parse 12-hour format with am/pm
    const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] || "00";
      const period = match[3]?.toLowerCase();

      if (period === "pm" && hours !== 12) {
        hours += 12;
      } else if (period === "am" && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }

    return undefined;
  }
}

/**
 * Update contact information in GoHighLevel
 */
export class UpdateGHLContactTool extends BaseTool {
  id = "update_ghl_contact";
  name = "Update GoHighLevel Contact";
  description =
    "Update contact information (email, phone, tags, custom fields) in GoHighLevel CRM";
  category = "gohighlevel" as const;

  parametersSchema = z.object({
    contactId: z.string().describe("GoHighLevel contact ID"),
    updates: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        tags: z.array(z.string()).optional(),
        customFields: z.record(z.any()).optional(),
      })
      .describe("Fields to update"),
  });

  requiresPermission = "gohighlevel:update_contact";

  async execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Get agent's GHL API key from metadata
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("metadata")
        .eq("id", context.agentId)
        .single();

      const apiKey = agent?.metadata?.gohighlevel_api_key;

      if (!apiKey) {
        return {
          success: false,
          error: "GoHighLevel API key not configured",
        };
      }

      // Update contact in GHL
      const response = await fetch(
        `https://rest.gohighlevel.com/v1/contacts/${validated.contactId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validated.updates),
        },
      );

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      const updatedContact = await response.json();

      return {
        success: true,
        data: updatedContact,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Add tags to a contact in GoHighLevel
 */
export class AddGHLTagsTool extends BaseTool {
  id = "add_ghl_tags";
  name = "Add Tags to GoHighLevel Contact";
  description =
    "Add tags to a contact in GoHighLevel for better organization and automation triggers";
  category = "gohighlevel" as const;

  parametersSchema = z.object({
    contactId: z.string().describe("GoHighLevel contact ID"),
    tags: z.array(z.string()).describe("Tags to add to the contact"),
  });

  requiresPermission = "gohighlevel:manage_tags";

  async execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Get agent's GHL API key from metadata
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("metadata")
        .eq("id", context.agentId)
        .single();

      const apiKey = agent?.metadata?.gohighlevel_api_key;

      if (!apiKey) {
        return {
          success: false,
          error: "GoHighLevel API key not configured",
        };
      }

      // Add tags via GHL API
      const response = await fetch(
        `https://rest.gohighlevel.com/v1/contacts/${validated.contactId}/tags`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags: validated.tags }),
        },
      );

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      return {
        success: true,
        data: {
          contactId: validated.contactId,
          tagsAdded: validated.tags,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Update opportunity stage in GoHighLevel pipeline
 */
export class UpdateGHLOpportunityTool extends BaseTool {
  id = "update_ghl_opportunity";
  name = "Update GoHighLevel Opportunity";
  description =
    "Update the stage/status of an opportunity in GoHighLevel sales pipeline";
  category = "gohighlevel" as const;

  parametersSchema = z.object({
    opportunityId: z.string().describe("GoHighLevel opportunity ID"),
    stage: z
      .enum([
        "new",
        "contacted",
        "qualified",
        "appointment_scheduled",
        "won",
        "lost",
      ])
      .describe("New stage for the opportunity"),
    notes: z.string().optional().describe("Notes about the stage change"),
  });

  requiresPermission = "gohighlevel:update_opportunity";

  async execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Get agent's GHL API key from metadata
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("metadata")
        .eq("id", context.agentId)
        .single();

      const apiKey = agent?.metadata?.gohighlevel_api_key;

      if (!apiKey) {
        return {
          success: false,
          error: "GoHighLevel API key not configured",
        };
      }

      const response = await fetch(
        `https://rest.gohighlevel.com/v1/opportunities/${validated.opportunityId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: validated.stage,
            notes: validated.notes,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      const opportunity = await response.json();

      return {
        success: true,
        data: opportunity,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

// Export all GoHighLevel tools
export const GOHIGHLEVEL_TOOLS = [
  new BookGHLAppointmentTool(),
  new UpdateGHLContactTool(),
  new AddGHLTagsTool(),
  new UpdateGHLOpportunityTool(),
];
