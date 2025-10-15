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

      // Get available slots from GHL calendar
      const availableSlots = await this.getAvailableSlots(
        apiKey,
        calendarId,
        parsedDate,
      );

      if (availableSlots.length === 0) {
        return {
          success: false,
          error: "No available slots found for the requested date",
          data: {
            message: "Unfortunately, there are no available slots on that date. Would you like to try a different date?",
          },
        };
      }

      // Book the appointment (first available slot if no specific time preference)
      const selectedSlot = parsedTime
        ? availableSlots.find((slot) => {
            const slotTime = new Date(slot.startTime).toTimeString().slice(0, 5);
            return slotTime === parsedTime;
          }) || availableSlots[0]
        : availableSlots[0];

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

    const response = await fetch(
      `https://rest.gohighlevel.com/v1/calendars/${calendarId}/free-slots?date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar slots: ${response.statusText}`);
    }

    const data = await response.json();
    return data.slots || [];
  }

  private async bookAppointment(
    apiKey: string,
    calendarId: string,
    contactId: string,
    slot: { startTime: string; endTime: string },
    appointmentType: string,
    notes?: string,
  ): Promise<any> {
    const response = await fetch(
      `https://rest.gohighlevel.com/v1/calendars/${calendarId}/appointments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: appointmentType.replace("_", " "),
          appointmentStatus: "confirmed",
          notes: notes || `Booked via AI agent`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to book appointment: ${response.statusText}`);
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
