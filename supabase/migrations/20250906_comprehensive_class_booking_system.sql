-- =============================================
-- COMPREHENSIVE CLASS BOOKING SYSTEM
-- Migration: 20250906_comprehensive_class_booking_system
-- Extends existing class booking system with advanced features
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. ENHANCED CLASS MANAGEMENT TABLES
-- =============================================

-- Enhanced class schedules with recurring support
DO $$
BEGIN
  -- Add new columns to existing class_schedules if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'organization_id') THEN
    ALTER TABLE class_schedules ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'class_type_id') THEN
    ALTER TABLE class_schedules ADD COLUMN class_type_id UUID REFERENCES class_types(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'instructor_id') THEN
    ALTER TABLE class_schedules ADD COLUMN instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'recurrence_type') THEN
    ALTER TABLE class_schedules ADD COLUMN recurrence_type class_recurrence DEFAULT 'none';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'recurrence_pattern') THEN
    ALTER TABLE class_schedules ADD COLUMN recurrence_pattern JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'recurrence_end_date') THEN
    ALTER TABLE class_schedules ADD COLUMN recurrence_end_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'is_recurring_template') THEN
    ALTER TABLE class_schedules ADD COLUMN is_recurring_template BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'parent_schedule_id') THEN
    ALTER TABLE class_schedules ADD COLUMN parent_schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'price_pennies') THEN
    ALTER TABLE class_schedules ADD COLUMN price_pennies INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'requires_booking') THEN
    ALTER TABLE class_schedules ADD COLUMN requires_booking BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'booking_cutoff_hours') THEN
    ALTER TABLE class_schedules ADD COLUMN booking_cutoff_hours INTEGER DEFAULT 2;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'cancellation_cutoff_hours') THEN
    ALTER TABLE class_schedules ADD COLUMN cancellation_cutoff_hours INTEGER DEFAULT 24;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'waitlist_enabled') THEN
    ALTER TABLE class_schedules ADD COLUMN waitlist_enabled BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'equipment_needed') THEN
    ALTER TABLE class_schedules ADD COLUMN equipment_needed TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'class_level') THEN
    ALTER TABLE class_schedules ADD COLUMN class_level VARCHAR(20) DEFAULT 'all' CHECK (class_level IN ('beginner', 'intermediate', 'advanced', 'all'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'tags') THEN
    ALTER TABLE class_schedules ADD COLUMN tags TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'metadata') THEN
    ALTER TABLE class_schedules ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enhanced class bookings with more features
DO $$
BEGIN
  -- Add new columns to existing class_bookings if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'organization_id') THEN
    ALTER TABLE class_bookings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'booking_type') THEN
    ALTER TABLE class_bookings ADD COLUMN booking_type VARCHAR(20) DEFAULT 'single' CHECK (booking_type IN ('single', 'recurring', 'package', 'drop_in'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'recurring_booking_id') THEN
    ALTER TABLE class_bookings ADD COLUMN recurring_booking_id UUID REFERENCES recurring_bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE class_bookings ADD COLUMN payment_status payment_status DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'payment_amount_pennies') THEN
    ALTER TABLE class_bookings ADD COLUMN payment_amount_pennies INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'payment_intent_id') THEN
    ALTER TABLE class_bookings ADD COLUMN payment_intent_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'check_in_time') THEN
    ALTER TABLE class_bookings ADD COLUMN check_in_time TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE class_bookings ADD COLUMN cancellation_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'cancellation_fee_pennies') THEN
    ALTER TABLE class_bookings ADD COLUMN cancellation_fee_pennies INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'confirmation_sent_at') THEN
    ALTER TABLE class_bookings ADD COLUMN confirmation_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'reminder_sent_at') THEN
    ALTER TABLE class_bookings ADD COLUMN reminder_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'special_requirements') THEN
    ALTER TABLE class_bookings ADD COLUMN special_requirements TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'metadata') THEN
    ALTER TABLE class_bookings ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Recurring bookings table for patterns
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  class_type_id UUID REFERENCES class_types(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recurrence_type class_recurrence NOT NULL DEFAULT 'weekly',
  recurrence_pattern JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"days": [1,3,5], "time": "09:00", "duration": 60}
  start_date DATE NOT NULL,
  end_date DATE,
  max_bookings INTEGER, -- null = unlimited
  current_bookings INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
  auto_book BOOLEAN DEFAULT true,
  payment_method VARCHAR(50), -- 'per_class', 'monthly', 'package'
  price_per_class_pennies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Class attendance tracking (separate from bookings)
