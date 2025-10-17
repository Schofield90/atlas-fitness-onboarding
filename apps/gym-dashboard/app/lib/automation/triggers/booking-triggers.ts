// Booking System Automation Triggers

import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { BaseTrigger } from './index'

// Trigger when a client misses a session
export class MissedSessionTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    // Create trigger subscription
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'missed_session',
      trigger_config: this.config,
      is_active: true,
    })
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'missed_session')
  }
  
  async test(data?: any): Promise<any> {
    return {
      customer: {
        id: 'test-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+447700900000'
      },
      session: {
        id: 'session-123',
        name: 'Morning HIIT Class',
        date: new Date().toISOString(),
        instructor: 'Jane Smith'
      },
      missedCount: 1,
      lastAttended: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
  
  // This would be called by a scheduled job or webhook
  static async checkMissedSessions(organizationId: string): Promise<void> {
    const adminSupabase = createAdminClient()
    
    // Get all bookings that are marked as no-show
    const { data: missedBookings } = await adminSupabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        class_session:class_session_id (
          id,
          start_datetime,
          end_datetime,
          program:program_id (
            name
          )
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'no_show')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    
    if (!missedBookings) return
    
    // Trigger workflows for each missed session
    for (const booking of missedBookings) {
      await MissedSessionTrigger.triggerWorkflows('missed_session', {
        organizationId,
        customer: booking.customer,
        session: booking.class_session,
        booking,
      })
    }
  }
  
  static async triggerWorkflows(triggerType: string, data: any): Promise<void> {
    const adminSupabase = createAdminClient()
    
    // Find active workflows with this trigger
    const { data: triggers } = await adminSupabase
      .from('workflow_triggers')
      .select('workflow_id')
      .eq('trigger_type', triggerType)
      .eq('is_active', true)
    
    if (!triggers) return
    
    // Execute each workflow
    for (const trigger of triggers) {
      await adminSupabase.from('workflow_executions').insert({
        workflow_id: trigger.workflow_id,
        trigger_data: data,
        status: 'pending',
      })
    }
  }
}

// Trigger when it's a customer's first session
export class FirstSessionTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'first_session',
      trigger_config: this.config,
      is_active: true,
    })
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'first_session')
  }
  
  async test(data?: any): Promise<any> {
    return {
      customer: {
        id: 'test-123',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+447700900001'
      },
      session: {
        id: 'session-456',
        name: 'Beginners Yoga',
        date: new Date().toISOString(),
        instructor: 'Sarah Johnson'
      },
      membershipType: 'trial'
    }
  }
}

// Trigger when a booking is confirmed
export class BookingConfirmedTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'booking_confirmed',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`workflow-${workflowId}-booking-confirmed`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `status=eq.confirmed`,
        },
        async (payload) => {
          await BookingConfirmedTrigger.triggerWorkflows('booking_confirmed', {
            booking: payload.new,
            organizationId: payload.new.organization_id,
          })
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'booking_confirmed')
  }
  
  async test(data?: any): Promise<any> {
    return {
      customer: {
        id: 'test-789',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '+447700900002'
      },
      session: {
        id: 'session-789',
        name: 'CrossFit Fundamentals',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        instructor: 'Tom Wilson'
      },
      bookingId: 'booking-123'
    }
  }
}

// Trigger when a class becomes full
export class ClassFullTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'class_full',
      trigger_config: this.config,
      is_active: true,
    })
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'class_full')
  }
  
  async test(data?: any): Promise<any> {
    return {
      session: {
        id: 'session-full-123',
        name: 'Saturday Spin Class',
        date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        instructor: 'Amy Brown',
        capacity: 20,
        booked: 20,
        waitlistCount: 3
      }
    }
  }
}

// Trigger when a booking is cancelled
export class BookingCancelledTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'booking_cancelled',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`workflow-${workflowId}-booking-cancelled`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `status=eq.cancelled`,
        },
        async (payload) => {
          if (payload.old.status !== 'cancelled' && payload.new.status === 'cancelled') {
            await BookingCancelledTrigger.triggerWorkflows('booking_cancelled', {
              booking: payload.new,
              organizationId: payload.new.organization_id,
              cancellationTime: new Date().toISOString(),
            })
          }
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'booking_cancelled')
  }
  
  async test(data?: any): Promise<any> {
    return {
      customer: {
        id: 'test-cancel-123',
        name: 'Lisa Anderson',
        email: 'lisa@example.com',
        phone: '+447700900003'
      },
      session: {
        id: 'session-cancel-123',
        name: 'Evening Pilates',
        date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        instructor: 'Rachel Green'
      },
      cancellationReason: 'Unable to attend',
      hoursBeforeClass: 48
    }
  }
}

// Trigger when someone joins waitlist
export class WaitlistJoinedTrigger extends BaseTrigger {
  async subscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('workflow_triggers').upsert({
      workflow_id: workflowId,
      trigger_type: 'waitlist_joined',
      trigger_config: this.config,
      is_active: true,
    })
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`workflow-${workflowId}-waitlist-joined`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waitlist',
        },
        async (payload) => {
          await WaitlistJoinedTrigger.triggerWorkflows('waitlist_joined', {
            waitlist: payload.new,
            organizationId: payload.new.organization_id,
          })
        }
      )
      .subscribe()
  }
  
  async unsubscribe(workflowId: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('workflow_triggers')
      .update({ is_active: false })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', 'waitlist_joined')
  }
  
  async test(data?: any): Promise<any> {
    return {
      customer: {
        id: 'test-waitlist-123',
        name: 'David Miller',
        email: 'david@example.com',
        phone: '+447700900004'
      },
      session: {
        id: 'session-waitlist-123',
        name: 'Power Yoga',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        instructor: 'Emma Watson'
      },
      position: 2,
      totalWaitlist: 5
    }
  }
}

// Export all booking triggers
export const bookingTriggers = {
  MissedSessionTrigger,
  FirstSessionTrigger,
  BookingConfirmedTrigger,
  ClassFullTrigger,
  BookingCancelledTrigger,
  WaitlistJoinedTrigger,
}