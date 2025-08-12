import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function createBookingAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.sessionId || !parameters.clientId) {
    throw new Error('Session ID and client ID are required');
  }
  
  try {
    const sessionId = interpolateValue(parameters.sessionId, context);
    const clientId = interpolateValue(parameters.clientId, context);
    const notes = parameters.notes ? interpolateValue(parameters.notes, context) : '';
    
    // Verify session exists and has capacity
    const { data: session } = await supabase
      .from('class_sessions')
      .select(`
        *,
        bookings(count)
      `)
      .eq('id', sessionId)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!session) throw new Error('Session not found');
    
    const currentBookings = session.bookings?.[0]?.count || 0;
    if (currentBookings >= session.max_capacity) {
      throw new Error('Session is full');
    }
    
    // Check if client already booked
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('client_id', clientId)
      .eq('status', 'confirmed')
      .single();
    
    if (existingBooking) {
      return {
        success: true,
        output: {
          action: 'already_booked',
          bookingId: existingBooking.id,
          sessionId,
          clientId
        }
      };
    }
    
    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        organization_id: context.organizationId,
        session_id: sessionId,
        client_id: clientId,
        status: 'confirmed',
        booking_source: 'workflow',
        notes,
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send confirmation notification
    if (parameters.sendConfirmation !== false) {
      await supabase
        .from('notifications')
        .insert({
          organization_id: context.organizationId,
          user_id: clientId,
          type: 'booking_confirmation',
          title: 'Booking Confirmed',
          message: `Your booking for ${session.name} on ${new Date(session.start_time).toLocaleDateString()} has been confirmed.`,
          data: {
            bookingId: booking.id,
            sessionId,
            sessionName: session.name,
            startTime: session.start_time
          }
        });
    }
    
    // Update session stats
    await supabase.rpc('update_session_stats', { 
      session_id: sessionId 
    });
    
    return {
      success: true,
      output: {
        action: 'booking_created',
        bookingId: booking.id,
        sessionId,
        clientId,
        sessionName: session.name,
        startTime: session.start_time,
        confirmationSent: parameters.sendConfirmation !== false
      }
    };
    
  } catch (error) {
    console.error('Create booking action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function cancelBookingAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.bookingId) {
    throw new Error('Booking ID is required');
  }
  
  try {
    const bookingId = interpolateValue(parameters.bookingId, context);
    const reason = parameters.reason ? interpolateValue(parameters.reason, context) : 'workflow_cancellation';
    const refund = parameters.refund !== false;
    
    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        class_sessions(
          id,
          name,
          start_time,
          instructor_id
        )
      `)
      .eq('id', bookingId)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!booking) throw new Error('Booking not found');
    
    if (booking.status === 'cancelled') {
      return {
        success: true,
        output: {
          action: 'already_cancelled',
          bookingId,
          cancelledAt: booking.cancelled_at
        }
      };
    }
    
    // Cancel booking
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancelled_by: 'workflow',
        metadata: {
          ...booking.metadata,
          cancelledByWorkflow: context.workflowId,
          executionId: context.executionId
        }
      })
      .eq('id', bookingId);
    
    if (error) throw error;
    
    // Process refund if applicable
    if (refund && booking.payment_id) {
      await supabase
        .from('refund_requests')
        .insert({
          organization_id: context.organizationId,
          booking_id: bookingId,
          payment_id: booking.payment_id,
          amount: booking.amount_paid,
          reason,
          status: 'pending',
          requested_by: 'workflow',
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId
          }
        });
    }
    
    // Send cancellation notification
    if (parameters.sendNotification !== false) {
      await supabase
        .from('notifications')
        .insert({
          organization_id: context.organizationId,
          user_id: booking.client_id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking for ${booking.class_sessions.name} on ${new Date(booking.class_sessions.start_time).toLocaleDateString()} has been cancelled.`,
          data: {
            bookingId,
            sessionId: booking.session_id,
            reason,
            refundInitiated: refund
          }
        });
    }
    
    // Update session stats
    await supabase.rpc('update_session_stats', { 
      session_id: booking.session_id 
    });
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'booking',
        entity_id: bookingId,
        action: 'booking_cancelled',
        details: {
          reason,
          refundInitiated: refund,
          cancelledBy: 'workflow',
          workflowId: context.workflowId
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        action: 'booking_cancelled',
        bookingId,
        sessionId: booking.session_id,
        sessionName: booking.class_sessions.name,
        cancelledAt: new Date().toISOString(),
        reason,
        refundInitiated: refund,
        notificationSent: parameters.sendNotification !== false
      }
    };
    
  } catch (error) {
    console.error('Cancel booking action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function checkInAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.bookingId) {
    throw new Error('Booking ID is required');
  }
  
  try {
    const bookingId = interpolateValue(parameters.bookingId, context);
    
    // Get booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!booking) throw new Error('Booking not found');
    
    if (booking.checked_in) {
      return {
        success: true,
        output: {
          action: 'already_checked_in',
          bookingId,
          checkedInAt: booking.checked_in_at
        }
      };
    }
    
    // Check in
    const { error } = await supabase
      .from('bookings')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: 'workflow',
        metadata: {
          ...booking.metadata,
          checkedInByWorkflow: context.workflowId,
          executionId: context.executionId
        }
      })
      .eq('id', bookingId);
    
    if (error) throw error;
    
    // Update attendance stats
    await supabase.rpc('update_attendance_stats', {
      client_id: booking.client_id,
      session_id: booking.session_id
    });
    
    return {
      success: true,
      output: {
        action: 'checked_in',
        bookingId,
        clientId: booking.client_id,
        sessionId: booking.session_id,
        checkedInAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Check-in action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}