CREATE TABLE IF NOT EXISTS class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES class_bookings(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  instructor_notes TEXT,
  late_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced class waitlist
DO $$
BEGIN
  -- Add new columns to existing class_waitlist if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'organization_id') THEN
    ALTER TABLE class_waitlist ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'notification_sent') THEN
    ALTER TABLE class_waitlist ADD COLUMN notification_sent BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'expires_at') THEN
    ALTER TABLE class_waitlist ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'auto_book') THEN
    ALTER TABLE class_waitlist ADD COLUMN auto_book BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'priority_score') THEN
    ALTER TABLE class_waitlist ADD COLUMN priority_score INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_waitlist' AND column_name = 'metadata') THEN
    ALTER TABLE class_waitlist ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Class packages (e.g., 10-class pass)
CREATE TABLE IF NOT EXISTS class_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  class_count INTEGER NOT NULL,
  validity_days INTEGER NOT NULL, -- How many days package is valid
  price_pennies INTEGER NOT NULL,
  class_type_restrictions UUID[], -- Array of class_type IDs (null = all classes)
  instructor_restrictions UUID[], -- Array of instructor IDs (null = all instructors)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Customer class packages (purchased packages)
CREATE TABLE IF NOT EXISTS customer_class_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES class_packages(id) ON DELETE RESTRICT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  classes_remaining INTEGER NOT NULL,
  classes_used INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded', 'transferred')),
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================

-- Class schedules indexes
CREATE INDEX IF NOT EXISTS idx_class_schedules_org_time ON class_schedules(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_class_schedules_recurring ON class_schedules(is_recurring_template, recurrence_type) WHERE is_recurring_template = true;
CREATE INDEX IF NOT EXISTS idx_class_schedules_parent ON class_schedules(parent_schedule_id) WHERE parent_schedule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_schedules_instructor_time ON class_schedules(instructor_id, start_time) WHERE instructor_id IS NOT NULL;

-- Class bookings indexes
CREATE INDEX IF NOT EXISTS idx_class_bookings_org_status ON class_bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_schedule ON class_bookings(client_id, schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_recurring ON class_bookings(recurring_booking_id) WHERE recurring_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_bookings_payment_status ON class_bookings(payment_status) WHERE payment_status != 'succeeded';

-- Recurring bookings indexes
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_org_status ON recurring_bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_client ON recurring_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_dates ON recurring_bookings(start_date, end_date);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_class_attendance_org_date ON class_attendance(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_class_attendance_schedule ON class_attendance(schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_client ON class_attendance(client_id);

-- Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_class_waitlist_org_position ON class_waitlist(organization_id, schedule_id, position);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_expires ON class_waitlist(expires_at) WHERE expires_at IS NOT NULL;

-- Package indexes
CREATE INDEX IF NOT EXISTS idx_class_packages_org_active ON class_packages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_packages_client_status ON customer_class_packages(client_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_expiry ON customer_class_packages(expiry_date) WHERE status = 'active';

-- =============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_class_packages ENABLE ROW LEVEL SECURITY;

-- Recurring bookings policies
CREATE POLICY "Users can view org recurring bookings" ON recurring_bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org recurring bookings" ON recurring_bookings
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'coach')
    )
  );

-- Attendance policies
CREATE POLICY "Users can view org attendance" ON class_attendance
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage attendance" ON class_attendance
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'coach', 'trainer')
    )
  );

-- Package policies
CREATE POLICY "Users can view org packages" ON class_packages
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage packages" ON class_packages
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- Customer packages policies
CREATE POLICY "Users can view org customer packages" ON customer_class_packages
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org customer packages" ON customer_class_packages
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'coach')
    )
  );

