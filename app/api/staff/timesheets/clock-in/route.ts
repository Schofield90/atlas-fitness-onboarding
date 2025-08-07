import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { ClockInRequest } from '@/app/lib/types/staff'

/**
 * POST /api/staff/timesheets/clock-in - Clock in
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body: ClockInRequest = await request.json()
    
    // Validate required fields
    if (!body.staff_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'staff_id is required'
      }, { status: 400 })
    }
    
    // Verify staff member belongs to organization
    const { data: staffMember, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, first_name, last_name, hourly_rate, status')
      .eq('id', body.staff_id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (staffError || !staffMember) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found or unauthorized'
      }, { status: 404 })
    }
    
    // Check if staff member is active
    if (staffMember.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Cannot clock in: staff member status is ${staffMember.status}`
      }, { status: 403 })
    }
    
    // Check for existing active timesheet entry
    const { data: activeTimesheet } = await supabase
      .from('staff_timesheet_entries')
      .select('id, clock_in')
      .eq('staff_id', body.staff_id)
      .eq('organization_id', userWithOrg.organizationId)
      .is('clock_out', null)
      .single()
    
    if (activeTimesheet) {
      return NextResponse.json({
        success: false,
        error: 'Staff member is already clocked in',
        message: `Already clocked in since ${new Date(activeTimesheet.clock_in).toLocaleString()}`,
        active_timesheet_id: activeTimesheet.id
      }, { status: 409 })
    }
    
    // Verify shift if provided
    if (body.shift_id) {
      const { data: shift, error: shiftError } = await supabase
        .from('staff_shifts')
        .select('id, shift_date, start_time, end_time, status')
        .eq('id', body.shift_id)
        .eq('staff_id', body.staff_id)
        .eq('organization_id', userWithOrg.organizationId)
        .single()
      
      if (shiftError || !shift) {
        return NextResponse.json({
          success: false,
          error: 'Shift not found or does not belong to this staff member'
        }, { status: 404 })
      }
      
      if (shift.status !== 'scheduled') {
        return NextResponse.json({
          success: false,
          error: `Cannot clock in for shift with status: ${shift.status}`
        }, { status: 403 })
      }
    }
    
    // Get client IP address and location for tracking
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const clockInTime = new Date().toISOString()
    
    // Create timesheet entry
    const insertData = {
      organization_id: userWithOrg.organizationId,
      staff_id: body.staff_id,
      shift_id: body.shift_id || null,
      clock_in: clockInTime,
      break_duration: 0,
      hourly_rate: staffMember.hourly_rate,
      status: 'active',
      location_clock_in: body.location || null,
      ip_address_clock_in: ipAddress,
      notes: body.notes || null
    }
    
    const { data: timesheet, error } = await supabase
      .from('staff_timesheet_entries')
      .insert(insertData)
      .select(`
        *,
        staff_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          position,
          department
        )
      `)
      .single()
    
    if (error) {
      console.error('Error creating clock-in entry:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to clock in',
        message: error.message
      }, { status: 500 })
    }
    
    // Update shift status if applicable
    if (body.shift_id) {
      await supabase
        .from('staff_shifts')
        .update({ status: 'in_progress' })
        .eq('id', body.shift_id)
        .eq('organization_id', userWithOrg.organizationId)
    }
    
    return NextResponse.json({
      success: true,
      data: timesheet,
      message: `${staffMember.first_name} ${staffMember.last_name} clocked in successfully`,
      clock_in_time: clockInTime
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}