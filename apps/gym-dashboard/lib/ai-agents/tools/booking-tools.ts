/**
 * Booking Tools - Sales Call and Appointment Booking
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from './types';
import { createAdminClient } from '@/app/lib/supabase/admin';

/**
 * Book a discovery call with a lead
 */
export class BookCallTool extends BaseTool {
  id = 'book_call';
  name = 'Book Discovery Call';
  description = 'Book a discovery call or sales appointment with a lead. Check availability and create booking.';
  category = 'booking' as const;

  parametersSchema = z.object({
    leadId: z.string().uuid().describe('Lead ID to book call for'),
    scheduledAt: z.string().describe('ISO timestamp for call (e.g., 2025-10-15T14:00:00Z)'),
    durationMinutes: z.number().default(30).describe('Call duration in minutes'),
    callType: z.enum(['discovery', 'closing', 'follow_up', 'consultation']).default('discovery').describe('Type of call'),
    staffMemberId: z.string().uuid().optional().describe('Specific staff member to assign (auto-assign if not provided)'),
    notes: z.string().optional().describe('Additional notes about the booking'),
  });

  requiresPermission = 'bookings:create';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // 1. Validate lead exists
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email, phone, status')
        .eq('id', validated.leadId)
        .eq('organization_id', context.organizationId)
        .single();

      if (leadError || !lead) {
        return { success: false, error: 'Lead not found' };
      }

      // 2. Check for scheduling conflicts (same time slot already booked)
      const requestedTime = new Date(validated.scheduledAt);
      const endTime = new Date(requestedTime.getTime() + validated.durationMinutes * 60000);

