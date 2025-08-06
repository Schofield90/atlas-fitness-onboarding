import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { getCurrentUserOrganization } from '@/app/lib/organization-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch recent activities
    const [bookingsResult, paymentsResult, messagesResult] = await Promise.all([
      // Recent bookings
      supabase
        .from('bookings')
        .select(`
          *,
          customer:leads(name),
          class_session:class_sessions(
            start_time,
            program:programs(name)
          )
        `)
        .eq('status', 'confirmed')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent payments
      supabase
        .from('payment_transactions')
        .select(`
          *,
          customer:leads(name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent messages (combine WhatsApp and SMS)
      Promise.all([
        supabase
          .from('whatsapp_logs')
          .select(`
            *,
            lead:leads(name)
          `)
          .eq('organization_id', organizationId)
          .eq('direction', 'outbound')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('sms_logs')
          .select(`
            *,
            lead:leads(name)
          `)
          .eq('organization_id', organizationId)
          .eq('direction', 'outbound')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5)
      ])
    ]);

    // Combine and format activities
    const activities = [];

    // Add bookings
    (bookingsResult.data || []).forEach(booking => {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        message: `New booking for ${booking.class_session?.program?.name || 'class'}`,
        customer: booking.customer?.name || 'Unknown',
        timestamp: booking.created_at,
        icon: 'calendar'
      });
    });

    // Add payments
    (paymentsResult.data || []).forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        message: `Payment received from ${payment.customer?.name || 'customer'}`,
        amount: payment.amount / 100,
        timestamp: payment.created_at,
        icon: 'dollar'
      });
    });

    // Add messages
    const [whatsappLogs, smsLogs] = messagesResult;
    [...(whatsappLogs.data || []), ...(smsLogs.data || [])].forEach(log => {
      const messageType = log.to_number?.includes('whatsapp') ? 'WhatsApp' : 'SMS';
      activities.push({
        id: `message-${log.id}`,
        type: 'message',
        message: `${messageType} sent to ${log.lead?.name || 'customer'}`,
        timestamp: log.created_at,
        icon: 'message'
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format timestamps
    const formattedActivities = activities.slice(0, 10).map(activity => {
      const date = new Date(activity.timestamp);
      const minutesAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      let timeAgo;
      if (minutesAgo < 1) {
        timeAgo = 'Just now';
      } else if (minutesAgo < 60) {
        timeAgo = `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;
      } else {
        const hoursAgo = Math.floor(minutesAgo / 60);
        timeAgo = `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
      }

      return {
        ...activity,
        timeAgo
      };
    });

    return NextResponse.json({ activities: formattedActivities });
  } catch (error: any) {
    console.error('Dashboard activity error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}