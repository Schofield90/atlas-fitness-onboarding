import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { UpdateStaffProfileRequest, StaffProfile } from '@/app/lib/types/staff'

/**
 * GET /api/staff/[id] - Get specific staff member details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (error || !staff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: staff
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * PUT /api/staff/[id] - Update staff member
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body: UpdateStaffProfileRequest = await request.json()
    
    // First check if staff member exists and belongs to organization
    const { data: existingStaff, error: checkError } = await supabase
      .from('staff_profiles')
      .select('id, email')
      .eq('id', params.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (checkError || !existingStaff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found or unauthorized'
      }, { status: 404 })
    }
    
    // If email is being updated, check for conflicts
    if (body.email && body.email !== existingStaff.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid email format'
        }, { status: 400 })
      }
      
      // Check if new email already exists in organization
      const { data: emailConflict } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('email', body.email)
        .eq('organization_id', userWithOrg.organizationId)
        .neq('id', params.id)
        .single()
      
      if (emailConflict) {
        return NextResponse.json({
          success: false,
          error: 'Another staff member already uses this email'
        }, { status: 409 })
      }
    }
    
    // Remove fields that shouldn't be updated directly
    const { ...updateData } = body
    
    // Update staff member
    const { data: updatedStaff, error } = await supabase
      .from('staff_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', userWithOrg.organizationId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating staff profile:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update staff profile',
        message: error.message
      }, { status: 500 })
    }
    
    if (!updatedStaff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found or unauthorized'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: updatedStaff,
      message: 'Staff profile updated successfully'
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * DELETE /api/staff/[id] - Delete staff member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    
    // First check if staff member exists and belongs to organization
    const { data: existingStaff, error: checkError } = await supabase
      .from('staff_profiles')
      .select('id, first_name, last_name')
      .eq('id', params.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (checkError || !existingStaff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member not found or unauthorized'
      }, { status: 404 })
    }
    
    // Check if staff member has associated records (timesheet entries, time off requests, etc.)
    const { data: relatedRecords } = await supabase
      .from('staff_timesheet_entries')
      .select('id')
      .eq('staff_id', params.id)
      .limit(1)
    
    if (relatedRecords && relatedRecords.length > 0) {
      // Instead of hard delete, mark as terminated
      const { data: deactivatedStaff, error: deactivateError } = await supabase
        .from('staff_profiles')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .eq('organization_id', userWithOrg.organizationId)
        .select()
        .single()
      
      if (deactivateError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to deactivate staff member',
          message: deactivateError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        data: deactivatedStaff,
        message: 'Staff member marked as terminated due to associated records'
      })
    }
    
    // Safe to perform hard delete
    const { error: deleteError } = await supabase
      .from('staff_profiles')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', userWithOrg.organizationId)
    
    if (deleteError) {
      console.error('Error deleting staff profile:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete staff member',
        message: deleteError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Staff member ${existingStaff.first_name} ${existingStaff.last_name} deleted successfully`,
      deleted_id: params.id
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}