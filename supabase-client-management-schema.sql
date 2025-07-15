-- Client Management Schema Extensions
-- This extends the existing CRM schema with client-specific tables

-- =============================================
-- CLIENT VISITS TABLE
-- =============================================

-- Create client_visits table for tracking gym visits
CREATE TABLE IF NOT EXISTS client_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME NOT NULL DEFAULT CURRENT_TIME,
  check_out_time TIME,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_visits_client_id ON client_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_client_visits_date ON client_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_client_visits_check_in ON client_visits(check_in_time);

-- Enable RLS
ALTER TABLE client_visits ENABLE ROW LEVEL SECURITY;

-- Create policy for client visits
CREATE POLICY "Organization members can access client visits" ON client_visits
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- CLIENT ACTIVITIES TABLE
-- =============================================

-- Create client_activities table for tracking client interactions
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  
  type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'membership_created', 'membership_updated', 'payment', 'status_change', 'assignment', 'note', 'goal_update', 'measurement', 'workout_completed')),
  subject TEXT,
  content TEXT,
  outcome TEXT,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON client_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_client_activities_type ON client_activities(type);

-- Enable RLS
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Organization members can access client activities" ON client_activities
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- CLIENT MEASUREMENTS TABLE
-- =============================================

-- Create client_measurements table for tracking body measurements
CREATE TABLE IF NOT EXISTS client_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Body measurements
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  body_fat_percentage DECIMAL(5,2),
  muscle_mass_kg DECIMAL(5,2),
  
  -- Circumference measurements (in cm)
  chest_cm DECIMAL(5,2),
  waist_cm DECIMAL(5,2),
  hips_cm DECIMAL(5,2),
  thighs_cm DECIMAL(5,2),
  arms_cm DECIMAL(5,2),
  
  -- Additional metrics
  bmi DECIMAL(5,2),
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_measurements_client_id ON client_measurements(client_id);
CREATE INDEX IF NOT EXISTS idx_client_measurements_date ON client_measurements(measurement_date);

-- Enable RLS
ALTER TABLE client_measurements ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Organization members can access client measurements" ON client_measurements
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- CLIENT WORKOUTS TABLE
-- =============================================

-- Create client_workouts table for tracking workout sessions
CREATE TABLE IF NOT EXISTS client_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES user_profiles(id),
  
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('cardio', 'strength', 'flexibility', 'sports', 'group_class', 'personal_training')),
  duration_minutes INTEGER,
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high', 'very_high')),
  
  -- Workout details
  exercises JSONB DEFAULT '[]',
  notes TEXT,
  calories_burned INTEGER,
  
  -- Performance metrics
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_workouts_client_id ON client_workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workouts_date ON client_workouts(workout_date);
CREATE INDEX IF NOT EXISTS idx_client_workouts_trainer ON client_workouts(trainer_id);

-- Enable RLS
ALTER TABLE client_workouts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Organization members can access client workouts" ON client_workouts
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- CLIENT GOALS TABLE
-- =============================================

-- Create client_goals table for tracking client goals and progress
CREATE TABLE IF NOT EXISTS client_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'sports_performance', 'general_fitness')),
  
  -- Goal metrics
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  unit TEXT, -- kg, lbs, cm, minutes, reps, etc.
  
  -- Timeline
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  completion_date DATE,
  
  -- Progress tracking
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  milestones JSONB DEFAULT '[]',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_goals_client_id ON client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_status ON client_goals(status);
CREATE INDEX IF NOT EXISTS idx_client_goals_category ON client_goals(category);

-- Enable RLS
ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Organization members can access client goals" ON client_goals
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- PAYMENT RECORDS TABLE
-- =============================================

