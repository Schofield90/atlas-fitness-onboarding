import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { 
  StaffProfile, 
  CreateStaffProfileRequest, 
  StaffListResponse,
  StaffQueryParams 
} from '@/app/lib/types/staff'

/**
 * GET /api/staff - List all staff members for organization
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const queryParams: StaffQueryParams = {
      status: (searchParams.get('status') as any) || undefined,
      department: searchParams.get('department') || undefined,
      position: searchParams.get('position') || undefined,
      employment_type: (searchParams.get('employment_type') as any) || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    }
    
    // Build query - filter by organization
    let query = supabase
      .from('staff_profiles')
      .select('*')
      .eq('organization_id', userWithOrg.organizationId)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (queryParams.status) {
      query = query.eq('status', queryParams.status)
    }
    
    if (queryParams.department) {
      query = query.eq('department', queryParams.department)
    }
    
    if (queryParams.position) {
      query = query.eq('position', queryParams.position)
    }
    
    if (queryParams.employment_type) {
      query = query.eq('employment_type', queryParams.employment_type)
    }
    
    if (queryParams.search) {
      query = query.or(`first_name.ilike.%${queryParams.search}%,last_name.ilike.%${queryParams.search}%,email.ilike.%${queryParams.search}%,employee_id.ilike.%${queryParams.search}%`)
    }
    
    // Apply pagination
    const from = ((queryParams.page || 1) - 1) * (queryParams.limit || 50)
    const to = from + (queryParams.limit || 50) - 1
    
    query = query.range(from, to)
    
    const { data: staff, error, count } = await query
    
    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch staff members' 
      }, { status: 500 })
    }
    
    const response: StaffListResponse = {
      success: true,
      data: staff || [],
      total: count || staff?.length || 0,
      page: queryParams.page,
      limit: queryParams.limit
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    // Use the error response helper
    return createErrorResponse(error)
  }
}

/**
 * POST /api/staff - Create new staff member
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body: CreateStaffProfileRequest = await request.json()
    
    // Validate required fields
    if (!body.first_name || !body.last_name || !body.email || !body.position || !body.hire_date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'first_name, last_name, email, position, and hire_date are required'
      }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }
    
    // Check if email already exists in organization
    const { data: existingStaff } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('email', body.email)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (existingStaff) {
      return NextResponse.json({
        success: false,
        error: 'Staff member with this email already exists'
      }, { status: 409 })
    }
    
    // Generate employee ID if not provided
    let employeeId = body.employee_id
    if (!employeeId) {
      // Generate unique employee ID
      const { data: existingIds } = await supabase
        .from('staff_profiles')
        .select('employee_id')
        .eq('organization_id', userWithOrg.organizationId)
        .like('employee_id', 'EMP%')
        .order('employee_id', { ascending: false })
        .limit(1)
      
      const lastId = existingIds?.[0]?.employee_id
      const nextNumber = lastId ? parseInt(lastId.replace('EMP', '')) + 1 : 1
      employeeId = `EMP${nextNumber.toString().padStart(4, '0')}`
    }
    
    // Build insert data
    const insertData = {
      organization_id: userWithOrg.organizationId,
      employee_id: employeeId,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone_number: body.phone_number || null,
      position: body.position,
      department: body.department || null,
      hire_date: body.hire_date,
      employment_type: body.employment_type || 'full_time',
      status: body.status || 'active',
      hourly_rate: body.hourly_rate || null,
      salary: body.salary || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      address_line_1: body.address_line_1 || null,
      address_line_2: body.address_line_2 || null,
      city: body.city || null,
      state: body.state || null,
      postal_code: body.postal_code || null,
      country: body.country || 'United Kingdom',
      notes: body.notes || null
    }
    
    // Create the staff profile
    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating staff profile:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create staff profile',
        message: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: staff,
      message: 'Staff profile created successfully'
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}