-- =============================================
-- 4. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_recurring_bookings_updated_at 
  BEFORE UPDATE ON recurring_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_attendance_updated_at 
  BEFORE UPDATE ON class_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_packages_updated_at 
  BEFORE UPDATE ON class_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_packages_updated_at 
  BEFORE UPDATE ON customer_class_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate recurring class instances
CREATE OR REPLACE FUNCTION generate_recurring_classes()
RETURNS TRIGGER AS $$
DECLARE
  pattern_data JSONB;
  target_date DATE;
  class_time TIME;
  duration_minutes INTEGER;
  days_array INTEGER[];
  day_of_week INTEGER;
  current_date DATE;
  max_date DATE;
BEGIN
  -- Only process when a recurring template is created or updated
  IF NOT NEW.is_recurring_template OR NEW.recurrence_type = 'none' THEN
    RETURN NEW;
  END IF;
  
  pattern_data := NEW.recurrence_pattern;
  current_date := CURRENT_DATE;
  max_date := COALESCE(NEW.recurrence_end_date, current_date + INTERVAL '3 months');
  
  -- Generate instances based on recurrence type
  CASE NEW.recurrence_type
    WHEN 'weekly' THEN
      days_array := ARRAY(SELECT jsonb_array_elements_text(pattern_data->'days'))::INTEGER[];
      class_time := (pattern_data->>'time')::TIME;
      duration_minutes := (pattern_data->>'duration')::INTEGER;
      
      target_date := current_date;
      WHILE target_date <= max_date LOOP
        day_of_week := EXTRACT(DOW FROM target_date); -- 0=Sunday, 6=Saturday
        
        -- Check if this day is in our recurring pattern
        IF day_of_week = ANY(days_array) THEN
          -- Create class instance if it doesn't already exist
          INSERT INTO class_schedules (
            organization_id, class_type_id, instructor_id,
            start_time, end_time, max_capacity, price_pennies,
            room_location, status, parent_schedule_id,
            recurrence_type, is_recurring_template,
            equipment_needed, class_level, tags, metadata
          )
          SELECT 
            NEW.organization_id, NEW.class_type_id, NEW.instructor_id,
            target_date + class_time, 
            target_date + class_time + (duration_minutes || ' minutes')::INTERVAL,
            NEW.max_capacity, NEW.price_pennies,
            NEW.room_location, 'scheduled', NEW.id,
            'none', false,
            NEW.equipment_needed, NEW.class_level, NEW.tags, NEW.metadata
          WHERE NOT EXISTS (
            SELECT 1 FROM class_schedules 
            WHERE parent_schedule_id = NEW.id 
            AND DATE(start_time) = target_date
          );
        END IF;
        
        target_date := target_date + 1;
      END LOOP;
  END CASE;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for generating recurring classes
CREATE TRIGGER generate_recurring_classes_trigger
  AFTER INSERT OR UPDATE ON class_schedules
  FOR EACH ROW EXECUTE FUNCTION generate_recurring_classes();

-- Function to handle automatic recurring bookings
CREATE OR REPLACE FUNCTION process_recurring_bookings()
RETURNS TRIGGER AS $$
DECLARE
  recurring_record RECORD;
  new_class_id UUID;
  pattern_data JSONB;
BEGIN
  -- Only process new class schedules that are part of a recurring pattern
  IF TG_OP = 'INSERT' AND NEW.parent_schedule_id IS NOT NULL THEN
    -- Find all active recurring bookings for this template
    FOR recurring_record IN
      SELECT rb.* FROM recurring_bookings rb
      JOIN class_schedules parent ON parent.id = rb.class_type_id
      WHERE parent.id = NEW.parent_schedule_id
      AND rb.status = 'active'
      AND rb.auto_book = true
      AND (rb.end_date IS NULL OR NEW.start_time::DATE <= rb.end_date)
      AND (rb.max_bookings IS NULL OR rb.current_bookings < rb.max_bookings)
    LOOP
      pattern_data := recurring_record.recurrence_pattern;
      
      -- Check if this class matches the recurring booking pattern
      -- (This is a simplified check - real implementation would be more complex)
      IF EXTRACT(DOW FROM NEW.start_time) = ANY(ARRAY(SELECT jsonb_array_elements_text(pattern_data->'days'))::INTEGER[]) THEN
        -- Create automatic booking
        INSERT INTO class_bookings (
          organization_id, schedule_id, client_id,
          recurring_booking_id, booking_type, status,
          payment_status, payment_amount_pennies
        ) VALUES (
          NEW.organization_id, NEW.id, recurring_record.client_id,
          recurring_record.id, 'recurring', 'confirmed',
          'succeeded', recurring_record.price_per_class_pennies
        );
        
        -- Update recurring booking counter
        UPDATE recurring_bookings 
        SET current_bookings = current_bookings + 1
        WHERE id = recurring_record.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic recurring bookings