      const { data: conflicts } = await supabase
        .from('sales_call_bookings')
        .select('id, scheduled_at, duration_minutes')
        .eq('organization_id', context.organizationId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', requestedTime.toISOString())
        .lte('scheduled_at', endTime.toISOString());

      if (conflicts && conflicts.length > 0) {
        return {
          success: false,
          error: 'Time slot already booked. Please choose a different time.',
          data: {
            conflicts: conflicts.length,
            suggestedTimes: [
              new Date(endTime.getTime() + 30 * 60000).toISOString(), // 30 min after
              new Date(requestedTime.getTime() - validated.durationMinutes * 60000).toISOString(), // Before
            ]
          }
        };
      }

      // 3. Auto-assign staff member if not provided
      let assignedStaffId = validated.staffMemberId;
      if (!assignedStaffId) {
        const { data: staffMembers } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', context.organizationId)
          .in('role', ['owner', 'admin', 'staff'])
          .limit(1);

        assignedStaffId = staffMembers?.[0]?.user_id;
      }

      // 4. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('sales_call_bookings')
        .insert({
          lead_id: validated.leadId,
          organization_id: context.organizationId,
          scheduled_at: validated.scheduledAt,
          duration_minutes: validated.durationMinutes,
          call_type: validated.callType,
          status: 'scheduled',
          booked_by: 'ai_agent',
          staff_member_id: assignedStaffId,
          notes: validated.notes,
          metadata: {
            booked_by_agent_id: context.agentId,
            conversation_id: context.conversationId,
            task_id: context.taskId,
          }
        })
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          call_type,
          status
        `)
        .single();

      if (bookingError) {
        console.error('[BookCallTool] Booking creation error:', bookingError);
        throw bookingError;
      }

      // 5. Update lead status to 'call_scheduled'
      await supabase
        .from('leads')
        .update({
          status: 'call_scheduled',
          metadata: {
            call_booking_id: booking.id,
            call_scheduled_at: validated.scheduledAt,
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', validated.leadId);

      // 6. Create qualification history entry
      await supabase
        .from('lead_qualification_history')
        .insert({
          lead_id: validated.leadId,
          organization_id: context.organizationId,
          agent_id: context.agentId,
          conversation_id: context.conversationId,
          qualification_status: 'qualified',
          qualification_reason: 'Discovery call booked',
          call_booked: true,
          call_booking_id: booking.id,
          qualified_at: new Date().toISOString(),
          qualified_by: 'ai_agent',
        });

      // 7. Schedule reminder task (1 hour before call)
      const reminderTime = new Date(requestedTime.getTime() - 60 * 60000); // 1 hour before
      await supabase
        .from('ai_agent_tasks')
        .insert({
          agent_id: context.agentId,
          organization_id: context.organizationId,
          title: `Reminder: Call with ${lead.name}`,
          description: `Send reminder 1 hour before discovery call at ${validated.scheduledAt}`,
          task_type: 'scheduled',
          status: 'pending',
          priority: 9,
          next_run_at: reminderTime.toISOString(),
          context: {
            type: 'call_reminder',
            lead_id: validated.leadId,
            booking_id: booking.id,
            call_time: validated.scheduledAt,
          }
        });

      return {
        success: true,
        data: {
          bookingId: booking.id,
          leadId: validated.leadId,
          leadName: lead.name,
          scheduledAt: booking.scheduled_at,
          duration: booking.duration_minutes,
          callType: booking.call_type,
          status: booking.status,
          reminderScheduled: true,
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }
}

/**
 * Check available call times
 */
export class CheckAvailabilityTool extends BaseTool {
  id = 'check_call_availability';
  name = 'Check Call Availability';
  description = 'Check available time slots for booking a discovery call';
  category = 'booking' as const;

  parametersSchema = z.object({
    date: z.string().describe('Date to check availability (YYYY-MM-DD)'),
    preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional().describe('Preferred time of day'),
  });

  requiresPermission = 'bookings:view';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Define business hours
      const timeSlots = {
        morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
        afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
        evening: ['16:00', '16:30', '17:00', '17:30', '18:00'],
      };

      // Get existing bookings for the date
      const dateStart = `${validated.date}T00:00:00Z`;
      const dateEnd = `${validated.date}T23:59:59Z`;

      const { data: existingBookings } = await supabase
        .from('sales_call_bookings')
        .select('scheduled_at, duration_minutes')
        .eq('organization_id', context.organizationId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', dateStart)
        .lte('scheduled_at', dateEnd);

      const bookedTimes = new Set(
        (existingBookings || []).map(b => new Date(b.scheduled_at).toISOString().split('T')[1].substring(0, 5))
      );

      // Filter available slots
      const preference = validated.preferredTime;
      let availableSlots: string[] = [];

      if (preference) {
        availableSlots = timeSlots[preference]
          .filter(time => !bookedTimes.has(time))
          .map(time => `${validated.date}T${time}:00Z`);
      } else {
        // Return all available slots
        availableSlots = [
          ...timeSlots.morning,
          ...timeSlots.afternoon,
          ...timeSlots.evening
        ]
          .filter(time => !bookedTimes.has(time))
          .map(time => `${validated.date}T${time}:00Z`);
      }

      return {
        success: true,
        data: {
          date: validated.date,
          availableSlots,
          totalAvailable: availableSlots.length,
          preferredTime: preference,
          bookedCount: bookedTimes.size,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }
}

/**
 * Reschedule an existing call
 */
export class RescheduleCallTool extends BaseTool {
  id = 'reschedule_call';
  name = 'Reschedule Call';
  description = 'Reschedule an existing discovery call to a new time';
  category = 'booking' as const;

  parametersSchema = z.object({
    bookingId: z.string().uuid().describe('Booking ID to reschedule'),
    newScheduledAt: z.string().describe('New ISO timestamp for call'),
    reason: z.string().optional().describe('Reason for rescheduling'),
  });

  requiresPermission = 'bookings:update';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // 1. Verify booking exists and belongs to organization
      const { data: booking, error: fetchError } = await supabase
        .from('sales_call_bookings')
        .select('id, lead_id, scheduled_at, status')
        .eq('id', validated.bookingId)
        .eq('organization_id', context.organizationId)
        .single();

      if (fetchError || !booking) {
        return { success: false, error: 'Booking not found' };
      }

      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return { success: false, error: `Cannot reschedule ${booking.status} booking` };
      }

      // 2. Check new time slot availability
      const { data: conflicts } = await supabase
        .from('sales_call_bookings')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('scheduled_at', validated.newScheduledAt)
        .in('status', ['scheduled', 'confirmed'])
        .neq('id', validated.bookingId);

      if (conflicts && conflicts.length > 0) {
        return { success: false, error: 'New time slot is already booked' };
      }

      // 3. Update booking
      const { data: updated, error: updateError } = await supabase
        .from('sales_call_bookings')
        .update({
          scheduled_at: validated.newScheduledAt,
          status: 'rescheduled',
          notes: validated.reason
            ? `${booking.notes || ''}\n\nRescheduled: ${validated.reason}`.trim()
            : booking.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.bookingId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 4. Update reminder task
      const newTime = new Date(validated.newScheduledAt);
      const reminderTime = new Date(newTime.getTime() - 60 * 60000);

      await supabase
        .from('ai_agent_tasks')
        .update({
          next_run_at: reminderTime.toISOString(),
          status: 'pending',
        })
        .eq('organization_id', context.organizationId)
        .eq('context->booking_id', validated.bookingId)
        .eq('context->type', 'call_reminder');

      return {
        success: true,
        data: {
          bookingId: updated.id,
          oldTime: booking.scheduled_at,
          newTime: validated.newScheduledAt,
          status: updated.status,
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }
}

/**
 * Cancel a call booking
 */
export class CancelCallTool extends BaseTool {
  id = 'cancel_call';
  name = 'Cancel Call';
  description = 'Cancel a scheduled discovery call';
  category = 'booking' as const;

  parametersSchema = z.object({
    bookingId: z.string().uuid().describe('Booking ID to cancel'),
    reason: z.string().describe('Reason for cancellation'),
    reschedule: z.boolean().default(false).describe('Whether to offer to reschedule'),
  });

  requiresPermission = 'bookings:cancel';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Update booking status
      const { data: booking, error } = await supabase
        .from('sales_call_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: validated.reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.bookingId)
        .eq('organization_id', context.organizationId)
        .select('id, lead_id')
        .single();

      if (error) throw error;

      // Update lead status back to 'contacted'
      await supabase
        .from('leads')
        .update({
          status: 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.lead_id);

      // Cancel reminder task
      await supabase
        .from('ai_agent_tasks')
        .update({ status: 'cancelled' })
        .eq('organization_id', context.organizationId)
        .eq('context->booking_id', validated.bookingId)
        .eq('context->type', 'call_reminder');

      return {
        success: true,
        data: {
          bookingId: booking.id,
          cancelled: true,
          reason: validated.reason,
          shouldReschedule: validated.reschedule,
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }
}

/**
 * Mark call as completed with outcome
 */
export class CompleteCallTool extends BaseTool {
  id = 'complete_call';
  name = 'Complete Call';
  description = 'Mark a call as completed and record the outcome';
  category = 'booking' as const;

  parametersSchema = z.object({
    bookingId: z.string().uuid().describe('Booking ID to complete'),
    outcome: z.enum(['qualified', 'unqualified', 'booked_trial', 'signed_up', 'no_show']).describe('Call outcome'),
    notes: z.string().optional().describe('Call notes and next steps'),
  });

  requiresPermission = 'bookings:update';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      const { data: booking, error } = await supabase
        .from('sales_call_bookings')
        .update({
          status: validated.outcome === 'no_show' ? 'no_show' : 'completed',
          outcome: validated.outcome,
          outcome_notes: validated.notes,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.bookingId)
        .eq('organization_id', context.organizationId)
        .select('id, lead_id')
        .single();

      if (error) throw error;

      // Update lead based on outcome
      const statusMap: Record<string, string> = {
        qualified: 'qualified',
        unqualified: 'unqualified',
        booked_trial: 'trial_booked',
        signed_up: 'converted',
        no_show: 'no_show',
      };

      await supabase
        .from('leads')
        .update({
          status: statusMap[validated.outcome] || 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.lead_id);

      return {
        success: true,
        data: {
          bookingId: booking.id,
          outcome: validated.outcome,
          completed: true,
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }
}

// Export all booking tools
export const BOOKING_TOOLS = [
  new BookCallTool(),
  new CheckAvailabilityTool(),
  new RescheduleCallTool(),
  new CancelCallTool(),
  new CompleteCallTool(),
];
