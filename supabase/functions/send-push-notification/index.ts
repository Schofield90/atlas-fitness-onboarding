import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushNotification {
  user_id: string
  organization_id: string
  title: string
  body: string
  data?: Record<string, any>
  type: 'booking_reminder' | 'class_change' | 'waitlist_promotion' | 'membership_update' | 'general'
}

serve(async (req: Request) => {
  try {
    const notification: PushNotification = await req.json()

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's devices
    const { data: devices } = await supabaseAdmin
      .from('member_devices')
      .select('*')
      .eq('user_id', notification.user_id)
      .eq('organization_id', notification.organization_id)
      .eq('push_enabled', true)

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No devices to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user preferences
    const { data: preferences } = await supabaseAdmin
      .from('member_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .eq('organization_id', notification.organization_id)
      .single()

    // Check if notification type is enabled
    if (preferences) {
      switch (notification.type) {
        case 'booking_reminder':
          if (!preferences.push_booking_reminders) return new Response(JSON.stringify({ success: true, message: 'Reminders disabled' }))
          break
        case 'class_change':
          if (!preferences.push_class_changes) return new Response(JSON.stringify({ success: true, message: 'Class changes disabled' }))
          break
        case 'waitlist_promotion':
          if (!preferences.push_waitlist_updates) return new Response(JSON.stringify({ success: true, message: 'Waitlist updates disabled' }))
          break
        case 'membership_update':
          if (!preferences.push_membership_updates) return new Response(JSON.stringify({ success: true, message: 'Membership updates disabled' }))
          break
      }
    }

    // Send to Expo Push API
    const messages = devices.map(device => ({
      to: device.device_token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high'
    }))

    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    })

    const result = await expoPushResponse.json()

    // Log notification
    await supabaseAdmin
      .from('notification_logs')
      .insert({
        user_id: notification.user_id,
        organization_id: notification.organization_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        devices_sent: devices.length,
        status: 'sent'
      })

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})