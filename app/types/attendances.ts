export interface AttendanceRecord {
  booking_id: string;
  organization_id: string;
  class_id: string;
  class_start_at: string;
  class_end_at: string;
  class_timezone: string;
  room_location?: string;
  class_type_name: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  instructor_ids: string[];
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_id?: string;
  membership_name?: string;
  membership_active: boolean;
  attendance_status: "registered" | "attended" | "late_cancelled" | "no_show";
  booking_method: "membership" | "drop_in" | "free" | "package";
  booking_source: "web" | "kiosk" | "mobile_app" | "staff" | "api";
  checked_in_at?: string;
  checked_out_at?: string;
  payment_amount_pennies: number;
  booking_created_at: string;
  booking_updated_at: string;
  attended: boolean;
  minutes_late?: number;
  was_late: boolean;
}

export interface AttendanceFilters {
  date_from?: string;
  date_to?: string;
  tz?: string;
  customer_id?: string;
  class_type_id?: string;
  venue_id?: string;
  instructor_id?: string;
  booking_method?: string[];
  booking_source?: string[];
  membership_id?: string;
  status?: string[];
  include_future?: boolean;
  group_by?: AttendanceGroupBy;
  page?: number;
  page_size?: number;
}

export type AttendanceGroupBy =
  | "each"
  | "customer"
  | "class_type"
  | "venue"
  | "instructor"
  | "day_of_week"
  | "start_time"
  | "booking_method"
  | "status"
  | "booking_source";

export interface AttendanceGroupedData {
  group_key: string;
  group_label: string;
  total_bookings: number;
  attended_count: number;
  no_show_count: number;
  cancelled_count: number;
  registered_count: number;
  attendance_rate: number;
}

export interface AttendancePagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface AttendanceResponse {
  success: boolean;
  data: {
    attendances?: AttendanceRecord[];
    grouped_data?: AttendanceGroupedData[];
    pagination?: AttendancePagination;
    total_count: number;
    group_by: AttendanceGroupBy;
  };
  error?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  attended?: number;
  registered?: number;
  no_show?: number;
  cancelled?: number;
}

export interface ChartDataResponse {
  success: boolean;
  data: {
    chart_data: ChartDataPoint[];
    chart_type: "daily" | "weekly" | "monthly" | "hourly" | "day_of_week";
    total_points: number;
    truncated?: boolean;
  };
  error?: string;
}

// Filter option types for UI components
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export interface ClassTypeOption {
  id: string;
  name: string;
  duration_min: number;
}

export interface VenueOption {
  id: string;
  name: string;
  capacity: number;
}

export interface InstructorOption {
  id: string;
  name: string;
  email?: string;
}

export interface MembershipOption {
  id: string;
  name: string;
  price_pennies: number;
}

// Date preset types
export interface DatePreset {
  label: string;
  getValue: () => { from: Date; to: Date };
}

// Export configuration
export interface ExportConfig {
  format: "csv";
  filename?: string;
  filters: AttendanceFilters;
}
