import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CheckInRequest {
  token: string
  location_id?: string
  scanner_type: 'door' | 'desk' | 'mobile'
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const checkInData: CheckInRequest = await req.json()

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Process check-in using stored function
    const { data, error } = await supabaseAdmin.rpc('process_qr_check_in', {
      p_token: checkInData.token,
      p_location_id: checkInData.location_id
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data[0]

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get additional info for response
    const { data: checkIn } = await supabaseAdmin
      .from('member_check_ins')
      .select(`
        *,
        clients (
          first_name,
          last_name,
          email
        ),
        bookings (
          id,
          class_sessions (
            start_at,
            classes (
              name
            )
          )
        )
      `)
      .eq('id', result.check_in_id)
      .single()

    // Send success notification if booking check-in
    if (checkIn?.bookings) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: checkIn.user_id,
          organization_id: checkIn.organization_id,
          title: 'Check-in Successful! 💪',
          body: `You're all set for ${checkIn.bookings.class_sessions.classes.name}`,
          type: 'general'
        })
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        check_in: {
          id: result.check_in_id,
          member_name: checkIn ? `${checkIn.clients.first_name} ${checkIn.clients.last_name}` : 'Member',
          class_name: checkIn?.bookings?.class_sessions?.classes?.name,
          check_in_time: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})