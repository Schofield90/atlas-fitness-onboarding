import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, supabaseAdmin, parseSearchParams } from '@/lib/api/middleware'
import { z } from 'zod'

const staffQuerySchema = z.object({
  include_availability: z.string().optional().transform((val) => val === 'true'),
  role: z.string().optional(),
  is_available: z.string().optional().transform((val) => val === 'true')
})

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    const params = parseSearchParams(request, staffQuerySchema)
    const { include_availability, role, is_available } = params

    // Build the query
    let query = supabaseAdmin
      .from('organization_staff')
      .select(`
        id,
        user_id,
        email,
        phone_number,
        role,
        is_available,
        receives_calls,
        receives_sms,
        receives_whatsapp,
        receives_emails,
        routing_priority,
        created_at,
        updated_at,
        class_sessions:class_sessions(id, name, start_time, end_time, current_bookings, max_capacity)
      `)
      .eq('organization_id', user.organization_id)

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }
    if (is_available !== undefined) {
      query = query.eq('is_available', is_available)
    }

    // Order by routing priority and role
    query = query.order('routing_priority').order('role')

    const { data: staffMembers, error } = await query

    if (error) {
      throw new Error('Failed to fetch staff members')
    }

    // Transform the data to include additional information
    const staffWithDetails = await Promise.all((staffMembers || []).map(async (staff) => {
      const baseStaffData = {
        id: staff.id,
        user_id: staff.user_id,
        email: staff.email,
        phone_number: staff.phone_number,
        role: staff.role,
        is_available: staff.is_available,
        communication_preferences: {
          receives_calls: staff.receives_calls,
          receives_sms: staff.receives_sms,
          receives_whatsapp: staff.receives_whatsapp,
          receives_emails: staff.receives_emails
        },
        routing_priority: staff.routing_priority,
        created_at: staff.created_at,
        updated_at: staff.updated_at
      }

      // Get additional user details if user_id is a valid UUID
      let userDetails = null
      if (staff.user_id && staff.user_id.length === 36) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', staff.user_id)
          .single()
        
        if (user) {
          userDetails = user
        }
      }

      // Get upcoming appointments/sessions for this staff member
      let upcomingAppointments = []
      if (include_availability) {
        const { data: appointments } = await supabaseAdmin
          .from('class_sessions')
          .select(`
            id,
            name,
            description,
            start_time,
            end_time,
            current_bookings,
            max_capacity,
            room_location,
            session_status
          `)
          .eq('organization_id', user.organization_id)
          .eq('trainer_id', staff.user_id)
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Next 7 days
          .order('start_time')
          .limit(10)

        upcomingAppointments = appointments || []
      }

      return {
        ...baseStaffData,
        user_details: userDetails,
        upcoming_appointments: upcomingAppointments,
        appointment_count: upcomingAppointments.length,
        availability_status: staff.is_available 
          ? (upcomingAppointments.length > 0 ? 'busy' : 'available')
          : 'unavailable'
      }
    }))

    // Group staff by role for easier consumption
    const staffByRole = staffWithDetails.reduce((groups, staff) => {
      const role = staff.role || 'staff'
      if (!groups[role]) {
        groups[role] = []
      }
      groups[role].push(staff)
      return groups
    }, {} as Record<string, typeof staffWithDetails>)

    return NextResponse.json({
      staff: staffWithDetails,
      grouped_by_role: staffByRole,
      total: staffWithDetails.length,
      summary: {
        available_count: staffWithDetails.filter(s => s.is_available).length,
        by_role: Object.keys(staffByRole).map(role => ({
          role,
          count: staffByRole[role].length,
          available_count: staffByRole[role].filter(s => s.is_available).length
        }))
      }
    })
  })
}