-- Create payment_records table for tracking payments
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  processed_by UUID REFERENCES user_profiles(id),
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'direct_debit', 'online', 'other')),
  
  -- Payment details
  transaction_id TEXT,
  reference_number TEXT,
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_client_id ON payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_membership_id ON payment_records(membership_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- Enable RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Organization members can access payment records" ON payment_records
FOR ALL USING (
  client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_client_visits_updated_at 
  BEFORE UPDATE ON client_visits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_goals_updated_at 
  BEFORE UPDATE ON client_goals 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(weight_kg DECIMAL, height_cm DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF weight_kg IS NULL OR height_cm IS NULL OR height_cm = 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((weight_kg / POWER(height_cm / 100, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate BMI when measurements are inserted/updated
CREATE OR REPLACE FUNCTION update_client_measurement_bmi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bmi := calculate_bmi(NEW.weight_kg, NEW.height_cm);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_bmi_trigger
  BEFORE INSERT OR UPDATE ON client_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_client_measurement_bmi();

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
  goal_id UUID,
  current_value DECIMAL
)
RETURNS VOID AS $$
DECLARE
  goal_record RECORD;
  progress DECIMAL;
BEGIN
  SELECT * INTO goal_record FROM client_goals WHERE id = goal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;
  
  IF goal_record.target_value IS NOT NULL AND goal_record.target_value != 0 THEN
    progress := ROUND(
      (current_value / goal_record.target_value * 100)::DECIMAL, 2
    );
    
    -- Cap progress at 100%
    IF progress > 100 THEN
      progress := 100;
    END IF;
    
    UPDATE client_goals 
    SET 
      current_value = current_value,
      progress_percentage = progress,
      status = CASE 
        WHEN progress >= 100 THEN 'completed'
        ELSE 'active'
      END,
      completion_date = CASE 
        WHEN progress >= 100 THEN CURRENT_DATE
        ELSE NULL
      END,
      updated_at = TIMEZONE('utc', NOW())
    WHERE id = goal_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- View for client visit statistics
CREATE OR REPLACE VIEW client_visit_stats AS
SELECT 
  c.id as client_id,
  c.first_name,
  c.last_name,
  c.organization_id,
  COUNT(cv.id) as total_visits,
  COUNT(CASE WHEN cv.visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as visits_last_30_days,
  COUNT(CASE WHEN cv.visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as visits_last_7_days,
  MAX(cv.visit_date) as last_visit_date,
  AVG(cv.duration_minutes) as avg_duration_minutes
FROM clients c
LEFT JOIN client_visits cv ON c.id = cv.client_id
GROUP BY c.id, c.first_name, c.last_name, c.organization_id;

-- View for membership revenue
CREATE OR REPLACE VIEW membership_revenue AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(m.id) as total_memberships,
  COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_memberships,
  SUM(CASE WHEN m.status = 'active' THEN m.monthly_price ELSE 0 END) as monthly_revenue,
  AVG(m.monthly_price) as avg_monthly_price,
  COUNT(CASE WHEN m.next_payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as payments_due_7_days
FROM organizations o
LEFT JOIN clients c ON o.id = c.organization_id
LEFT JOIN memberships m ON c.id = m.client_id
GROUP BY o.id, o.name;

-- View for client retention metrics
CREATE OR REPLACE VIEW client_retention_metrics AS
SELECT 
  c.organization_id,
  c.status,
  COUNT(*) as client_count,
  COUNT(CASE WHEN c.joined_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_clients_30_days,
  COUNT(CASE WHEN c.joined_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as new_clients_90_days,
  COUNT(CASE WHEN c.last_visit >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_clients_30_days,
  COUNT(CASE WHEN c.last_visit >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_clients_7_days
FROM clients c
GROUP BY c.organization_id, c.status;

-- Grant permissions to authenticated users
GRANT SELECT ON client_visit_stats TO authenticated;
GRANT SELECT ON membership_revenue TO authenticated;
GRANT SELECT ON client_retention_metrics TO authenticated;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample client measurements
INSERT INTO client_measurements (client_id, weight_kg, height_cm, body_fat_percentage, notes)
SELECT 
  c.id,
  ROUND((RANDOM() * 30 + 60)::DECIMAL, 2),
  ROUND((RANDOM() * 30 + 160)::DECIMAL, 2),
  ROUND((RANDOM() * 20 + 10)::DECIMAL, 2),
  'Initial measurement'
FROM clients c
WHERE c.status = 'active'
LIMIT 5;

-- Insert sample client goals
INSERT INTO client_goals (client_id, title, description, category, target_value, current_value, unit, target_date, created_by)
SELECT 
  c.id,
  'Weight Loss Goal',
  'Lose weight and improve overall fitness',
  'weight_loss',
  75.0,
  80.0,
  'kg',
  CURRENT_DATE + INTERVAL '90 days',
  up.id
FROM clients c
JOIN user_profiles up ON c.organization_id = up.organization_id
WHERE c.status = 'active' AND up.role = 'admin'
LIMIT 3;