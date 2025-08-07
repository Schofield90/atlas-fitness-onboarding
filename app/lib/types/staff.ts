// ===============================================
// STAFF MANAGEMENT TYPES
// ===============================================

export interface StaffProfile {
  id: string
  organization_id: string
  user_id?: string | null
  employee_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone_number?: string | null
  position: string
  department?: string | null
  hire_date: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
  status: 'active' | 'inactive' | 'terminated' | 'on_leave'
  hourly_rate?: number | null
  salary?: number | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  profile_picture_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateStaffProfileRequest {
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  position: string
  department?: string
  hire_date: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave'
  hourly_rate?: number
  salary?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  notes?: string
}

export interface UpdateStaffProfileRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  position?: string
  department?: string
  hire_date?: string
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern'
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave'
  hourly_rate?: number
  salary?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  notes?: string
}

export interface TimesheetEntry {
  id: string
  organization_id: string
  staff_id: string
  shift_id?: string | null
  clock_in: string
  clock_out?: string | null
  break_start?: string | null
  break_end?: string | null
  break_duration: number
  total_hours?: number | null
  hourly_rate?: number | null
  total_pay?: number | null
  status: 'active' | 'completed' | 'disputed'
  location_clock_in?: string | null
  location_clock_out?: string | null
  ip_address_clock_in?: string | null
  ip_address_clock_out?: string | null
  notes?: string | null
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
  updated_at: string
}

export interface ClockInRequest {
  staff_id: string
  shift_id?: string
  location?: string
  notes?: string
}

export interface ClockOutRequest {
  staff_id: string
  location?: string
  notes?: string
}

export interface UpdateTimesheetRequest {
  break_start?: string
  break_end?: string
  break_duration?: number
  hourly_rate?: number
  notes?: string
  approved_by?: string
}

export interface TimeOffRequest {
  id: string
  organization_id: string
  staff_id: string
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid'
  start_date: string
  end_date: string
  days_requested: number
  reason?: string | null
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  approved_by?: string | null
  approved_at?: string | null
  approval_notes?: string | null
  created_at: string
  updated_at: string
  staff_profile?: StaffProfile
}

export interface CreateTimeOffRequest {
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid'
  start_date: string
  end_date: string
  reason?: string
}

export interface UpdateTimeOffRequest {
  type?: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid'
  start_date?: string
  end_date?: string
  reason?: string
  status?: 'pending' | 'approved' | 'denied' | 'cancelled'
  approval_notes?: string
}

export interface StaffAPIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface StaffListResponse extends StaffAPIResponse<StaffProfile[]> {
  total?: number
  page?: number
  limit?: number
}

export interface TimesheetListResponse extends StaffAPIResponse<TimesheetEntry[]> {
  total?: number
  page?: number
  limit?: number
}

export interface TimeOffListResponse extends StaffAPIResponse<TimeOffRequest[]> {
  total?: number
  page?: number
  limit?: number
}

// Query parameter interfaces
export interface StaffQueryParams {
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave'
  department?: string
  position?: string
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern'
  search?: string
  page?: number
  limit?: number
}

export interface TimesheetQueryParams {
  staff_id?: string
  start_date?: string
  end_date?: string
  status?: 'active' | 'completed' | 'disputed'
  page?: number
  limit?: number
}

export interface TimeOffQueryParams {
  staff_id?: string
  type?: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'maternity' | 'paternity' | 'unpaid'
  status?: 'pending' | 'approved' | 'denied' | 'cancelled'
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}