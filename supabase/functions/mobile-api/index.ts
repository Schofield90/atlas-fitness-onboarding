import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Mobile API Edge Function - Handles all mobile app endpoints
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/mobile-api', '')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route handlers
    switch (path) {
      // ============================================
      // ORGANIZATION & AUTH
      // ============================================
      case '/org/by-slug': {
        const slug = url.searchParams.get('slug')
        if (!slug) {
          return new Response(
            JSON.stringify({ error: 'Slug required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: org, error } = await supabaseClient
          .from('organizations')
          .select('id, name, slug, settings, theme_config')
          .eq('slug', slug)
          .single()

        if (error || !org) {
          return new Response(
            JSON.stringify({ error: 'Organization not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            org_id: org.id,
            name: org.name,
            theme: org.theme_config || {
              primaryColor: '#f97316',
              secondaryColor: '#1f2937',
              logoUrl: null
            },
            features: org.settings?.features || {}
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // USER PROFILE & PREFERENCES
      // ============================================
      case '/me': {
        const orgId = req.headers.get('X-Organization-Id')
        if (!orgId) {
          return new Response(
            JSON.stringify({ error: 'Organization ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get client profile
        const { data: client } = await supabaseClient
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single()

        // Get active memberships
        const { data: memberships } = await supabaseClient
          .from('memberships')
          .select(`
            *,
            membership_plans (*)
          `)
          .eq('client_id', client?.id)
          .eq('status', 'active')

        // Get class credits
        const { data: credits } = await supabaseClient
          .from('class_credits')
          .select('*')
          .eq('client_id', client?.id)
          .gte('expires_at', new Date().toISOString())

        // Get preferences
        const { data: preferences } = await supabaseClient
          .from('member_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single()

        return new Response(
          JSON.stringify({
            member_profile: client,
            memberships: memberships || [],
            credits: credits || [],
            preferences: preferences || {
              push_enabled: true,
              push_booking_reminders: true,
              reminder_hours_before: 2
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // CLASS SCHEDULE
      // ============================================
      case '/schedule': {
        const orgId = req.headers.get('X-Organization-Id')
        const from = url.searchParams.get('from') || new Date().toISOString()
        const to = url.searchParams.get('to') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const category = url.searchParams.get('category')
        const instructorId = url.searchParams.get('instructor_id')
        const locationId = url.searchParams.get('location_id')

        let query = supabaseClient
          .from('mobile_class_schedule')
          .select('*')
          .eq('organization_id', orgId)
          .gte('start_at', from)
          .lte('start_at', to)
          .order('start_at')

        if (category) query = query.eq('category', category)
        if (instructorId) query = query.eq('instructor_id', instructorId)
        if (locationId) query = query.eq('location_id', locationId)

        const { data: sessions, error } = await query

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(sessions || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // BOOKINGS
      // ============================================
      case '/bookings': {
        if (req.method === 'POST') {
          const { session_id } = await req.json()
          const orgId = req.headers.get('X-Organization-Id')

          // Get client
          const { data: client } = await supabaseClient
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', orgId)
            .single()

          if (!client) {
            return new Response(
              JSON.stringify({ error: 'Client profile not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Create booking
          const { data: booking, error } = await supabaseClient
            .from('bookings')
            .insert({
              session_id,
              client_id: client.id,
              user_id: user.id,
              organization_id: orgId,
              status: 'booked',
              source: 'mobile_app'
            })
            .select()
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ booking_id: booking.id, status: 'booked' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case '/bookings/my': {
        const orgId = req.headers.get('X-Organization-Id')
        const status = url.searchParams.get('status') || 'upcoming'

        const { data: bookings } = await supabaseClient
          .from('member_upcoming_classes')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .order('start_at')

        return new Response(
          JSON.stringify(bookings || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // QR TOKEN GENERATION
      // ============================================
      case '/qr-token': {
        const orgId = req.headers.get('X-Organization-Id')
        const bookingId = url.searchParams.get('booking_id')

        const { data, error } = await supabaseClient.rpc('generate_qr_token', {
          p_user_id: user.id,
          p_organization_id: orgId,
          p_booking_id: bookingId,
          p_token_type: bookingId ? 'booking' : 'check_in'
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data[0]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // MEMBER STATS
      // ============================================
      case '/stats': {
        const orgId = req.headers.get('X-Organization-Id')

        const { data, error } = await supabaseClient.rpc('get_member_stats', {
          p_user_id: user.id,
          p_organization_id: orgId
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data[0] || {
            total_classes_attended: 0,
            current_streak: 0,
            this_week_classes: 0,
            this_month_classes: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ============================================
      // DEVICE REGISTRATION (for push notifications)
      // ============================================
      case '/device': {
        if (req.method === 'POST') {
          const { device_token, platform, device_name, app_version } = await req.json()
          const orgId = req.headers.get('X-Organization-Id')

          const { error } = await supabaseClient
            .from('member_devices')
            .upsert({
              user_id: user.id,
              organization_id: orgId,
              device_token,
              platform,
              device_name,
              app_version,
              last_used_at: new Date().toISOString()
            }, {
              onConflict: 'device_token'
            })

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      // ============================================
      // PREFERENCES
      // ============================================
      case '/settings': {
        const orgId = req.headers.get('X-Organization-Id')

        if (req.method === 'GET') {
          const { data: prefs } = await supabaseClient
            .from('member_preferences')
            .select('*')
            .eq('user_id', user.id)
            .eq('organization_id', orgId)
            .single()

          return new Response(
            JSON.stringify(prefs || {}),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (req.method === 'POST') {
          const updates = await req.json()

          const { error } = await supabaseClient
            .from('member_preferences')
            .upsert({
              user_id: user.id,
              organization_id: orgId,
              ...updates
            }, {
              onConflict: 'user_id,organization_id'
            })

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Default response for unhandled methods
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})