CREATE TRIGGER process_recurring_bookings_trigger
  AFTER INSERT ON class_schedules
  FOR EACH ROW EXECUTE FUNCTION process_recurring_bookings();

-- Function to update class package usage
CREATE OR REPLACE FUNCTION update_package_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.booking_type = 'package' THEN
    -- Deduct from available package credits
    UPDATE customer_class_packages 
    SET classes_used = classes_used + 1,
        classes_remaining = classes_remaining - 1
    WHERE id = (NEW.metadata->>'package_id')::UUID
    AND classes_remaining > 0;
    
    -- Mark package as expired if no classes remaining
    UPDATE customer_class_packages 
    SET status = 'expired'
    WHERE id = (NEW.metadata->>'package_id')::UUID
    AND classes_remaining <= 0;
    
  ELSIF TG_OP = 'DELETE' AND OLD.booking_type = 'package' THEN
    -- Refund package credit on cancellation
    UPDATE customer_class_packages 
    SET classes_used = classes_used - 1,
        classes_remaining = classes_remaining + 1,
        status = 'active'
    WHERE id = (OLD.metadata->>'package_id')::UUID;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for package usage updates
CREATE TRIGGER update_package_usage_trigger
  AFTER INSERT OR DELETE ON class_bookings
  FOR EACH ROW EXECUTE FUNCTION update_package_usage();

-- =============================================
-- 5. NOTIFICATION QUEUE ENHANCEMENTS
-- =============================================

-- Enhanced notifications table for class bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'class_booking_id') THEN
    ALTER TABLE notifications ADD COLUMN class_booking_id UUID REFERENCES class_bookings(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recurring_booking_id') THEN
    ALTER TABLE notifications ADD COLUMN recurring_booking_id UUID REFERENCES recurring_bookings(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'trigger_type') THEN
    ALTER TABLE notifications ADD COLUMN trigger_type VARCHAR(50) DEFAULT 'manual';
  END IF;
END $$;

-- Add indexes for new notification columns
CREATE INDEX IF NOT EXISTS idx_notifications_class_booking ON notifications(class_booking_id) WHERE class_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recurring_booking ON notifications(recurring_booking_id) WHERE recurring_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_trigger_type ON notifications(trigger_type, send_at) WHERE status = 'pending';

-- =============================================
-- 6. SAMPLE DATA AND DEFAULTS
-- =============================================

-- Insert default class packages for existing organizations
INSERT INTO class_packages (organization_id, name, description, class_count, validity_days, price_pennies)
SELECT 
  id,
  '10-Class Pass',
  'Flexible 10-class package valid for 3 months',
  10,
  90,
  15000 -- £150
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM class_packages WHERE organization_id = organizations.id
);

-- Create default class types if none exist
INSERT INTO class_types (name, description, color, user_id)
SELECT 
  'General Fitness',
  'All-levels fitness class suitable for everyone',
  'blue',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM class_types);

COMMENT ON TABLE recurring_bookings IS 'Recurring booking patterns for clients';
COMMENT ON TABLE class_attendance IS 'Actual attendance tracking separate from bookings';
COMMENT ON TABLE class_packages IS 'Class packages/passes offered by organizations';
COMMENT ON TABLE customer_class_packages IS 'Purchased class packages by customers';
COMMENT ON COLUMN class_schedules.recurrence_pattern IS 'JSON pattern for recurring classes e.g. {"days": [1,3,5], "time": "09:00", "duration": 60}';
COMMENT ON COLUMN recurring_bookings.recurrence_pattern IS 'JSON pattern for client recurring bookings';