-- =============================================
-- ATLAS FITNESS STAFF MANAGEMENT MODULE
-- Complete Database Migration
-- Date: 2025-08-08
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================
-- 1. STAFF MANAGEMENT TABLES
-- =============================================

-- Standard Operating Procedures (SOPs) with vector support
CREATE TABLE IF NOT EXISTS staff_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  content_embedding vector(1536), -- OpenAI embedding size
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  effective_date DATE,
  review_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff profiles (comprehensive staff information)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  job_position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  hire_date DATE NOT NULL,
  employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave')),
  hourly_rate DECIMAL(10,2),
  salary DECIMAL(12,2),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  profile_picture_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS staff_time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  approved_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff shifts/schedules
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 0, -- minutes
  location VARCHAR(255),
  shift_position VARCHAR(100),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timesheet entries (clock in/out)
CREATE TABLE IF NOT EXISTS staff_timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES staff_shifts(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0, -- minutes
  total_hours DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  total_pay DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disputed')),
  location_clock_in VARCHAR(255),
  location_clock_out VARCHAR(255),
  ip_address_clock_in INET,
  ip_address_clock_out INET,
  notes TEXT,
  approved_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll batches
CREATE TABLE IF NOT EXISTS staff_payroll_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_name VARCHAR(255) NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
  total_amount DECIMAL(12,2),
  total_hours DECIMAL(8,2),
  employee_count INTEGER,
  processed_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual payroll entries
CREATE TABLE IF NOT EXISTS staff_payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_batch_id UUID NOT NULL REFERENCES staff_payroll_batches(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  regular_hours DECIMAL(8,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  holiday_hours DECIMAL(8,2) DEFAULT 0,
  sick_hours DECIMAL(8,2) DEFAULT 0,
  vacation_hours DECIMAL(8,2) DEFAULT 0,
  regular_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  gross_pay DECIMAL(10,2),
  tax_deductions DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  bonuses DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2),
  deduction_details JSONB DEFAULT '{}',
  bonus_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff documents
CREATE TABLE IF NOT EXISTS staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('contract', 'id_copy', 'tax_form', 'certification', 'training_record', 'disciplinary', 'performance_review', 'other')),
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_confidential BOOLEAN DEFAULT false,
  expiry_date DATE,
  uploaded_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance reviews
CREATE TABLE IF NOT EXISTS staff_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_type VARCHAR(30) DEFAULT 'annual' CHECK (review_type IN ('probationary', 'quarterly', 'annual', 'special')),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  goals_achievement INTEGER CHECK (goals_achievement >= 1 AND goals_achievement <= 5),
  job_knowledge INTEGER CHECK (job_knowledge >= 1 AND job_knowledge <= 5),
  quality_of_work INTEGER CHECK (quality_of_work >= 1 AND quality_of_work <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  teamwork INTEGER CHECK (teamwork >= 1 AND teamwork <= 5),
  punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
  initiative INTEGER CHECK (initiative >= 1 AND initiative <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_next_period TEXT,
  reviewer_comments TEXT,
  employee_comments TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'acknowledged')),
  employee_acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. PERFORMANCE INDEXES
-- =============================================

-- SOPs indexes
CREATE INDEX IF NOT EXISTS idx_staff_sops_organization_id ON staff_sops(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_sops_category ON staff_sops(category);
CREATE INDEX IF NOT EXISTS idx_staff_sops_status ON staff_sops(status);
CREATE INDEX IF NOT EXISTS idx_staff_sops_created_at ON staff_sops(created_at);

-- Staff profiles indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_organization_id ON staff_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_email ON staff_profiles(email);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_position ON staff_profiles(job_position);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_department ON staff_profiles(department);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON staff_profiles(status);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_hire_date ON staff_profiles(hire_date);

-- Time off requests indexes
CREATE INDEX IF NOT EXISTS idx_staff_time_off_requests_organization_id ON staff_time_off_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_requests_staff_id ON staff_time_off_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_requests_dates ON staff_time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_requests_status ON staff_time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_requests_type ON staff_time_off_requests(type);

-- Shifts indexes
CREATE INDEX IF NOT EXISTS idx_staff_shifts_organization_id ON staff_shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_id ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status ON staff_shifts(status);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_location ON staff_shifts(location);

-- Timesheet entries indexes
CREATE INDEX IF NOT EXISTS idx_staff_timesheet_entries_organization_id ON staff_timesheet_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_timesheet_entries_staff_id ON staff_timesheet_entries(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_timesheet_entries_shift_id ON staff_timesheet_entries(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_timesheet_entries_clock_in ON staff_timesheet_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_staff_timesheet_entries_status ON staff_timesheet_entries(status);

-- Payroll batches indexes
CREATE INDEX IF NOT EXISTS idx_staff_payroll_batches_organization_id ON staff_payroll_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_batches_pay_period ON staff_payroll_batches(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_batches_status ON staff_payroll_batches(status);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_batches_pay_date ON staff_payroll_batches(pay_date);

-- Payroll entries indexes
CREATE INDEX IF NOT EXISTS idx_staff_payroll_entries_organization_id ON staff_payroll_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_entries_batch_id ON staff_payroll_entries(payroll_batch_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_entries_staff_id ON staff_payroll_entries(staff_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_staff_documents_organization_id ON staff_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_documents_confidential ON staff_documents(is_confidential);

-- Performance reviews indexes
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_organization_id ON staff_performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_staff_id ON staff_performance_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_reviewer_id ON staff_performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_period ON staff_performance_reviews(review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_type ON staff_performance_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_staff_performance_reviews_status ON staff_performance_reviews(status);

-- =============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE staff_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;

-- SOPs policies
CREATE POLICY "Users can view SOPs from their organization" ON staff_sops
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create SOPs for their organization" ON staff_sops
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update SOPs in their organization" ON staff_sops
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete SOPs in their organization" ON staff_sops
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Staff profiles policies
CREATE POLICY "Users can view staff profiles from their organization" ON staff_profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create staff profiles for their organization" ON staff_profiles
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update staff profiles in their organization" ON staff_profiles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete staff profiles in their organization" ON staff_profiles
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Time off requests policies
CREATE POLICY "Users can view time off requests from their organization" ON staff_time_off_requests
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create time off requests for their organization" ON staff_time_off_requests
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update time off requests in their organization" ON staff_time_off_requests
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete time off requests in their organization" ON staff_time_off_requests
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Shifts policies
CREATE POLICY "Users can view shifts from their organization" ON staff_shifts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create shifts for their organization" ON staff_shifts
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update shifts in their organization" ON staff_shifts
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete shifts in their organization" ON staff_shifts
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Timesheet entries policies
CREATE POLICY "Users can view timesheet entries from their organization" ON staff_timesheet_entries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create timesheet entries for their organization" ON staff_timesheet_entries
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update timesheet entries in their organization" ON staff_timesheet_entries
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete timesheet entries in their organization" ON staff_timesheet_entries
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Payroll batches policies
CREATE POLICY "Users can view payroll batches from their organization" ON staff_payroll_batches
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create payroll batches for their organization" ON staff_payroll_batches
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update payroll batches in their organization" ON staff_payroll_batches
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete payroll batches in their organization" ON staff_payroll_batches
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Payroll entries policies
CREATE POLICY "Users can view payroll entries from their organization" ON staff_payroll_entries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create payroll entries for their organization" ON staff_payroll_entries
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update payroll entries in their organization" ON staff_payroll_entries
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete payroll entries in their organization" ON staff_payroll_entries
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Staff documents policies (with confidentiality restrictions)
CREATE POLICY "Users can view staff documents from their organization" ON staff_documents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      is_confidential = false 
      OR staff_id IN (
        SELECT id FROM staff_profiles 
        WHERE user_id = auth.uid()
      )
      OR auth.uid() IN (
        SELECT uo.user_id FROM user_organizations uo 
        WHERE uo.organization_id = staff_documents.organization_id 
        AND uo.role IN ('owner', 'admin')
        AND uo.is_active = true
      )
    )
  );

CREATE POLICY "Users can create staff documents for their organization" ON staff_documents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update staff documents in their organization" ON staff_documents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete staff documents in their organization" ON staff_documents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Performance reviews policies
CREATE POLICY "Users can view performance reviews from their organization" ON staff_performance_reviews
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      staff_id IN (
        SELECT id FROM staff_profiles 
        WHERE user_id = auth.uid()
      )
      OR reviewer_id IN (
        SELECT id FROM staff_profiles 
        WHERE user_id = auth.uid()
      )
      OR auth.uid() IN (
        SELECT uo.user_id FROM user_organizations uo 
        WHERE uo.organization_id = staff_performance_reviews.organization_id 
        AND uo.role IN ('owner', 'admin')
        AND uo.is_active = true
      )
    )
  );

CREATE POLICY "Users can create performance reviews for their organization" ON staff_performance_reviews
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update performance reviews in their organization" ON staff_performance_reviews
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete performance reviews in their organization" ON staff_performance_reviews
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =============================================
-- 4. TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================

-- Create or update the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_staff_sops_updated_at 
  BEFORE UPDATE ON staff_sops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_profiles_updated_at 
  BEFORE UPDATE ON staff_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_time_off_requests_updated_at 
  BEFORE UPDATE ON staff_time_off_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at 
  BEFORE UPDATE ON staff_shifts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_timesheet_entries_updated_at 
  BEFORE UPDATE ON staff_timesheet_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_payroll_batches_updated_at 
  BEFORE UPDATE ON staff_payroll_batches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_payroll_entries_updated_at 
  BEFORE UPDATE ON staff_payroll_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_documents_updated_at 
  BEFORE UPDATE ON staff_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_reviews_updated_at 
  BEFORE UPDATE ON staff_performance_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. AUTOMATIC CALCULATION TRIGGERS
-- =============================================

-- Function to calculate total hours and pay for timesheet entries
CREATE OR REPLACE FUNCTION calculate_timesheet_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if clock_out is set
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    -- Calculate total hours excluding break time
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0 - COALESCE(NEW.break_duration, 0) / 60.0;
    
    -- Calculate total pay if hourly rate is set
    IF NEW.hourly_rate IS NOT NULL THEN
      NEW.total_pay = NEW.total_hours * NEW.hourly_rate;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_timesheet_totals_trigger
  BEFORE INSERT OR UPDATE ON staff_timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_timesheet_totals();

-- Function to calculate payroll batch totals
CREATE OR REPLACE FUNCTION update_payroll_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE staff_payroll_batches 
  SET 
    total_amount = (
      SELECT COALESCE(SUM(gross_pay), 0) 
      FROM staff_payroll_entries 
      WHERE payroll_batch_id = COALESCE(NEW.payroll_batch_id, OLD.payroll_batch_id)
    ),
    total_hours = (
      SELECT COALESCE(SUM(regular_hours + overtime_hours + holiday_hours), 0) 
      FROM staff_payroll_entries 
      WHERE payroll_batch_id = COALESCE(NEW.payroll_batch_id, OLD.payroll_batch_id)
    ),
    employee_count = (
      SELECT COUNT(DISTINCT staff_id) 
      FROM staff_payroll_entries 
      WHERE payroll_batch_id = COALESCE(NEW.payroll_batch_id, OLD.payroll_batch_id)
    )
  WHERE id = COALESCE(NEW.payroll_batch_id, OLD.payroll_batch_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_batch_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON staff_payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_payroll_batch_totals();

-- =============================================
-- 6. DEFAULT DATA INSERTION
-- =============================================

-- Insert default SOP categories and templates for Atlas Fitness
-- WARNING: These sample SOPs use a hardcoded organization ID for demo data only
-- In production, SOPs should be created with dynamic organization IDs based on user context
INSERT INTO staff_sops (
  organization_id, 
  title, 
  category, 
  content, 
  status, 
  effective_date
) VALUES 
(
  '63589490-8f55-4157-bd3a-e141594b748e', -- Demo organization ID
  'Opening Procedures',
  'Daily Operations',
  E'OPENING CHECKLIST:\n\n1. Arrive 15 minutes before opening\n2. Unlock facility and turn on lights\n3. Check equipment for safety and cleanliness\n4. Set up reception area\n5. Check computer systems are operational\n6. Review daily schedule and staff assignments\n7. Ensure first aid kit is stocked\n8. Check temperature and ventilation\n9. Update daily specials board\n10. Greet first members with enthusiasm',
  'active',
  CURRENT_DATE
),
(
  '63589490-8f55-4157-bd3a-e141594b748e',
  'Closing Procedures',
  'Daily Operations',
  E'CLOSING CHECKLIST:\n\n1. Ensure all members have left the facility\n2. Clean and sanitize all equipment\n3. Check locker rooms and restrooms\n4. Secure cash register and make deposit\n5. Turn off all non-essential equipment\n6. Check all doors and windows are secure\n7. Set alarm system\n8. Complete daily report\n9. Prepare notes for next shift\n10. Lock facility',
  'active',
  CURRENT_DATE
),
(
  '63589490-8f55-4157-bd3a-e141594b748e',
  'Emergency Procedures',
  'Safety',
  E'EMERGENCY RESPONSE PROCEDURES:\n\nMEDICAL EMERGENCY:\n1. Call 999 immediately\n2. Provide first aid if trained\n3. Keep the person calm and comfortable\n4. Clear the area of other members\n5. Document the incident\n6. Notify management\n\nFIRE EMERGENCY:\n1. Activate fire alarm\n2. Call 999\n3. Evacuate all persons using designated routes\n4. Meet at assembly point\n5. Do not use lifts\n6. Do not re-enter building until cleared by fire service\n\nSECURITY INCIDENT:\n1. Ensure personal safety first\n2. Call 999 if immediate danger\n3. Document incident details\n4. Notify management immediately\n5. Preserve evidence if safe to do so',
  'active',
  CURRENT_DATE
),
(
  '63589490-8f55-4157-bd3a-e141594b748e',
  'Customer Service Standards',
  'Customer Service',
  E'CUSTOMER SERVICE EXCELLENCE:\n\n1. Greet every member within 10 seconds\n2. Make eye contact and smile genuinely\n3. Use member names when known\n4. Listen actively to concerns and questions\n5. Provide clear, helpful information\n6. Follow up on promises made\n7. Handle complaints professionally\n8. Exceed expectations when possible\n9. Maintain positive body language\n10. Thank members for their business',
  'active',
  CURRENT_DATE
),
(
  '63589490-8f55-4157-bd3a-e141594b748e',
  'Equipment Maintenance',
  'Maintenance',
  E'DAILY EQUIPMENT CHECKS:\n\n1. Visual inspection of all cardio equipment\n2. Test emergency stop buttons\n3. Check cables and moving parts\n4. Clean and sanitize all touch surfaces\n5. Report any issues immediately\n6. Complete maintenance log\n7. Ensure adequate cleaning supplies\n8. Check weights are properly stored\n9. Inspect floor mats and surfaces\n10. Verify proper ventilation',
  'active',
  CURRENT_DATE
) 
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. UTILITY FUNCTIONS
-- =============================================

-- Function to get staff member's current shift
CREATE OR REPLACE FUNCTION get_current_shift(staff_member_id UUID)
RETURNS TABLE (
  shift_id UUID,
  shift_date DATE,
  start_time TIME,
  end_time TIME,
  shift_position VARCHAR(100),
  shift_location VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.shift_date,
    s.start_time,
    s.end_time,
    s.shift_position AS shift_position,
    s.location AS shift_location
  FROM staff_shifts s
  WHERE s.staff_id = staff_member_id
    AND s.shift_date = CURRENT_DATE
    AND s.start_time <= CURRENT_TIME
    AND s.end_time >= CURRENT_TIME
    AND s.status = 'scheduled';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate overtime hours
CREATE OR REPLACE FUNCTION calculate_overtime_hours(
  regular_hours DECIMAL(8,2),
  total_hours DECIMAL(8,2),
  overtime_threshold DECIMAL(8,2) DEFAULT 40.0
) RETURNS DECIMAL(8,2) AS $$
BEGIN
  IF total_hours > overtime_threshold THEN
    RETURN total_hours - overtime_threshold;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check time off conflicts
CREATE OR REPLACE FUNCTION check_time_off_conflicts(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_request_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM staff_time_off_requests
  WHERE staff_id = p_staff_id
    AND status = 'approved'
    AND (p_request_id IS NULL OR id != p_request_id)
    AND (
      (start_date <= p_start_date AND end_date >= p_start_date)
      OR (start_date <= p_end_date AND end_date >= p_end_date)
      OR (start_date >= p_start_date AND end_date <= p_end_date)
    );
    
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. COMPLETION MESSAGE
-- =============================================

-- Add a completion comment
COMMENT ON SCHEMA public IS 'Atlas Fitness Staff Management Module - Migration completed successfully';

-- Log migration completion
INSERT INTO public.audit_logs (
  organization_id,
  table_name,
  action,
  old_values,
  new_values,
  user_id
) VALUES (
  '63589490-8f55-4157-bd3a-e141594b748e',
  'migration_log',
  'MIGRATION_COMPLETE',
  '{}',
  jsonb_build_object(
    'migration', '20250808_staff_management_schema.sql',
    'tables_created', ARRAY[
      'staff_sops',
      'staff_profiles', 
      'staff_time_off_requests',
      'staff_shifts',
      'staff_timesheet_entries',
      'staff_payroll_batches',
      'staff_payroll_entries',
      'staff_documents',
      'staff_performance_reviews'
    ],
    'features', ARRAY[
      'Multi-tenant RLS policies',
      'Vector embeddings for SOPs',
      'Automatic calculations',
      'Performance indexes',
      'Default data insertion',
      'Utility functions'
    ]
  ),
  auth.uid()
) ON CONFLICT DO NOTHING;